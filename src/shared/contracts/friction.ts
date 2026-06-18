import { z } from "zod";
import { validateContract } from "./validation.js";
import { PageKeySchema } from "./ui-profile.js";
import { TelemetryEventTypeSchema } from "./telemetry.js";

export const FRICTION_SCHEMA_VERSION = "1.0" as const;

export const FrictionSeveritySchema = z.enum(["low", "medium", "high", "critical"]);

export const ObservedSignalSchema = z.object({
  schemaVersion: z.literal(FRICTION_SCHEMA_VERSION),
  eventType: TelemetryEventTypeSchema,
  value: z.union([z.string(), z.number(), z.boolean()]),
  unit: z.string().min(1).optional(),
  observedAt: z.string().datetime().optional(),
});

export const FrictionEventSchema = z.object({
  schemaVersion: z.literal(FRICTION_SCHEMA_VERSION),
  frictionEventId: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  pageKey: PageKeySchema,
  ruleId: z.string().min(1),
  severity: FrictionSeveritySchema,
  confidence: z.number().min(0).max(1),
  observedSignals: z.array(ObservedSignalSchema).min(1),
  createdAt: z.string().datetime(),
});

export type FrictionSeverity = z.infer<typeof FrictionSeveritySchema>;
export type ObservedSignal = z.infer<typeof ObservedSignalSchema>;
export type FrictionEvent = z.infer<typeof FrictionEventSchema>;

export const validateObservedSignal = (value: unknown) =>
  validateContract(ObservedSignalSchema, value);

export const validateFrictionEvent = (value: unknown) =>
  validateContract(FrictionEventSchema, value);
