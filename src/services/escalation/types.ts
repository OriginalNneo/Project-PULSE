import type { Emotion, Urgency } from "../chatbot/types.js";

/**
 * An escalation is a chatbot conversation handed to the Customer Correspondence
 * Unit (CCU). It carries the AI context window so an officer has the full
 * picture the moment it lands on the dashboard.
 */
export type EscalationStatus = "open" | "acknowledged" | "in_progress" | "resolved" | "dismissed";

export interface Escalation {
  escalationId: string;
  sessionId: string;
  /** Channel the citizen is on, so officer replies route back correctly. */
  channel: string;
  channelUserId?: string;
  displayName: string;
  maskedNric: string;
  status: EscalationStatus;
  /** Card fields — mirror the chat session's latest analysis. */
  emotion: Emotion;
  confidence: number;
  urgency: Urgency;
  topic: string;
  summary: string;
  /** The AI context window: condensed conversation for the officer. */
  contextWindow: string;
  riskFlags: string[];
  assignedOfficer?: string;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  /** When the officer first replied to the citizen — drives avg response time. */
  firstResponseAt?: string;
  resolvedAt?: string;
}
