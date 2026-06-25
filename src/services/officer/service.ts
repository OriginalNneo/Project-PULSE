import { createServiceLogger } from "../../shared/logger.js";
import {
  getQueue,
  getQueueEntry,
  assignQueueEntry,
  resolveQueueEntry,
  getQueueStats,
  appendToQueueHistory,
  type QueueEntry,
} from "../../db/proxy-client.js";
import { broadcast } from "../../gateway/ws.js";
import { translateText } from "../../python-bridge/client.js";
import { notifyCaseResolved } from "../../dashboard/notify.js";
import { sendTelegramMessage } from "../../adapters/telegram/client.js";
import { sendWhatsAppMessage } from "../../adapters/twilio/client.js";
import { resolveMemberProfile } from "./memberProfile.js";
import { endSession } from "../session/manager.js";

const log = createServiceLogger("officer");

const INACTIVE_AFTER_MS = 30 * 60 * 1000;

export type Emotion = "distressed" | "angry" | "anxious" | "confused" | "neutral" | "calm" | "happy";
export type Urgency = "high" | "medium" | "low";
export type ChatStatus = "active" | "escalated" | "closed";

export interface DashboardChatCard {
  sessionId: string;
  escalationId?: string;
  displayName: string;
  maskedNric: string;
  channel: string;
  summary: string;
  emotion: Emotion;
  confidence: number;
  urgency: Urgency;
  status: ChatStatus;
  updatedAt: string;
  inactiveForMs: number;
}

export interface IncomingQueryCard {
  escalationId: string;
  sessionId: string;
  displayName: string;
  topic: string;
  urgency: Urgency;
  createdAt: string;
}

export interface DashboardStats {
  openChats: number;
  urgentChats: number;
  incomingQueries: number;
  incomingLast10Min: number;
  avgResponseMinutes: number | null;
  resolvedToday: number;
}

export interface OfficerDashboard {
  stats: DashboardStats;
  openChats: DashboardChatCard[];
  inactiveChats: DashboardChatCard[];
  incoming: IncomingQueryCard[];
}

function mapEmotion(label: string): Emotion {
  const map: Record<string, Emotion> = {
    rage: "distressed",
    angry: "angry",
    frustrated: "anxious",
    sad: "distressed",
    neutral: "neutral",
    calm: "calm",
    happy: "happy",
  };
  return map[label] ?? "neutral";
}

function toCard(entry: QueueEntry, now: number): DashboardChatCard {
  const channel = entry.userId.startsWith("tg:") ? "Telegram" : "WhatsApp";
  const suffix = entry.userId.slice(-6);
  const score = entry.emotion_score;
  const urgency: Urgency = score > 70 ? "high" : score > 40 ? "medium" : "low";
  const status: ChatStatus =
    entry.status === "waiting" ? "escalated" :
    entry.status === "assigned" ? "active" : "closed";

  return {
    sessionId: entry.queueId,
    escalationId: entry.queueId,
    displayName: `${channel} …${suffix}`,
    maskedNric: `***${suffix}`,
    channel,
    summary: entry.summary || "CPF enquiry via " + channel,
    emotion: mapEmotion(entry.emotion_label),
    confidence: entry.emotion_score,    // 0–100 for {confidence}% display in the card
    urgency,
    status,
    updatedAt: entry.created_at,
    inactiveForMs: now - new Date(entry.created_at).getTime(),
  };
}

export async function getDashboard(): Promise<OfficerDashboard> {
  const now = Date.now();
  const [queue, stats] = await Promise.all([getQueue(), getQueueStats()]);
  const entries = queue ?? [];

  const cards = entries
    .map((e) => toCard(e, now))
    .sort((a, b) => b.confidence - a.confidence); // highest emotion first

  const openChats = cards.filter((c) => c.inactiveForMs < INACTIVE_AFTER_MS);
  const inactiveChats = cards.filter((c) => c.inactiveForMs >= INACTIVE_AFTER_MS);

  const tenMinAgo = now - 10 * 60 * 1000;
  const incomingEntries = entries.filter((e) => e.status === "waiting");

  const incoming: IncomingQueryCard[] = incomingEntries.map((e) => ({
    escalationId: e.queueId,
    sessionId: e.queueId,
    displayName: toCard(e, now).displayName,
    topic: e.summary || "CPF query",
    urgency: e.emotion_score > 70 ? "high" : e.emotion_score > 40 ? "medium" : "low",
    createdAt: e.created_at,
  }));

  return {
    stats: {
      openChats: openChats.length,
      urgentChats: openChats.filter((c) => c.urgency === "high").length,
      incomingQueries: stats.waiting,
      incomingLast10Min: entries.filter((e) => new Date(e.created_at).getTime() >= tenMinAgo).length,
      avgResponseMinutes: null,
      resolvedToday: 0,
    },
    openChats,
    inactiveChats,
    incoming,
  };
}

const LANG_LABELS: Record<string, string> = {
  en: "English", zh: "Mandarin", ms: "Malay", ta: "Tamil",
  hi: "Hindi", ml: "Malayalam", pa: "Punjabi",
};

