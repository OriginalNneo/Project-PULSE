import type {
  MemberSession,
  TelemetryEvent,
  UiProfile,
  UserProfile,
} from "../contracts/index.js";

export interface RealtimeConnection {
  readonly readyState: number;
  close(code?: number, reason?: string): void;
  send(message: string): void;
}

export interface AssistanceRequest {
  schemaVersion: "1.0";
  sessionId: string;
  userId: string;
  pageKey: string;
  reason: "user_requested" | "friction_detected";
  message?: string;
}

export interface AssistanceResponse {
  schemaVersion: "1.0";
  requestId: string;
  accepted: boolean;
  escalationId?: string;
  message?: string;
}

export interface PulseClientAdapter {
  getCurrentUser(): Promise<UserProfile>;
  getUiProfile(): Promise<UiProfile>;
  startSession(): Promise<MemberSession>;
  sendTelemetry(event: TelemetryEvent): void;
  openMemberSocket(sessionId: string): RealtimeConnection;
  requestAssistance(input: AssistanceRequest): Promise<AssistanceResponse>;
}
