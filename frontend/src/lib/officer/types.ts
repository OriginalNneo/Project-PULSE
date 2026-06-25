export type Emotion =
  | "distressed"
  | "angry"
  | "anxious"
  | "confused"
  | "neutral"
  | "calm"
  | "happy";

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

export interface ChatTurn {
  role: "user" | "assistant" | "officer" | "system";
  content: string;
  at: string;
  /** Per-message sentiment (0–100) for citizen turns; absent for bot/officer turns. */
  emotion_score?: number;
  emotion_label?: string;
}

export interface ChatSession {
  sessionId: string;
  /** Raw channel id, e.g. "tg:123456789" — the live Telegram chat id. */
  channelUserId?: string;
  channel: string;
  displayName: string;
  maskedNric: string;
  status: ChatStatus;
  emotion: Emotion;
  confidence: number;
  urgency: Urgency;
  summary: string;
  turns: ChatTurn[];
  assignedOfficer?: string;
}

export interface Escalation {
  escalationId: string;
  status: string;
  topic: string;
  summary: string;
  contextWindow: string;
  riskFlags: string[];
}

export interface MemberProfile {
  memberId: string;
  maskedNric: string;
  fullName: string;
  age: number;
  residentialStatus: string;
  dateOfBirth: string;
  contact: string;
  preferredLanguage: string;
  address: string;
  ordinary: number;
  medisave: number;
  retirement: number;
  retirementSumElected: string;
  monthlyPayout: number | null;
  payoutStartDate: string | null;
  shortfallVsFullRs: number | null;
  schemes: Array<{ name: string; status: string }>;
  flags: string[];
  dataSource: "real" | "demo";
}

export interface Conversation {
  session: ChatSession;
  escalation: Escalation | null;
  profile: MemberProfile | null;
}
