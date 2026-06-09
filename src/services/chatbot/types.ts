/**
 * Types for the integrated chatbot — the AI front door that replaces the
 * "Open Integrated ChatBot" node in the system diagram. It answers SIMPLE
 * requests inline (grounded in MongoDB CPF knowledge) and ESCALATES complex /
 * private / unique requests to a Customer Correspondence Unit (CCU) officer
 * over the active messaging channel (Telegram now, WhatsApp later).
 */

/** Where the citizen is talking to us from. */
export type ChatChannel = "web_cpf" | "app_cpf" | "telegram" | "whatsapp";

/** Emotion surfaced on the officer dashboard chat cards. */
export type Emotion =
  | "distressed"
  | "angry"
  | "anxious"
  | "confused"
  | "neutral"
  | "calm"
  | "happy";

/** Urgency drives the red / amber / green dot on each dashboard card. */
export type Urgency = "high" | "medium" | "low";

export type ChatRole = "user" | "assistant" | "officer" | "system";

export interface ChatTurn {
  role: ChatRole;
  content: string;
  at: string;
  /** Populated on assistant turns: the analysis used for routing + the card. */
  analysis?: TurnAnalysis;
}

export interface TurnAnalysis {
  emotion: Emotion;
  /** 0–100. Model/heuristic confidence the chatbot can resolve this itself. */
  confidence: number;
  urgency: Urgency;
  /** Whether the request is complex/private and should go to an officer. */
  complex: boolean;
  /** Short keyword/classifier topic label for the dashboard summary. */
  topic: string;
}

export type ChatSessionStatus = "active" | "escalated" | "closed";

export interface ChatSession {
  sessionId: string;
  channel: ChatChannel;
  /** External identity on the channel (e.g. Telegram chat id) if any. */
  channelUserId?: string;
  /** Linked PULSE member id (SQLite customer) if known. */
  memberId?: string;
  displayName: string;
  /** Masked NRIC shown on the dashboard, e.g. "S123••••H". */
  maskedNric: string;
  status: ChatSessionStatus;
  /** Latest analysis — what the dashboard card renders. */
  emotion: Emotion;
  confidence: number;
  urgency: Urgency;
  /** One-line summary of what the citizen needs. */
  summary: string;
  turns: ChatTurn[];
  createdAt: string;
  updatedAt: string;
  /** Set when escalated, links to the cso_escalations document. */
  escalationId?: string;
  /** Officer who picked up the chat, if any. */
  assignedOfficer?: string;
}

export interface ChatMessageInput {
  /** Omit to start a new session. */
  sessionId?: string;
  channel: ChatChannel;
  channelUserId?: string;
  memberId?: string;
  displayName?: string;
  message: string;
}

export interface ChatMessageResult {
  sessionId: string;
  reply: string;
  status: ChatSessionStatus;
  analysis: TurnAnalysis;
  escalated: boolean;
  escalationId?: string;
  /** Provider that produced the reply ("zai" | "hermes" | "fallback"). */
  source: string;
  citations: Array<{ title: string; sourceUrl: string }>;
}
