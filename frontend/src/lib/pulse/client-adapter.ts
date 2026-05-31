import { mockCsoAlerts, mockRecommendedActions } from "./mock-data";
import type {
  AssistanceRequest,
  AssistanceResponse,
  CSOAlertAdapter,
  MemberSession,
  PulseClientAdapter,
  RealtimeConnection,
  TelemetryEvent,
  UiProfile,
  UserProfile,
} from "./types";

const noopConnection: RealtimeConnection = {
  close() {
    return undefined;
  },
};

export class MockPulseClientAdapter implements PulseClientAdapter {
  async getCurrentUser(): Promise<UserProfile> {
    return {
      schemaVersion: "1.0",
      userId: "usr_demo",
      displayName: "Demo Member",
      preferredLanguage: "en",
    };
  }

  async getUiProfile(): Promise<UiProfile> {
    return {
      schemaVersion: "1.0",
      mode: "assisted",
      recommendedActions: mockRecommendedActions,
      supportContext: "May need simplified guidance",
    };
  }

  async startSession(): Promise<MemberSession> {
    return {
      schemaVersion: "1.0",
      sessionId: "sess_demo",
      userId: "usr_demo",
      startedAt: new Date().toISOString(),
    };
  }

  sendTelemetry(_event: TelemetryEvent): void {
    return undefined;
  }

  openMemberSocket(_sessionId: string): RealtimeConnection {
    return noopConnection;
  }

  async requestAssistance(input: AssistanceRequest): Promise<AssistanceResponse> {
    return {
      schemaVersion: "1.0",
      requestId: `assist_${input.sessionId}`,
      status: "queued",
      message: "Assistance request queued through the orchestration layer.",
    };
  }
}

export class MockCSOAlertAdapter implements CSOAlertAdapter {
  async getAlertSnapshot() {
    return mockCsoAlerts;
  }

  openCsoAlertSocket(_onAlert: (alert: (typeof mockCsoAlerts)[number]) => void): RealtimeConnection {
    return noopConnection;
  }
}

export const pulseClientAdapter: PulseClientAdapter = new MockPulseClientAdapter();
export const csoAlertAdapter: CSOAlertAdapter = new MockCSOAlertAdapter();
