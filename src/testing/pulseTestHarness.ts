import { z } from "zod";

import type { ApiResponse } from "../shared/types/api.js";
import type {
  Correspondence,
  VulnerabilityProfile,
  VulnerabilitySignal,
} from "../shared/types/domain.js";
import type {
  DeliveryChannel,
  Dialect,
  Language,
  Urgency,
  VulnerabilityTier,
} from "../shared/types/language.js";
import { LanguageSchema, DialectSchema, VulnerabilityTierSchema } from "../shared/types/schemas.js";

export const languageContract = LanguageSchema;
export const dialectContract = DialectSchema;
export const vulnerabilityTierContract = VulnerabilityTierSchema;
export const deliveryChannelContract = z.enum(["physical", "sms", "voice", "email", "in-app"]);
export const urgencyContract = z.enum(["normal", "high", "critical"]);
export const correspondenceCategoryContract = z.enum([
  "tax",
  "health",
  "housing",
  "employment",
  "legal",
]);

export const apiResponseContract = z
  .object({
    data: z.unknown().optional(),
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
      })
      .optional(),
  })
  .strict()
  .refine((value) => value.data !== undefined || value.error !== undefined, {
    message: "ApiResponse must carry either data or error",
  });

export const correspondenceContract = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    tenantId: z.string().min(1),
    category: correspondenceCategoryContract,
    urgency: urgencyContract,
    title: z.string().min(1),
    body: z.string().min(1),
    channels: z.array(deliveryChannelContract).min(1),
    language: languageContract,
    createdAt: z.string().datetime(),
    viewedAt: z.string().datetime().optional(),
    actionTakenAt: z.string().datetime().optional(),
  })
  .strict();

export const vulnerabilitySignalContract = z
  .object({
    type: z.enum(["login_failure", "idle_time", "bounce", "age", "declared_disability"]),
    value: z.string().min(1),
    detectedAt: z.string().datetime(),
  })
  .strict();

export const vulnerabilityProfileContract = z
  .object({
    userId: z.string().min(1),
    tier: vulnerabilityTierContract,
    signals: z.array(vulnerabilitySignalContract),
    lastAssessed: z.string().datetime(),
  })
  .strict();

export interface UiProfileInput {
  language: Language;
  dialect?: Dialect;
  vulnerabilityTier: VulnerabilityTier;
  requestedChannels?: DeliveryChannel[];
}

export interface UiProfileResolution {
  locale: string;
  copyLanguage: Language;
  dialect?: Dialect;
  primaryChannel: DeliveryChannel;
  assistedMode: boolean;
  voiceFirst: boolean;
  fontScale: 1 | 1.15 | 1.3;
}

const dialectLocale: Record<Dialect, string> = {
  "zh-hok": "zh-Hant-SG-x-hokkien",
  "zh-can": "zh-Hant-SG-x-cantonese",
  "zh-teo": "zh-Hant-SG-x-teochew",
  "zh-hak": "zh-Hant-SG-x-hakka",
  "zh-hai": "zh-Hant-SG-x-hainanese",
  "ms-bms": "ms-SG-x-bazaar",
  "ms-joh": "ms-SG-x-johor",
  "ms-boy": "ms-SG-x-boyanese",
  "ms-jav": "ms-SG-x-javanese",
  "ta-sin": "ta-SG-x-singapore",
  "ta-spo": "ta-SG-x-spoken",
  ml: "ml-SG",
  pa: "pa-SG",
  hi: "hi-SG",
};

const languageLocale: Record<Language, string> = {
  en: "en-SG",
  zh: "zh-SG",
  ms: "ms-SG",
  ta: "ta-SG",
  hi: "hi-SG",
  ml: "ml-SG",
  pa: "pa-SG",
};

const tierProfile: Record<VulnerabilityTier, Pick<UiProfileResolution, "assistedMode" | "voiceFirst" | "fontScale">> = {
  "self_service": { assistedMode: false, voiceFirst: false, fontScale: 1 },
  guided:         { assistedMode: true, voiceFirst: false, fontScale: 1.15 },
  "high_touch":   { assistedMode: true, voiceFirst: true, fontScale: 1.3 },
};

export function resolveUiProfile(input: UiProfileInput): UiProfileResolution {
  const requestedChannels = input.requestedChannels ?? ["in-app"];
  const primaryChannel =
    input.vulnerabilityTier === "high_touch" && requestedChannels.includes("voice")
      ? "voice"
      : requestedChannels[0] ?? "in-app";

  return {
    locale: input.dialect ? dialectLocale[input.dialect] : languageLocale[input.language],
    copyLanguage: input.language,
    dialect: input.dialect,
    primaryChannel,
    ...tierProfile[input.vulnerabilityTier],
  };
}

export type FrictionEventType =
  | "login_failure"
  | "idle_time"
  | "message_bounce"
  | "proxy_request"
  | "action_completed";

export interface FrictionEvent {
  type: FrictionEventType;
  userId: string;
  occurredAt: string;
  channel?: DeliveryChannel;
  correspondenceId?: string;
}

