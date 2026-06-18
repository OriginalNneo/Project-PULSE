import { z } from "zod";
import { validateContract } from "./validation.js";
import { HermesEscalationRecommendationSchema } from "./ai-payload.js";
import { FrictionEventSchema, FrictionSeveritySchema } from "./friction.js";
import { PageKeySchema } from "./ui-profile.js";

export const ESCALATION_SCHEMA_VERSION = "1.0" as const;

export const CsoAlertStatusSchema = z.enum([
  "new",
  "acknowledged",
  "in_progress",
  "resolved",
  "dismissed",
]);

export const CsoEscalationAlertSchema = z.object({
  schemaVersion: z.literal(ESCALATION_SCHEMA_VERSION),
  alertId: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  pageKey: PageKeySchema,
  severity: FrictionSeveritySchema,
  status: CsoAlertStatusSchema,
  frictionEvent: FrictionEventSchema,
  recommendation: HermesEscalationRecommendationSchema,
  createdAt: z.string().datetime(),
  acknowledgedAt: z.string().datetime().optional(),
  resolvedAt: z.string().datetime().optional(),
});

export const CsoAlertSocketMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cso.alert.created"),
    payload: CsoEscalationAlertSchema,
  }),
  z.object({
    type: z.literal("cso.alert.updated"),
    payload: CsoEscalationAlertSchema,
  }),
]);

export type CsoAlertStatus = z.infer<typeof CsoAlertStatusSchema>;
export type CsoEscalationAlert = z.infer<typeof CsoEscalationAlertSchema>;
export type CsoAlertSocketMessage = z.infer<typeof CsoAlertSocketMessageSchema>;

export const validateCsoEscalationAlert = (value: unknown) =>
  validateContract(CsoEscalationAlertSchema, value);

export const validateCsoAlertSocketMessage = (value: unknown) =>
  validateContract(CsoAlertSocketMessageSchema, value);
