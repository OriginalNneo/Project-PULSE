/**
 * Session lifecycle + CSAT (customer-satisfaction) rating.
 *
 * A bot chat has no natural "end", so this module gives it one. A session is a
 * contiguous run of activity by one user; it ENDS — and the bot asks for a 1–5
 * star rating of the whole experience — when:
 *   1. a CCU officer closes the case   (reason "officer", from officer/service.ts)
 *   2. the customer signals they're done (reason "satisfied": a closing phrase or
 *      the /end command, detected in gateway/inbound.ts)
 * After the rating is captured (or the user moves on) the chat is RESET.
 *
 * A 24-hour inactivity timeout (the periodic sweep) SILENTLY resets idle sessions
 * — no rating ping for someone who already walked away.
 *
 * State is in-memory (consistent with prefs/queue caches): the conversation
 * history (moved here from inbound.ts so reset is centralised), the per-user
 * session record, and the ratings list. A backend restart therefore drops live
 * 24h timers and the in-memory ratings — escalated-case ratings still survive
 * because they are also written onto the Mongo-backed queue entry (setQueueRating).
 */

import { getUserPrefs, upsertUserPrefs, setQueueRating } from "../../db/proxy-client.js";
import { sendTelegramMessage } from "../../adapters/telegram/client.js";
import { sendWhatsAppMessage } from "../../adapters/twilio/client.js";
import { translateText } from "../../python-bridge/client.js";
import { notifyRatingReceived } from "../../dashboard/notify.js";
import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("session");

export type EndReason = "officer" | "satisfied" | "timeout";
export type SessionStatus = "active" | "awaiting_rating";

// ── Conversation history (moved out of inbound.ts so reset lives in one place) ──
export interface HistoryTurn {
  role: string;
  content: string;
  ts: string;
  emotion_score?: number;
  emotion_label?: string;
}

const MAX_HISTORY = 30; // keep the last ~15 exchanges
const conversationHistory = new Map<string, HistoryTurn[]>();

export function getHistory(userId: string): HistoryTurn[] {
  return conversationHistory.get(userId) ?? [];
}
export function appendHistory(userId: string, ...turns: HistoryTurn[]): void {
  const next = [...getHistory(userId), ...turns];
  conversationHistory.set(userId, next.slice(-MAX_HISTORY));
}
export function clearHistory(userId: string): void {
  conversationHistory.delete(userId);
}

// ── Session records (in-memory) ────────────────────────────────────────────────
export interface SessionState {
  userId: string;
  channel: string; // "tg" | "wa"
  sessionId: string;
  startedAt: number;
  lastActivityAt: number;
  status: SessionStatus;
  reason?: EndReason; // why a rating was requested
  queueId?: string; // ties the rating to an escalated case (officer close)
  promptedAt?: number;
}
const sessions = new Map<string, SessionState>();

export interface RatingRecord {
  ratingId: string;
  userId: string;
  sessionId: string;
  queueId?: string;
  channel: string;
  stars: number;
  reason: EndReason;
  lang: string;
  ts: string;
}
const ratings: RatingRecord[] = [];
export function getRatings(): RatingRecord[] {
  return [...ratings];
}

function channelOf(userId: string): string {
  return userId.startsWith("wa:") ? "wa" : "tg";
}

/**
 * Mark a new message of activity. Creates an active session on first contact and
 * refreshes lastActivityAt thereafter. Deliberately does NOT flip an
 * `awaiting_rating` session back to active — the rating intercept in inbound.ts
 * owns that transition so a returning user's rating window is handled explicitly.
 */
export function touchSession(userId: string, channel: string): SessionState {
  const now = Date.now();
  const existing = sessions.get(userId);
  if (existing) {
    existing.lastActivityAt = now;
    existing.channel = channel;
    return existing;
  }
  const fresh: SessionState = {
    userId,
    channel,
    sessionId: crypto.randomUUID(),
    startedAt: now,
    lastActivityAt: now,
    status: "active",
  };
  sessions.set(userId, fresh);
  return fresh;
}

