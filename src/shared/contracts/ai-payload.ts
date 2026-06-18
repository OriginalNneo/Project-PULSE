import { z } from "zod";
import { validateContract } from "./validation.js";
import { FrictionEventSchema, FrictionSeveritySchema } from "./friction.js";
import { UserProfileSchema } from "./identity.js";
import { TelemetryEventSchema } from "./telemetry.js";
import { UiProfileSchema } from "./ui-profile.js";

export const AI_PAYLOAD_SCHEMA_VERSION = "1.0" as const;

export const HermesChannelSchema = z.enum(["web", "chat", "voice", "security"]);
export const SupportTierSchema = z.enum(["self-service", "guided", "high-touch"]);

export const HermesPolicySchema = z.object({
  allowHumanEscalation: z.boolean(),
  allowSensitiveData: z.boolean(),
  allowSecurityTesting: z.boolean(),
});

export const HermesFrictionInputSchema = z.object({
  schemaVersion: z.literal(AI_PAYLOAD_SCHEMA_VERSION),
  frictionEvent: FrictionEventSchema,
  userProfile: UserProfileSchema.pick({
    schemaVersion: true,
    id: true,
    ageBracket: true,
    preferredLocale: true,
    vulnerabilityMarkers: true,
  }),
  uiProfile: UiProfileSchema,
  recentTelemetry: z.array(TelemetryEventSchema).max(25).default([]),
  currentTaskLabel: z.string().min(1).optional(),
});

export const HermesStubRequestSchema = z.object({
  schemaVersion: z.literal(AI_PAYLOAD_SCHEMA_VERSION),
  requestId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  channel: HermesChannelSchema,
  locale: z.string().min(2).max(16).optional(),
  dialect: z.string().min(1).optional(),
  supportTier: SupportTierSchema.optional(),
  input: HermesFrictionInputSchema,
  policy: HermesPolicySchema,
});

export const HermesEscalationRecommendationSchema = z.object({
  schemaVersion: z.literal(AI_PAYLOAD_SCHEMA_VERSION),
  shouldEscalate: z.boolean(),
  bypassChatbot: z.boolean(),
  severity: FrictionSeveritySchema,
  urgencyReason: z.string().min(1),
  officerSummary: z.string().min(1),
  suggestedOpening: z.string().min(1),
  recommendedActions: z.array(z.string().min(1)).default([]),
});

export const HermesStubResponseSchema = z.object({
  schemaVersion: z.literal(AI_PAYLOAD_SCHEMA_VERSION),
  requestId: z.string().min(1),
  subagent: z.literal("friction_synthesis"),
  confidence: z.number().min(0).max(1),
  output: HermesEscalationRecommendationSchema,
  riskFlags: z.array(z.string().min(1)).default([]),
  nextRecommendedSubagent: z.string().min(1).optional(),
});

export type HermesChannel = z.infer<typeof HermesChannelSchema>;
export type SupportTier = z.infer<typeof SupportTierSchema>;
export type HermesPolicy = z.infer<typeof HermesPolicySchema>;
export type HermesFrictionInput = z.infer<typeof HermesFrictionInputSchema>;
export type HermesStubRequest = z.infer<typeof HermesStubRequestSchema>;
export type HermesEscalationRecommendation = z.infer<typeof HermesEscalationRecommendationSchema>;
export type HermesStubResponse = z.infer<typeof HermesStubResponseSchema>;

export const validateHermesStubRequest = (value: unknown) =>
  validateContract(HermesStubRequestSchema, value);

export const validateHermesStubResponse = (value: unknown) =>
  validateContract(HermesStubResponseSchema, value);
