import { pageTasks } from "./catalog.js";
import { getUserById } from "./auth.js";
import { getActiveSession } from "./sessions.js";
import { buildHermesPayload, requestHermesDecision } from "./hermesStub.js";
import { resolveUiProfile } from "./profiles.js";
import { nextId, store } from "./store.js";
import type { CsoAlert, FrictionEvent } from "./types.js";

const DEDUPE_TTL_MS = 10 * 60 * 1000;

export function projectCsoAlert(frictionEvent: FrictionEvent): CsoAlert | undefined {
  const user = getUserById(frictionEvent.userId);
  const session = getActiveSession(frictionEvent.sessionId);
  if (!user || !session || isDedupeSuppressed(frictionEvent)) {
    return undefined;
  }

  const payload = buildHermesPayload(user, session, frictionEvent);
  const decision = requestHermesDecision(payload);
  if (decision.recommendedAction !== "escalate_to_cso") {
    return undefined;
  }

  const uiProfile = resolveUiProfile(user);
  const alert: CsoAlert = {
    alertId: nextId("alert"),
    status: "open",
    priority: decision.priority,
    createdAt: new Date().toISOString(),
    sessionId: session.id,
    userId: user.id,
    displayName: user.displayName,
    uiMode: uiProfile.mode,
    currentPageKey: frictionEvent.pageKey,
    currentTask: pageTasks[frictionEvent.pageKey],
    ruleId: frictionEvent.ruleId,
    severity: frictionEvent.severity,
    summaryForOfficer: decision.summaryForOfficer,
    suggestedOpening: decision.suggestedOpening,
    observedSignals: frictionEvent.observedSignals,
    riskFlags: decision.riskFlags,
  };

  store.alerts.push(alert);
  markDedupe(frictionEvent);
  return alert;
}

export function listCsoAlerts(): CsoAlert[] {
  return [...store.alerts].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function isDedupeSuppressed(frictionEvent: FrictionEvent): boolean {
  const expiresAt = store.escalationDedupe.get(dedupeKey(frictionEvent));
  return typeof expiresAt === "number" && expiresAt > Date.now();
}

function markDedupe(frictionEvent: FrictionEvent): void {
  store.escalationDedupe.set(dedupeKey(frictionEvent), Date.now() + DEDUPE_TTL_MS);
}

function dedupeKey(frictionEvent: FrictionEvent): string {
  return `escalation:dedupe:${frictionEvent.sessionId}:${frictionEvent.pageKey}`;
}
