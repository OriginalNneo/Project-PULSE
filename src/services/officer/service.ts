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

  // Map roles to what the frontend ConversationDetail expects
  const turns = (entry.chat_history ?? []).map((m) => ({
    role: m.role === "agent" ? "assistant" : m.role,
    content: m.content,
    at: m.ts,
  }));

  const card = toCard(entry, Date.now());
  const channel = entry.userId.startsWith("tg:") ? "Telegram" : "WhatsApp";
  const suffix = entry.userId.slice(-6);

  const profile = {
    memberId: entry.userId,
    maskedNric: card.maskedNric,
    fullName: `${channel} user …${suffix}`,
    age: 0,
    residentialStatus: "Unverified (anonymous channel)",
    dateOfBirth: "—",
    contact: `${channel} · ID ending ${suffix}`,
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
    flags: entry.emotion_score > 70
      ? [`High distress: ${entry.emotion_label} (score ${entry.emotion_score})`]
      : [],
    dataSource: "demo" as const,
  };

  return {
    session: {
      sessionId: entry.queueId,
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

  // Send closing message to user
  const closeMsg = "Your CPF query has been resolved by an officer. Thank you for reaching out. Feel free to message us again if you need further assistance.";
  let outbound = closeMsg;
  if (entry.preferred_lang && entry.preferred_lang !== "en") {
    const t = await translateText(closeMsg, "en", entry.preferred_lang).catch(() => null);
    if (t) outbound = t.translated_text;
  }
  try {
    if (entry.userId.startsWith("tg:")) {
      await sendTelegramMessage(parseInt(entry.userId.slice(3), 10), outbound);
    } else if (entry.userId.startsWith("wa:")) {
      await sendWhatsAppMessage(entry.userId.slice(3), outbound);
    }
  } catch (err) {
    log.warn({ err, sessionId }, "Close message delivery failed");
  }

  log.info({ sessionId, officer }, "Session closed by officer");
  return { closed: true };
}
