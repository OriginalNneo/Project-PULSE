/**
 * Reading-support detection for messaging channels (Telegram/WhatsApp/web).
 *
 * These channels carry no authenticated identity — there is no MyInfo, age, or
 * disability record to look up — so a citizen's need for simpler, slower replies
 * can only be *inferred from behaviour*, *declared by the citizen*, or set by an
 * officer. This module owns the first two, deliberately biased toward low
 * false-positives and dignity:
 *
 *   1. Repair / comprehension signals (strong) — the citizen reporting, in effect,
 *      that a reply didn't land ("I don't understand", "slower", "cannot read",
 *      看不懂, "tak faham", புரியல). A *reported* gap, not a guess from demographics.
 *   2. Reading-rate proxy (weak, corroborating) — implied words-per-minute from how
 *      long they took after our last reply before answering. Noisy (they may set the
 *      phone down), so it only ever raises an OFFER, and only when sustained.
 *   3. Explicit opt-in / opt-out — "/support" / "simple" / "slow" ↔ "full" / "normal".
 *
 * Auto-detected signals (1 and 2) offer simpler replies; the citizen opts in. Only an
 * explicit request (3) changes the tier without asking. The tier itself only ever
 * RISES automatically — never lowered without the citizen's own word.
 */
import type { VulnerabilityTier } from "../../shared/types/index.js";

// ── Repair / comprehension signals ───────────────────────────────────────────
// Kept tight: the cost of a miss is only a polite (opt-in) offer, but we still avoid
// bare adjectives like "simple"/"easy" that appear inside ordinary CPF questions.
const REPAIR_PATTERNS: readonly RegExp[] = [
  /\b(don'?t|do not|can'?t|cannot|didn'?t) (understand|get it|follow|read that|read)\b/i,
  /\b(too (fast|complicated|confusing|difficult|hard|much)|hard to (read|understand|follow))\b/i,
  /\b(slower|more slowly|speak slow|read slow)\b/i,
  /\b(simpler|more simple|in simple words|make it simple|plain(er)? (english|words)|break it down|one (thing|question) at a time)\b/i,
  /\b(repeat|say (that|it) again|come again|what do you mean)\b/i,
  /\bcannot read\b/i,
  /看不懂|聽不懂|听不懂|太快|太复杂|太複雜|简单.{0,4}说|簡單.{0,4}說|慢.{0,4}说|慢.{0,4}說|再说一次|再說一次/, // zh
  /\b(tak faham|tak paham|susah faham|perlahan[- ]?lahan|cakap (senang|simple)|ringkaskan|ulang)\b/i,          // ms
  /புரியவில்லை|புரியல|மெதுவாக|எளிமையாக(ச்)? சொல்|மீண்டும் சொல்/,                                                   // ta
];

/** True when the message is the citizen reporting they couldn't follow the reply. */
export function detectRepairSignal(text: string): boolean {
  if (!text) return false;
  return REPAIR_PATTERNS.some((p) => p.test(text));
}

// ── Explicit opt-in / opt-out ────────────────────────────────────────────────

/** Citizen explicitly asks for simpler/slower replies. Applied immediately (no offer). */
export function isSupportOptIn(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (/^\/?support\b/.test(t)) return true;
  if (["simple", "slow", "slower", "simpler"].includes(t)) return true;
  return /\b(simple mode|simpler (replies|please|answers)|slow(er)? (please|mode)|in simple words|explain (it )?simply|keep it simple)\b/.test(t);
}

/** Citizen explicitly asks to go back to full-detail replies. */
export function isSupportOptOut(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (["full", "normal"].includes(t)) return true;
  return /\b(full detail|full replies|normal mode|back to normal|full mode)\b/.test(t);
}

const AFFIRM = /^(yes|yes please|ya|yeah|ok|okay|sure|please|alright|y)\b/i;

/** True when a reply confirms a pending "want simpler replies?" offer. */
export function isSupportConfirmation(text: string): boolean {
  return isSupportOptIn(text) || AFFIRM.test(text.trim());
}

const DECLINE = /^(no|nope|not now|i'?m fine|im fine|no thanks|no thank you|nah)\b/i;

/** True when a reply explicitly declines the offer (so we stop re-offering). */
export function isSupportDecline(text: string): boolean {
  return DECLINE.test(text.trim());
}

// ── Reading-rate proxy ───────────────────────────────────────────────────────
// implied wpm = (words the bot showed) / (seconds until the citizen's next message).
// Conflates reading + thinking + typing, so it is only a corroborating signal and
// only trusted when SUSTAINED across turns (see SLOW_STREAK_TO_OFFER).

/** At or below this sustained implied rate → corroborating "may need slower" signal. */
export const READING_RATE_FLOOR_WPM = 40;
/** Consecutive slow turns before the reading-rate proxy alone can trigger an offer. */
export const SLOW_STREAK_TO_OFFER = 2;
/** Replies shorter than this give an unreliable rate — skipped. */
const MIN_BOT_WORDS_FOR_SAMPLE = 12;
/** Gaps longer than this mean the citizen stepped away, not slow reading — skipped. */
const MAX_GAP_SECONDS = 8 * 60;

/**
 * Implied reading rate in words-per-minute, or null when the sample is unreliable
 * (reply too short, or the gap is non-positive / long enough to be "stepped away").
 */
export function impliedReadingWpm(botWords: number, secondsToReply: number): number | null {
  if (botWords < MIN_BOT_WORDS_FOR_SAMPLE) return null;
  if (secondsToReply <= 0 || secondsToReply > MAX_GAP_SECONDS) return null;
  return (botWords / secondsToReply) * 60;
}

// ── Tier arithmetic ──────────────────────────────────────────────────────────
const TIER_ORDER: readonly VulnerabilityTier[] = ["self_service", "guided", "high_touch"];

/** Raise `current` toward `target`, never lowering it (auto-detection only ever helps more). */
export function raiseTier(current: VulnerabilityTier, target: VulnerabilityTier): VulnerabilityTier {
  return TIER_ORDER.indexOf(target) > TIER_ORDER.indexOf(current) ? target : current;
}