export function getActiveSession(userId: string): SessionState | null {
  return sessions.get(userId) ?? null;
}

/** Clear the conversation + stale interaction flags, but keep no session record. */
export async function resetChat(userId: string): Promise<void> {
  clearHistory(userId);
  const prefs = await getUserPrefs(userId).catch(() => null);
  if (prefs) {
    await upsertUserPrefs({ ...prefs, pendingOfficerOffer: false, pendingGuiding: undefined }).catch(() => null);
  }
}

/** Full reset: drop the session record AND clear the chat. */
export async function resetSession(userId: string): Promise<void> {
  sessions.delete(userId);
  await resetChat(userId);
}

// ── Rating prompt ──────────────────────────────────────────────────────────────

function ratingLead(reason: EndReason): string {
  return reason === "officer"
    ? "✅ Your CPF query has been resolved by an officer. Thank you for reaching out! How would you rate your experience?"
    : "🙏 Thanks for chatting with PULSE! How would you rate your experience?";
}

async function maybeTranslate(text: string, lang: string): Promise<string> {
  if (lang === "en" || !text) return text;
  const t = await translateText(text, "en", lang).catch(() => null);
  return t?.translated_text ?? text;
}

async function sendRatingPrompt(userId: string, sessionId: string, lang: string, channel: string, reason: EndReason): Promise<void> {
  const text = await maybeTranslate(ratingLead(reason), lang);
  if (channel === "tg") {
    const chatId = parseInt(userId.slice(3), 10);
    // One row of five star buttons; callback carries the sessionId so a late/stale
    // tap maps to the right (now-ended) session and duplicates are rejected.
    const inline_keyboard = [[1, 2, 3, 4, 5].map((n) => ({ text: `${n}⭐`, callback_data: `rate:${sessionId}:${n}` }))];
    await sendTelegramMessage(chatId, text, { inline_keyboard }, false).catch((e: unknown) => log.warn({ e }, "rating prompt (tg) failed"));
  } else if (channel === "wa") {
    const phone = userId.slice(3);
    await sendWhatsAppMessage(phone, `${text}\n\nReply with a number from 1 (poor) to 5 (excellent).`).catch((e: unknown) =>
      log.warn({ e }, "rating prompt (wa) failed"),
    );
  }
}

/**
 * End the session and ask for a rating. Marks the session `awaiting_rating`
 * (keyed so the star tap resolves), sends the prompt, then resets the chat. The
 * session record is kept until a rating arrives or the user moves on.
 */
export async function endSession(userId: string, reason: EndReason, opts?: { lang?: string; queueId?: string }): Promise<void> {
  const now = Date.now();
  const prefs = await getUserPrefs(userId).catch(() => null);
  const lang = opts?.lang ?? prefs?.preferred_lang ?? "en";
  const channel = channelOf(userId);
  const existing = sessions.get(userId);
  const sessionId = existing?.sessionId ?? crypto.randomUUID();

  sessions.set(userId, {
    userId,
    channel,
    sessionId,
    startedAt: existing?.startedAt ?? now,
    lastActivityAt: now,
    status: "awaiting_rating",
    reason,
    queueId: opts?.queueId,
    promptedAt: now,
  });

  await sendRatingPrompt(userId, sessionId, lang, channel, reason);
  // Reset the conversation now; the awaiting_rating record lives on only to bind
  // the upcoming star tap.
  await resetChat(userId);
  log.info({ userId, reason, sessionId }, "Session ended — CSAT rating requested");
}

/**
 * Record a 1–5 rating against the user's awaiting_rating session. Returns
 * { ok: false } for an invalid score or a stale/duplicate tap (no matching open
 * rating window). On success returns the localized thank-you text for the caller
 * to deliver, and fully resets the session.
 */
