import { z } from "zod";
import { validateContract } from "./validation.js";
import { PageKeySchema } from "./ui-profile.js";

export const TELEMETRY_SCHEMA_VERSION = "1.0" as const;

export const TelemetryEventTypeSchema = z.enum([
  "page_view",
  "heartbeat",
  "idle_tick",
  "click_attempt",
  "repeated_click",
  "rage_click",
  "backtrack",
  "form_error",
  "assistance_hover",
  "assistance_click",
  "navigation_abandon",
]);

export const TelemetryMetadataSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]),
).default({});

export const TelemetryEventSchema = z.object({
  schemaVersion: z.literal(TELEMETRY_SCHEMA_VERSION),
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  pageKey: PageKeySchema,
  eventType: TelemetryEventTypeSchema,
  timestamp: z.string().datetime(),
  metadata: TelemetryMetadataSchema,
});

export const SessionPageChangedPayloadSchema = z.object({
  schemaVersion: z.literal(TELEMETRY_SCHEMA_VERSION),
  sessionId: z.string().min(1),
  pageKey: PageKeySchema,
  timestamp: z.string().datetime(),
});

export const MemberSocketMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("telemetry.event"),
    payload: TelemetryEventSchema,
  }),
  z.object({
    type: z.literal("session.page_changed"),
    payload: SessionPageChangedPayloadSchema,
  }),
  z.object({
    type: z.literal("session.heartbeat"),
    payload: SessionPageChangedPayloadSchema,
  }),
]);

export type TelemetryEventType = z.infer<typeof TelemetryEventTypeSchema>;
export type TelemetryMetadata = z.infer<typeof TelemetryMetadataSchema>;
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
export type SessionPageChangedPayload = z.infer<typeof SessionPageChangedPayloadSchema>;
export type MemberSocketMessage = z.infer<typeof MemberSocketMessageSchema>;

export const validateTelemetryEvent = (value: unknown) =>
  validateContract(TelemetryEventSchema, value);

export const validateMemberSocketMessage = (value: unknown) =>
  validateContract(MemberSocketMessageSchema, value);