export interface FrictionScenario {
  userId: string;
  frictionScore: number;
  escalation: "none" | "observe" | "assist" | "urgent";
  reasons: string[];
}

const frictionWeights: Record<FrictionEventType, number> = {
  login_failure: 2,
  idle_time: 1,
  message_bounce: 3,
  proxy_request: 2,
  action_completed: -4,
};

export function summarizeFriction(events: FrictionEvent[]): FrictionScenario[] {
  const byUser = new Map<string, FrictionScenario>();

  for (const event of events) {
    const current =
      byUser.get(event.userId) ??
      ({ userId: event.userId, frictionScore: 0, escalation: "none", reasons: [] } satisfies FrictionScenario);

    current.frictionScore = Math.max(0, current.frictionScore + frictionWeights[event.type]);
    if (event.type !== "action_completed") {
      current.reasons.push(event.type);
    }
    current.escalation =
      current.frictionScore >= 7
        ? "urgent"
        : current.frictionScore >= 4
          ? "assist"
          : current.frictionScore >= 2
            ? "observe"
            : "none";

    byUser.set(event.userId, current);
  }

  return [...byUser.values()].sort((left, right) => right.frictionScore - left.frictionScore);
}

export interface HermesBoundaryConfig {
  endpoint: string;
  allowLocalTransports: boolean;
}

export interface HermesDispatch {
  endpoint: string;
  payload: unknown;
  queued: true;
}

const localEndpointPattern = /(^|\/\/)(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/i;

export function createHermesBoundary(config: HermesBoundaryConfig) {
  return {
    dispatch(payload: unknown): HermesDispatch {
      if (!config.allowLocalTransports && localEndpointPattern.test(config.endpoint)) {
        throw new Error("Hermes transport must not use a local endpoint outside explicit test mode");
      }

      return {
        endpoint: config.endpoint,
        payload,
        queued: true,
      };
    },
  };
}

export type CsoAlertSeverity = "info" | "warning" | "critical";

export interface CsoAlertProjection {
  userId: string;
  severity: CsoAlertSeverity;
  queue: "watchlist" | "outreach" | "immediate";
  reasons: string[];
}

export function projectCsoAlerts(
  profiles: VulnerabilityProfile[],
  frictionScenarios: FrictionScenario[],
  correspondences: Correspondence[],
): CsoAlertProjection[] {
  const frictionByUser = new Map(frictionScenarios.map((scenario) => [scenario.userId, scenario]));
  const criticalCorrespondenceUsers = new Set(
    correspondences.filter((item) => item.urgency === "critical").map((item) => item.userId),
  );

  return profiles
    .map((profile) => {
      const friction = frictionByUser.get(profile.userId);
      const reasons = [
        profile.tier === "high_touch" ? "high-touch profile" : undefined,
        friction && friction.escalation !== "none" ? `${friction.escalation} friction` : undefined,
        criticalCorrespondenceUsers.has(profile.userId) ? "critical correspondence" : undefined,
      ].filter((reason): reason is string => Boolean(reason));

      const severity: CsoAlertSeverity =
        reasons.includes("critical correspondence") || friction?.escalation === "urgent"
          ? "critical"
          : profile.tier === "high_touch" || friction?.escalation === "assist"
            ? "warning"
            : "info";

      const queue: CsoAlertProjection["queue"] =
        severity === "critical" ? "immediate" : severity === "warning" ? "outreach" : "watchlist";

      return { userId: profile.userId, severity, queue, reasons };
    })
    .filter((alert) => alert.reasons.length > 0)
    .sort((left, right) => {
      const rank: Record<CsoAlertSeverity, number> = { critical: 3, warning: 2, info: 1 };
      return rank[right.severity] - rank[left.severity] || left.userId.localeCompare(right.userId);
    });
}

export function makeApiResponse<T>(data: T): ApiResponse<T> {
  return { data };
}

export function makeCorrespondence(overrides: Partial<Correspondence> = {}): Correspondence {
  return {
    id: "corr-1",
    userId: "user-1",
    tenantId: "tenant-1",
    category: "health",
    urgency: "normal",
    title: "Appointment reminder",
    body: "Please review your appointment details.",
    channels: ["in-app"],
    language: "en",
    createdAt: "2026-05-30T00:00:00.000Z",
    ...overrides,
  };
}

export function makeVulnerabilityProfile(
  overrides: Partial<VulnerabilityProfile> = {},
): VulnerabilityProfile {
  return {
    userId: "user-1",
    tier: "self_service",
    signals: [],
    lastAssessed: "2026-05-30T00:00:00.000Z",
    ...overrides,
  };
}

export function makeVulnerabilitySignal(
  overrides: Partial<VulnerabilitySignal> = {},
): VulnerabilitySignal {
  return {
    type: "idle_time",
    value: "900",
    detectedAt: "2026-05-30T00:00:00.000Z",
    ...overrides,
  };
}

export function makeFrictionEvent(overrides: Partial<FrictionEvent> = {}): FrictionEvent {
  return {
    type: "idle_time",
    userId: "user-1",
    occurredAt: "2026-05-30T00:00:00.000Z",
    channel: "in-app",
    ...overrides,
  };
}
