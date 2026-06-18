import { createServiceLogger } from "../../shared/logger.js";
import { appendOfficerReply } from "../chatbot/service.js";
import { getSession, listSessions } from "../chatbot/repository.js";
import { getMessagingChannel } from "../messaging/index.js";
import {
  getEscalationBySession,
  listEscalations,
  updateEscalationStatus,
} from "../escalation/service.js";
import { resolveMemberProfile } from "./memberProfile.js";
import type { ChatSession, Emotion, Urgency } from "../chatbot/types.js";

const log = createServiceLogger("officer");

/** Minutes of inactivity before an escalated chat is shown as "inactive". */
const INACTIVE_AFTER_MS = 30 * 60 * 1000;

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
  status: ChatSession["status"];
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

function toCard(session: ChatSession, escalationId: string | undefined, now: number): DashboardChatCard {
  return {
    sessionId: session.sessionId,
    escalationId,
    displayName: session.displayName,
    maskedNric: session.maskedNric,
    channel: session.channel,
    summary: session.summary || "General CPF enquiry",
    emotion: session.emotion,
    confidence: session.confidence,
    urgency: session.urgency,
    status: session.status,
    updatedAt: session.updatedAt,
    inactiveForMs: now - Date.parse(session.updatedAt),
  };
}

/** Build the full CPF Queries Dashboard payload from live session/escalation data. */
export async function getDashboard(): Promise<OfficerDashboard> {
  const now = Date.now();
  const [sessions, escalations] = await Promise.all([listSessions(), listEscalations()]);
  const escBySession = new Map(escalations.map((e) => [e.sessionId, e]));

  // Open chats = sessions currently with an officer (escalated) and not closed.
  const escalatedSessions = sessions.filter((s) => s.status === "escalated");

  const cards = escalatedSessions
    .map((s) => toCard(s, escBySession.get(s.sessionId)?.escalationId, now))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  const openChats = cards.filter((c) => c.inactiveForMs < INACTIVE_AFTER_MS);
  const inactiveChats = cards.filter((c) => c.inactiveForMs >= INACTIVE_AFTER_MS);

  // Incoming queries rail = escalations not yet resolved/dismissed, newest first.
  const incoming: IncomingQueryCard[] = escalations
    .filter((e) => e.status === "open" || e.status === "acknowledged")
    .map((e) => ({
      escalationId: e.escalationId,
      sessionId: e.sessionId,
      displayName: e.displayName,
      topic: e.topic,
      urgency: e.urgency,
      createdAt: e.createdAt,
    }));

  const tenMinAgo = now - 10 * 60 * 1000;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const resolvedToday = escalations.filter(
    (e) => e.resolvedAt && Date.parse(e.resolvedAt) >= startOfDay.getTime(),
  ).length;

  const stats: DashboardStats = {
    openChats: openChats.length,
    urgentChats: openChats.filter((c) => c.urgency === "high").length,
    incomingQueries: incoming.length,
    incomingLast10Min: escalations.filter((e) => Date.parse(e.createdAt) >= tenMinAgo).length,
    avgResponseMinutes: computeAvgResponseMinutes(escalations),
    resolvedToday,
  };

  return { stats, openChats, inactiveChats, incoming };
}

function computeAvgResponseMinutes(
  escalations: Awaited<ReturnType<typeof listEscalations>>,
): number | null {
  const responded = escalations.filter((e) => e.firstResponseAt);
  if (responded.length === 0) return null;
  const totalMs = responded.reduce(
    (sum, e) => sum + (Date.parse(e.firstResponseAt!) - Date.parse(e.createdAt)),
    0,
  );
  return Math.round(totalMs / responded.length / 60000);
}

/** Full conversation + escalation context + member profile for the detail view. */
export async function getConversation(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return null;
  const escalation = await getEscalationBySession(sessionId);
  const profile = resolveMemberProfile(session);
  return { session, escalation, profile };
}

/** Officer sends a reply — recorded on the session AND delivered to the citizen. */
export async function officerReply(
  sessionId: string,
  officer: string,
  message: string,
): Promise<{ ok: boolean; delivered: boolean; error?: string }> {
  const session = await appendOfficerReply(sessionId, officer, message);
  if (!session) return { ok: false, delivered: false, error: "session_not_found" };

  // Mark the escalation as in-progress + assigned, and stamp first response time.
  const escalation = await getEscalationBySession(sessionId);
  if (escalation && (escalation.status === "open" || escalation.status === "acknowledged")) {
    await updateEscalationStatus(escalation.escalationId, "in_progress", officer);
  }

  // Deliver to the citizen on their original channel if it's a messaging one.
  let delivered = false;
  if ((session.channel === "telegram" || session.channel === "whatsapp") && session.channelUserId) {
    const result = await getMessagingChannel().send({ to: session.channelUserId, text: message });
    delivered = result.ok;
    if (!result.ok) log.warn({ sessionId, err: result.error }, "Officer reply not delivered");
  } else {
    // Web/app chats read the reply by polling the session — counts as delivered.
    delivered = true;
  }
  return { ok: true, delivered };
}

export async function acknowledge(escalationId: string, officer: string) {
  return updateEscalationStatus(escalationId, "acknowledged", officer);
}

export async function closeSession(sessionId: string, officer: string) {
  const session = await getSession(sessionId);
  if (!session) return null;
  session.status = "closed";
  session.updatedAt = new Date().toISOString();
  const { saveSession } = await import("../chatbot/repository.js");
  await saveSession(session);
  const escalation = await getEscalationBySession(sessionId);
  if (escalation) await updateEscalationStatus(escalation.escalationId, "resolved", officer);
  return session;
}
