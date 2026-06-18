import { z } from "zod";
import { knownEventTypes, knownPageKeys } from "./catalog.js";
import { getActiveSession, updateSessionPage } from "./sessions.js";
import { store } from "./store.js";
import type { PageKey, TelemetryEvent, ValidationResult } from "./types.js";

const telemetryEventSchema = z.object({
  eventId: z.string().min(1),
  schemaVersion: z.literal("1.0"),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  pageKey: z.enum(knownPageKeys),
  eventType: z.enum(knownEventTypes),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

const MAX_METADATA_BYTES = 4 * 1024;

export function validateTelemetryEvent(input: unknown): ValidationResult<TelemetryEvent> {
  const parsed = telemetryEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => issue.message) };
  }

  const event = parsed.data;
  const activeSession = getActiveSession(event.sessionId);
  const errors: string[] = [];

  if (!activeSession) {
    errors.push("session ID is not active");
  } else if (activeSession.userId !== event.userId) {
    errors.push("user ID does not match session owner");
  }

  if (event.metadata && Buffer.byteLength(JSON.stringify(event.metadata), "utf8") > MAX_METADATA_BYTES) {
    errors.push("metadata payload exceeds maximum size");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: event };
}

export function persistTelemetryEvent(event: TelemetryEvent): TelemetryEvent {
  store.telemetryEvents.push(event);
  updateSessionPage(event.sessionId, event.pageKey);
  return event;
}

export function ingestTelemetryEvent(input: unknown): ValidationResult<TelemetryEvent> {
  const validation = validateTelemetryEvent(input);
  if (!validation.ok) {
    return validation;
  }

  return { ok: true, value: persistTelemetryEvent(validation.value) };
}

export function recordPageChange(sessionId: string, pageKey: PageKey): ValidationResult<{ sessionId: string; pageKey: PageKey }> {
  const session = updateSessionPage(sessionId, pageKey);
  if (!session) {
    return { ok: false, errors: ["session ID is not active"] };
  }

  return { ok: true, value: { sessionId, pageKey } };
}

export function getRecentTelemetry(sessionId: string, limit = 20): TelemetryEvent[] {
  return store.telemetryEvents
    .filter((event) => event.sessionId === sessionId)
    .slice(-limit);
}
