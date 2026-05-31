import type { CSOAlertProjection, RecommendedAction } from "./types";

export const mockRecommendedActions: RecommendedAction[] = [
  {
    actionKey: "view_correspondence",
    label: "View letters",
    description: "Open recent CPF correspondence.",
    href: "/correspondence",
  },
  {
    actionKey: "ask_pulse",
    label: "Ask for help",
    description: "Start guided help for a current task.",
    href: "/chat",
  },
  {
    actionKey: "update_contact",
    label: "Update contact",
    description: "Review mobile number and mailing address.",
    href: "/settings",
  },
];

export const mockCsoAlerts: CSOAlertProjection[] = [
  {
    schemaVersion: "1.0",
    alertId: "alert_01",
    sessionId: "sess_01",
    userId: "usr_01",
    memberAlias: "Member A-204",
    priority: "high",
    status: "open",
    channel: "web",
    language: "en",
    pageKey: "retirement_payout_planner",
    currentTask: "View estimated monthly payout",
    roadblock: "Idle for 60 seconds on Retirement Payout Planner after three repeated field edits.",
    deterministicReason: "Repeated edits and inactivity exceeded the high-friction threshold.",
    hermesSummary:
      "Member may need guided assistance to understand which payout option to select before continuing.",
    suggestedOpening:
      "Hello, I can see you may be trying to view your retirement payout estimate. Would you like me to guide you through that step?",
    riskFlags: ["May need simplified guidance", "No restricted action attempted"],
    recentSignals: [
      {
        type: "page_view",
        label: "Opened Retirement Payout Planner",
        occurredAt: "2026-05-29T10:13:20.000Z",
      },
      {
        type: "form_error",
        label: "Payout age field failed validation twice",
        occurredAt: "2026-05-29T10:14:05.000Z",
      },
      {
        type: "idle",
        label: "No input for 60 seconds",
        occurredAt: "2026-05-29T10:16:10.000Z",
      },
    ],
    createdAt: "2026-05-29T10:16:10.000Z",
  },
  {
    schemaVersion: "1.0",
    alertId: "alert_02",
    sessionId: "sess_02",
    userId: "usr_02",
    memberAlias: "Member B-118",
    priority: "medium",
    status: "assigned",
    assignedCsoId: "cso_demo",
    channel: "chat",
    language: "zh",
    dialect: "Mandarin",
    pageKey: "update_contact_details",
    currentTask: "Update mobile number",
    roadblock: "Repeated help clicks while reviewing contact verification steps.",
    deterministicReason: "Assistance clicked four times within two minutes.",
    hermesSummary:
      "Member appears unsure about verification wording and may benefit from a short plain-language explanation.",
    suggestedOpening:
      "Hello, I can help explain the mobile number verification step in simpler terms.",
    riskFlags: ["Verification step active"],
    recentSignals: [
      {
        type: "page_view",
        label: "Opened Update Contact Details",
        occurredAt: "2026-05-29T10:11:42.000Z",
      },
      {
        type: "assistance_click",
        label: "Tapped help on verification instructions",
        occurredAt: "2026-05-29T10:12:30.000Z",
      },
      {
        type: "assistance_click",
        label: "Repeated help request",
        occurredAt: "2026-05-29T10:13:12.000Z",
      },
    ],
    createdAt: "2026-05-29T10:13:12.000Z",
    acknowledgedAt: "2026-05-29T10:13:40.000Z",
  },
  {
    schemaVersion: "1.0",
    alertId: "alert_03",
    sessionId: "sess_03",
    userId: "usr_03",
    memberAlias: "Member C-309",
    priority: "low",
    status: "open",
    channel: "sms",
    language: "ms",
    pageKey: "nomination_status",
    currentTask: "Check nomination status",
    roadblock: "Member paused after opening nomination status details.",
    deterministicReason: "Single idle signal with no repeated error pattern.",
    hermesSummary:
      "Member may simply be reading. Monitor before direct intervention unless another signal appears.",
    suggestedOpening:
      "Hello, I am here if you need help understanding your nomination status.",
    riskFlags: [],
    recentSignals: [
      {
        type: "page_view",
        label: "Opened Nomination Status",
        occurredAt: "2026-05-29T10:09:18.000Z",
      },
      {
        type: "idle",
        label: "Paused on detail view",
        occurredAt: "2026-05-29T10:10:25.000Z",
      },
    ],
    createdAt: "2026-05-29T10:10:25.000Z",
  },
];
