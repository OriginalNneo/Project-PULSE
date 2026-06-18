import { randomUUID } from "node:crypto";
import { createServiceLogger } from "../../shared/logger.js";
import { getDocumentStore } from "../../data/docstore/index.js";
import { COLLECTIONS } from "../../data/docstore/types.js";
import { getMessagingChannel } from "../messaging/index.js";
import type { ChatSession, TurnAnalysis } from "../chatbot/types.js";
import type { Escalation, EscalationStatus } from "./types.js";

const log = createServiceLogger("escalation");

function buildContextWindow(session: ChatSession): string {
  // The "aggregate context window from chatbot to officer" from the diagram.
  const transcript = session.turns
    .filter((t) => t.role === "user" || t.role === "assistant")
    .slice(-10)
    .map((t) => `${t.role === "user" ? "Citizen" : "Bot"}: ${t.content}`)
    .join("\n");
  return transcript;
}

function buildRiskFlags(analysis: TurnAnalysis): string[] {
  const flags: string[] = [`topic:${analysis.topic}`];
  if (analysis.urgency === "high") flags.push("high_urgency");
  if (analysis.emotion === "distressed") flags.push("distressed_citizen");
  if (analysis.emotion === "angry") flags.push("angry_citizen");
  if (analysis.confidence < 35) flags.push("low_bot_confidence");
  return flags;
}

/**
 * Create an escalation from a chat session, persist it to the document store
 * (MongoDB), and notify the configured officer channel. The citizen is told a
 * human is taking over (handled by the chatbot reply); the officer sees the
 * full context window on the dashboard.
 */
export async function createEscalation(session: ChatSession, analysis: TurnAnalysis): Promise<Escalation> {
  const now = new Date().toISOString();
  const escalation: Escalation = {
    escalationId: `esc_${randomUUID()}`,
    sessionId: session.sessionId,
    channel: session.channel,
    channelUserId: session.channelUserId,
    displayName: session.displayName,
    maskedNric: session.maskedNric,
    status: "open",
    emotion: analysis.emotion,
    confidence: analysis.confidence,
    urgency: analysis.urgency,
    topic: analysis.topic,
    summary: session.turns.find((t) => t.role === "user")?.content.slice(0, 140) ?? analysis.topic,
    contextWindow: buildContextWindow(session),
    riskFlags: buildRiskFlags(analysis),
    createdAt: now,
    updatedAt: now,
  };

  const store = await getDocumentStore();
  await store.upsert<Escalation>(COLLECTIONS.escalations, { escalationId: escalation.escalationId }, escalation);

  // Notify the officer channel (best-effort — escalation still persists if down).
  await notifyOfficerChannel(escalation);

  log.info({ escalationId: escalation.escalationId, urgency: escalation.urgency }, "Escalation created");
  return escalation;
}

async function notifyOfficerChannel(escalation: Escalation): Promise<void> {
  const channel = getMessagingChannel();
  const { officerChatId } = (await import("../../config/integration.js")).getIntegrationConfig().telegram;
  const target = officerChatId;
  if (!target || !channel.isReady()) return;
  const text =
    `🔔 New CCU escalation [${escalation.urgency.toUpperCase()}]\n` +
    `From: ${escalation.displayName} (${escalation.maskedNric})\n` +
    `Topic: ${escalation.topic} — citizen mood: ${escalation.emotion}\n` +
    `Summary: ${escalation.summary}\n\n` +
    `Open the CPF Queries Dashboard to respond.`;
  await channel.send({ to: target, text });
}

export async function listEscalations(): Promise<Escalation[]> {
  const store = await getDocumentStore();
  const items = await store.list<Escalation>(COLLECTIONS.escalations);
  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function getEscalation(escalationId: string): Promise<Escalation | null> {
  const store = await getDocumentStore();
  return store.findOne<Escalation>(COLLECTIONS.escalations, { escalationId });
}

export async function getEscalationBySession(sessionId: string): Promise<Escalation | null> {
  const store = await getDocumentStore();
  return store.findOne<Escalation>(COLLECTIONS.escalations, { sessionId });
}

export async function updateEscalationStatus(
  escalationId: string,
  status: EscalationStatus,
  officer?: string,
): Promise<Escalation | null> {
  const escalation = await getEscalation(escalationId);
  if (!escalation) return null;
  const now = new Date().toISOString();
  escalation.status = status;
  escalation.updatedAt = now;
  if (officer) escalation.assignedOfficer = officer;
  if (status === "acknowledged" && !escalation.acknowledgedAt) escalation.acknowledgedAt = now;
  // First time an officer engages (acknowledge or reply) = the response moment.
  if ((status === "acknowledged" || status === "in_progress") && !escalation.firstResponseAt) {
    escalation.firstResponseAt = now;
  }
  if (status === "resolved" || status === "dismissed") escalation.resolvedAt = now;
  const store = await getDocumentStore();
  await store.upsert<Escalation>(COLLECTIONS.escalations, { escalationId }, escalation);
  return escalation;
}
