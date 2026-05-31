import { transactionalPageKeys } from "./catalog.js";
import { getUserById } from "./auth.js";
import { store, nextId } from "./store.js";
import type { FrictionEvent, ObservedSignal, PageKey, TelemetryEvent } from "./types.js";

const TWENTY_SECONDS_MS = 20 * 1000;
const NINETY_SECONDS_MS = 90 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;

export function detectFrictionForEvent(event: TelemetryEvent): FrictionEvent[] {
  const detected = [
    detectIdleVulnerableUser(event),
    detectRepeatedFailedClick(event),
    detectFormErrorLoop(event),
    detectBacktrackConfusion(event),
  ].filter((frictionEvent): frictionEvent is FrictionEvent => frictionEvent !== undefined);

  store.frictionEvents.push(...detected);
  return detected;
}

function detectIdleVulnerableUser(event: TelemetryEvent): FrictionEvent | undefined {
  const idleMs = Number(event.metadata?.idleMs ?? 0);
  const user = getUserById(event.userId);

  if (
    event.eventType !== "idle_tick"
    || idleMs < 45_000
    || !transactionalPageKeys.has(event.pageKey)
    || !user
    || user.vulnerabilityMarkers.length === 0
  ) {
    return undefined;
  }

  return createFrictionEvent(event, "idle_vulnerable_user_45s", "medium", 0.82, [
    { eventType: "idle_tick", value: idleMs, unit: "ms" },
  ]);
}

function detectRepeatedFailedClick(event: TelemetryEvent): FrictionEvent | undefined {
  if (event.eventType !== "click_attempt" || event.metadata?.targetInteractive !== false) {
    return undefined;
  }

  const recentFailedClicks = eventsWithin(event, TWENTY_SECONDS_MS).filter(
    (candidate) => candidate.eventType === "click_attempt" && candidate.metadata?.targetInteractive === false,
  );

  if (recentFailedClicks.length < 3) {
    return undefined;
  }

  return createFrictionEvent(event, "repeated_failed_click_3_in_20s", "medium", 0.76, [
    { eventType: "click_attempt", value: recentFailedClicks.length, unit: "count" },
  ]);
}

function detectFormErrorLoop(event: TelemetryEvent): FrictionEvent | undefined {
  if (event.eventType !== "form_error") {
    return undefined;
  }

  const fieldKey = event.metadata?.fieldKey;
  if (typeof fieldKey !== "string" || fieldKey.length === 0) {
    return undefined;
  }

  const matchingErrors = eventsWithin(event, NINETY_SECONDS_MS).filter(
    (candidate) => candidate.eventType === "form_error" && candidate.metadata?.fieldKey === fieldKey,
  );

  if (matchingErrors.length < 3) {
    return undefined;
  }

  return createFrictionEvent(event, "form_error_loop_3_in_90s", "high", 0.88, [
    { eventType: "form_error", value: fieldKey, unit: "field_key" },
    { eventType: "form_error", value: matchingErrors.length, unit: "count" },
  ]);
}

function detectBacktrackConfusion(event: TelemetryEvent): FrictionEvent | undefined {
  if (event.eventType !== "backtrack") {
    return undefined;
  }

  const fromPageKey = event.metadata?.fromPageKey;
  const toPageKey = event.metadata?.toPageKey;
  if (!isPageKey(fromPageKey) || !isPageKey(toPageKey)) {
    return undefined;
  }

  const matchingBacktracks = eventsWithin(event, TWO_MINUTES_MS).filter((candidate) => {
    const candidateFrom = candidate.metadata?.fromPageKey;
    const candidateTo = candidate.metadata?.toPageKey;
    return candidate.eventType === "backtrack"
      && ((candidateFrom === fromPageKey && candidateTo === toPageKey)
        || (candidateFrom === toPageKey && candidateTo === fromPageKey));
  });

  if (matchingBacktracks.length < 3) {
    return undefined;
  }

  return createFrictionEvent(event, "backtrack_confusion_3_in_2m", "medium", 0.73, [
    { eventType: "backtrack", value: `${fromPageKey}<->${toPageKey}`, unit: "page_pair" },
    { eventType: "backtrack", value: matchingBacktracks.length, unit: "count" },
  ]);
}

function createFrictionEvent(
  sourceEvent: TelemetryEvent,
  ruleId: string,
  severity: FrictionEvent["severity"],
  confidence: number,
  observedSignals: ObservedSignal[],
): FrictionEvent {
  return {
    frictionEventId: nextId("fric"),
    sessionId: sourceEvent.sessionId,
    userId: sourceEvent.userId,
    pageKey: sourceEvent.pageKey,
    ruleId,
    severity,
    confidence,
    observedSignals,
    createdAt: new Date().toISOString(),
  };
}

function eventsWithin(event: TelemetryEvent, windowMs: number): TelemetryEvent[] {
  const eventTime = Date.parse(event.timestamp);
  const minTime = eventTime - windowMs;

  return store.telemetryEvents.filter((candidate) => (
    candidate.sessionId === event.sessionId
    && candidate.pageKey === event.pageKey
    && Date.parse(candidate.timestamp) >= minTime
    && Date.parse(candidate.timestamp) <= eventTime
  ));
}

function isPageKey(value: unknown): value is PageKey {
  return typeof value === "string" && transactionalPageKeys.has(value as PageKey);
}
