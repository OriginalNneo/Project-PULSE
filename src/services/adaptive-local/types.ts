export type UiMode = "standard" | "simplified" | "assisted" | "high_contrast";

export type AgeBracket = "under_35" | "35_to_54" | "55_to_64" | "65_plus";

export type VulnerabilityMarkerType =
  | "senior_age_bracket"
  | "accessibility_preference"
  | "low_digital_confidence"
  | "caregiver_assisted";

export interface VulnerabilityMarker {
  type: VulnerabilityMarkerType;
  value: string;
  confidence: number;
}

export interface AdaptiveUserProfile {
  id: string;
  singpassSubject: string;
  displayName: string;
  ageBracket: AgeBracket;
  preferredLanguage: "en" | "zh" | "ms" | "ta";
  vulnerabilityMarkers: VulnerabilityMarker[];
  accessibilityPreference?: "high_contrast" | "assisted";
  assistedInterventionOptOut?: boolean;
}

export interface MemberSession {
  id: string;
  userId: string;
  startedAt: string;
  expiresAt: string;
  currentPageKey: PageKey;
  active: boolean;
}

export interface UiProfile {
  mode: UiMode;
  recommendedActions: ActionKey[];
  reasons: string[];
}

export type ActionKey =
  | "check_medisave_balance"
  | "view_retirement_payout"
  | "request_assistance"
  | "update_contact_details"
  | "review_nomination_status";

export type PageKey =
  | "home"
  | "check_medisave_balance"
  | "retirement_payout_planner"
  | "update_contact_details"
  | "nomination_status"
  | "transaction_review";

export type TelemetryEventType =
  | "page_view"
  | "heartbeat"
  | "idle_tick"
  | "click_attempt"
  | "repeated_click"
  | "rage_click"
  | "backtrack"
  | "form_error"
  | "assistance_hover"
  | "assistance_click"
  | "navigation_abandon";

export interface TelemetryEvent {
  eventId: string;
  schemaVersion: "1.0";
  sessionId: string;
  userId: string;
  pageKey: PageKey;
  eventType: TelemetryEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ObservedSignal {
  eventType: TelemetryEventType;
  value: string | number;
  unit?: string;
}

export type FrictionSeverity = "low" | "medium" | "high";

export interface FrictionEvent {
  frictionEventId: string;
  sessionId: string;
  userId: string;
  pageKey: PageKey;
  ruleId: string;
  severity: FrictionSeverity;
  confidence: number;
  observedSignals: ObservedSignal[];
  createdAt: string;
}

export interface HermesPayload {
  requestId: string;
  schemaVersion: "1.0";
  generatedAt: string;
  userContext: {
    userId: string;
    ageBracket: AgeBracket;
    vulnerabilityMarkers: VulnerabilityMarker[];
    uiMode: UiMode;
  };
  sessionContext: {
    sessionId: string;
    currentPageKey: PageKey;
    currentTask: string;
    sessionStartedAt: string;
  };
  frictionContext: {
    frictionEventId: string;
    severity: FrictionSeverity;
    ruleId: string;
    signals: Array<{ type: string; value: string | number; unit?: string }>;
    recentEventsSummary: string[];
  };
  routingPolicy: {
    allowChatbot: boolean;
    allowHumanEscalation: boolean;
    preferredIntervention: "self_serve" | "chatbot" | "cso_live_assist";
  };
}

export interface HermesDecision {
  decisionId: string;
  recommendedAction: "monitor" | "offer_chatbot" | "escalate_to_cso";
  priority: "normal" | "medium" | "high";
  chatbotBypass: boolean;
  summaryForOfficer: string;
  suggestedOpening: string;
  riskFlags: string[];
}

export interface CsoAlert {
  alertId: string;
  status: "open" | "acknowledged" | "resolved";
  priority: HermesDecision["priority"];
  createdAt: string;
  sessionId: string;
  userId: string;
  displayName: string;
  uiMode: UiMode;
  currentPageKey: PageKey;
  currentTask: string;
  ruleId: string;
  severity: FrictionSeverity;
  summaryForOfficer: string;
  suggestedOpening: string;
  observedSignals: ObservedSignal[];
  riskFlags: string[];
}

export interface LoginResult {
  user: Omit<AdaptiveUserProfile, "singpassSubject">;
  session: Pick<MemberSession, "id" | "expiresAt">;
  uiProfile: UiProfile;
}

export type ValidationResult<T> = {
  ok: true;
  value: T;
} | {
  ok: false;
  errors: string[];
};