export async function recordRating(userId: string, sessionId: string, stars: number): Promise<{ ok: boolean; thankYou?: string }> {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { ok: false };
  const s = sessions.get(userId);
  if (!s || s.status !== "awaiting_rating" || s.sessionId !== sessionId) {
    log.info({ userId, sessionId, stars }, "Rating ignored — no matching open rating window (stale/duplicate)");
    return { ok: false };
  }

  const prefs = await getUserPrefs(userId).catch(() => null);
  const lang = prefs?.preferred_lang ?? "en";
  const reason = s.reason ?? "satisfied";

  ratings.push({
    ratingId: crypto.randomUUID(),
    userId,
    sessionId,
    queueId: s.queueId,
    channel: s.channel,
    stars,
    reason,
    lang,
    ts: new Date().toISOString(),
  });

  // Tie the rating to the escalated case so the dashboard can show CSAT per case.
  if (s.queueId) await setQueueRating(s.queueId, stars).catch(() => null);

  notifyRatingReceived({ userId, sessionId, queueId: s.queueId ?? null, stars, reason, channel: s.channel });
  log.info({ userId, stars, reason, queueId: s.queueId }, "CSAT rating recorded");

  await resetSession(userId);
  const thankYou = await maybeTranslate(`Thank you! You rated us ${stars}/5. I'm here whenever you need CPF help again.`, lang);
  return { ok: true, thankYou };
}

// ── 24h inactivity timeout ──────────────────────────────────────────────────────

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours of inactivity → reset
const SWEEP_INTERVAL_MS = 30 * 60 * 1000; // check every 30 minutes

/** Pure predicate — exposed for unit testing. */
export function isSessionExpired(lastActivityAt: number, now: number, ttlMs: number = SESSION_TTL_MS): boolean {
  return now - lastActivityAt >= ttlMs;
}

/** Reset every session idle for ≥24h. Silent (no rating ping). Returns the count. */
export async function sweepIdleSessions(now: number = Date.now()): Promise<number> {
  let count = 0;
  for (const [userId, s] of [...sessions]) {
    if (isSessionExpired(s.lastActivityAt, now)) {
      await resetSession(userId).catch(() => null);
      count++;
      log.info({ userId, status: s.status }, "Session timed out (24h inactive) — chat reset");
    }
  }
  return count;
}

export function startSessionTimeoutSweep(intervalMs: number = SWEEP_INTERVAL_MS): NodeJS.Timeout {
  const timer = setInterval(() => {
    void sweepIdleSessions();
  }, intervalMs);
  timer.unref?.();
  log.info({ intervalMs, ttlMs: SESSION_TTL_MS }, "Session timeout sweep started");
  return timer;
}

// ── Closing-intent detection (customer "satisfied" signal) ──────────────────────

const CLOSING_PATTERNS: RegExp[] = [
  /^(thanks?|thank you|thank u|thx|tq|ty)\b/,
  /^(ok(ay)?|alright|great|cool)\s+(thanks?|thank you|thx|ty)\b/,
  /\b(that'?s all|that is all|nothing else|no more (questions?|help|queries)|all good|i'?m good|im good|all done|i'?m done|im done|all set)\b/,
  /^(bye|goodbye|bye bye|byebye|see you|see ya|cya)\b/,
  /^(no\s+(thanks?|thank you|thx))\b/,
];

const INTERROGATIVE = /\b(what|how|why|when|where|which|who|can you|could you|do i|is there|should i|how much|how do|how can)\b/;

/**
 * Heuristic: is this short message a pure sign-off (no question attached)?
 * Used to detect a satisfied customer so the bot can ask for a rating. English /
 * Singlish only — like the emotion model, this is weak for zh/ms/ta, where the
 * /end command and the 24h timeout are the reliable ends.
 */
export function isClosingMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 40) return false; // long messages are real queries
  if (t.includes("?")) return false;
  if (INTERROGATIVE.test(t)) return false;
  return CLOSING_PATTERNS.some((re) => re.test(t));
}
