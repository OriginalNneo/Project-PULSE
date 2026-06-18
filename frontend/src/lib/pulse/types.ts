export type UiMode = "standard" | "simplified" | "assisted";

export type PageKey =
  | "home"
  | "check_medisave_balance"
  | "retirement_payout_planner"
  | "update_contact_details"
  | "nomination_status"
  | "transaction_review"
  | "cso_alert_console";

export interface UserProfile {
  schemaVersion: "1.0";
  userId: string;
  displayName: string;
  preferredLanguage: "en" | "zh" | "ms" | "ta";
}

export interface RecommendedAction {
  actionKey: string;
  label: string;
  description: string;
  href: string;
}

export interface UiProfile {
  schemaVersion: "1.0";
  mode: UiMode;
  recommendedActions: RecommendedAction[];
  supportContext?: string;
}

export interface MemberSession {
  schemaVersion: "1.0";
  sessionId: string;
  userId: string;
  startedAt: string;
}

export interface TelemetryEvent {
  schemaVersion: "1.0";
  eventId: string;
  sessionId: string;
  userId: string;
  pageKey: PageKey;
  eventType:
    | "page_view"
    | "heartbeat"
    | "idle"
    | "repeated_click"
    | "form_error"
    | "assistance_click";
  occurredAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface RealtimeConnection {
  close(): void;
}

export interface AssistanceRequest {
  schemaVersion: "1.0";
  sessionId: string;
  pageKey: PageKey;
  message: string;
}

export interface AssistanceResponse {
  schemaVersion: "1.0";
  requestId: string;
  status: "queued" | "started" | "unavailable";
  message: string;
}

export interface PulseClientAdapter {
  getCurrentUser(): Promise<UserProfile>;
  getUiProfile(): Promise<UiProfile>;
  startSession(): Promise<MemberSession>;
  sendTelemetry(event: TelemetryEvent): void;
  openMemberSocket(sessionId: string): RealtimeConnection;
  requestAssistance(input: AssistanceRequest): Promise<AssistanceResponse>;
}

export type CSOAlertPriority = "low" | "medium" | "high" | "critical";
export type CSOAlertStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "dismissed";

export interface CSOAlertSignal {
  type: string;
  label: string;
  occurredAt: string;
}

export interface CSOAlertProjection {
  schemaVersion: "1.0";
  alertId: string;
  sessionId: string;
  userId: string;
  memberAlias: string;
  priority: CSOAlertPriority;
  status: CSOAlertStatus;
  assignedCsoId?: string;
  channel: "web" | "chat" | "voice" | "sms";
  language: "en" | "zh" | "ms" | "ta";
  dialect?: string;
  pageKey: PageKey;
  currentTask: string;
  roadblock: string;
  deterministicReason: string;
  hermesSummary: string;
  suggestedOpening: string;
  riskFlags: string[];
  recentSignals: CSOAlertSignal[];
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface CSOAlertAdapter {
  getAlertSnapshot(): Promise<CSOAlertProjection[]>;
  openCsoAlertSocket(onAlert: (alert: CSOAlertProjection) => void): RealtimeConnection;
}