export async function getConversation(sessionId: string) {
  const entry = await getQueueEntry(sessionId);
  if (!entry) return null;

  // Map roles to what the frontend ConversationDetail expects. Each user turn carries
  // its per-message sentiment so the dashboard can render the emotional timeline.
  const turns = (entry.chat_history ?? []).map((m) => ({
    role: m.role === "agent" ? "assistant" : m.role,
    content: m.content,
    at: m.ts,
    emotion_score: m.emotion_score,
    emotion_label: m.emotion_label,
  }));

  const card = toCard(entry, Date.now());
  const channel = entry.userId.startsWith("tg:") ? "Telegram" : "WhatsApp";
  const suffix = entry.userId.slice(-6);

  // Right-hand "Singpass record" panel. Telegram users are anonymous, so
  // resolveMemberProfile returns a representative member (the UI labels it
  // "Representative record (demo)") with full CPF accounts, schemes, and flags.
  // Fall back to a minimal record if no seeded customers exist.
  // Guard the SQLite-backed lookup: if the customer DB isn't migrated/seeded yet,
  // fall back to the minimal profile rather than throwing a 500 on conversation open.
  let resolved: ReturnType<typeof resolveMemberProfile> = null;
  try {
    resolved = resolveMemberProfile({ sessionId: entry.queueId, channelUserId: entry.userId });
  } catch (err) {
    log.warn({ err: (err as Error).message, queueId: entry.queueId }, "resolveMemberProfile failed (customer DB unavailable) — using minimal profile");
  }
  const profile = resolved ?? {
    memberId: entry.userId,
    maskedNric: card.maskedNric,
    fullName: `${channel} user …${suffix}`,
    age: 0,
    residentialStatus: "Unverified (anonymous channel)",
    dateOfBirth: "—",
    contact: `${channel} · ${entry.userId}`,
    preferredLanguage: LANG_LABELS[entry.preferred_lang] ?? entry.preferred_lang,
    address: "—",
    ordinary: 0,
    medisave: 0,
    retirement: 0,
    retirementSumElected: "—",
    monthlyPayout: null,
    payoutStartDate: null,
    shortfallVsFullRs: null,
    schemes: [] as Array<{ name: string; status: string }>,
    flags: [],
    dataSource: "demo" as const,
  };

  // Override identity fields with what we know for sure from the live channel:
  // the real Telegram id (the user's "telegram id of the bot" request) and the
  // language the citizen is actually chatting in.
  profile.contact = `${channel} · ${entry.userId}`;
  profile.preferredLanguage = LANG_LABELS[entry.preferred_lang] ?? entry.preferred_lang;
  if (entry.emotion_score > 70) {
    profile.flags = [`High distress: ${entry.emotion_label} (score ${entry.emotion_score})`, ...profile.flags];
  }

  return {
    session: {
      sessionId: entry.queueId,
      channelUserId: entry.userId,
      channel: card.channel,
      displayName: card.displayName,
      maskedNric: card.maskedNric,
      status: card.status,
      emotion: card.emotion,
      confidence: card.confidence,
      urgency: card.urgency,
      summary: entry.summary,
      turns,
      assignedOfficer: entry.assigned_officer ?? undefined,
      updatedAt: entry.created_at,
    },
    escalation: entry.summary ? {
      escalationId: entry.queueId,
      status: entry.status,
      topic: "CPF Enquiry",
      summary: entry.summary,
      contextWindow: "",
      riskFlags: entry.emotion_score > 70 ? ["high_distress"] : [],
    } : null,
    profile,
  };
}

export async function officerReply(
  sessionId: string,
  officer: string,
  message: string,
): Promise<{ ok: boolean; delivered: boolean; error?: string }> {
  const entry = await getQueueEntry(sessionId);
  if (!entry) return { ok: false, delivered: false, error: "session_not_found" };

  // Translate to user's preferred language
  let outbound = message;
  if (entry.preferred_lang && entry.preferred_lang !== "en") {
    const t = await translateText(message, "en", entry.preferred_lang).catch(() => null);
    if (t) outbound = t.translated_text;
  }

  let delivered = false;
  try {
    if (entry.userId.startsWith("tg:")) {
      const chatId = parseInt(entry.userId.slice(3), 10);
      await sendTelegramMessage(chatId, outbound);
      delivered = true;
    } else if (entry.userId.startsWith("wa:")) {
      await sendWhatsAppMessage(entry.userId.slice(3), outbound);
      delivered = true;
    }
  } catch (err) {
    log.warn({ err, sessionId }, "Officer reply delivery failed");
  }

  const ts = new Date().toISOString();
  broadcast("officer_message", {
    queueId: sessionId,
    officerId: officer,
    original_message: message,
    translated_message: outbound,
    ts,
  });

  await appendToQueueHistory(sessionId, { role: "officer", content: message, ts }).catch(() => null);

  log.info({ sessionId, officer, delivered }, "Officer reply sent");
  return { ok: true, delivered };
}

export async function acknowledge(escalationId: string, officer: string) {
  const updated = await assignQueueEntry(escalationId, officer);
  if (updated) broadcast("officer_assigned", { queueId: escalationId, officer });
  return updated;
}

export async function closeSession(sessionId: string, officer: string) {
  const entry = await resolveQueueEntry(sessionId);
  if (!entry) return null;

  notifyCaseResolved(sessionId);

  // End the session: this sends the citizen the resolution + 1–5 star CSAT prompt
  // (in their language) and resets their chat. The rating, once submitted, is tied
  // back to this queue entry (queueId) so the dashboard shows CSAT per case.
  await endSession(entry.userId, "officer", { lang: entry.preferred_lang, queueId: sessionId }).catch((err: unknown) =>
    log.warn({ err, sessionId }, "endSession (officer close) failed"),
  );

  log.info({ sessionId, officer }, "Session closed by officer");
  return { closed: true, sessionId };
}
