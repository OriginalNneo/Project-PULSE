import { pageTasks } from "./catalog.js";
import { getRecentTelemetry } from "./telemetry.js";
import { resolveUiProfile } from "./profiles.js";
import type { AdaptiveUserProfile, FrictionEvent, HermesDecision, HermesPayload, MemberSession } from "./types.js";

export function buildHermesPayload(
  user: AdaptiveUserProfile,
  session: MemberSession,
  frictionEvent: FrictionEvent,
): HermesPayload {
  const uiProfile = resolveUiProfile(user);
  const recentEvents = getRecentTelemetry(session.id, 5);

  return {
    requestId: `ai_req_${frictionEvent.frictionEventId}`,
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    userContext: {
      userId: user.id,
      ageBracket: user.ageBracket,
      vulnerabilityMarkers: user.vulnerabilityMarkers,
      uiMode: uiProfile.mode,
    },
    sessionContext: {
      sessionId: session.id,
      currentPageKey: session.currentPageKey,
      currentTask: pageTasks[session.currentPageKey],
      sessionStartedAt: session.startedAt,
    },
    frictionContext: {
      frictionEventId: frictionEvent.frictionEventId,
      severity: frictionEvent.severity,
      ruleId: frictionEvent.ruleId,
      signals: frictionEvent.observedSignals.map((signal) => ({
        type: signal.eventType,
        value: signal.value,
        unit: signal.unit,
      })),
      recentEventsSummary: summarizeRecentEvents(recentEvents),
    },
    routingPolicy: {
      allowChatbot: frictionEvent.severity === "low",
      allowHumanEscalation: !user.assistedInterventionOptOut,
      preferredIntervention: user.assistedInterventionOptOut ? "self_serve" : "cso_live_assist",
    },
  };
}

export function requestHermesDecision(payload: HermesPayload): HermesDecision {
  const shouldEscalate = payload.routingPolicy.allowHumanEscalation
    && (payload.frictionContext.severity === "high" || payload.userContext.vulnerabilityMarkers.length > 0);

  const priority: HermesDecision["priority"] = payload.frictionContext.severity === "high"
    ? "high"
    : shouldEscalate ? "medium" : "normal";

  return {
    decisionId: `decision_${payload.requestId}`,
    recommendedAction: shouldEscalate ? "escalate_to_cso" : "offer_chatbot",
    priority,
    chatbotBypass: shouldEscalate,
    summaryForOfficer: buildOfficerSummary(payload),
    suggestedOpening: `Hello, I can see you may be trying to ${payload.sessionContext.currentTask.toLowerCase()}. Would you like me to guide you through that step?`,
    riskFlags: buildRiskFlags(payload),
  };
}

function summarizeRecentEvents(events: Array<{ eventType: string; pageKey: string; metadata?: Record<string, unknown> }>): string[] {
  if (events.length === 0) {
    return ["No recent telemetry was available for this session."];
  }

  return events.map((event) => {
    if (event.eventType === "idle_tick" && typeof event.metadata?.idleMs === "number") {
      return `User remained idle on ${event.pageKey} for ${event.metadata.idleMs} ms.`;
    }

    return `User produced ${event.eventType} on ${event.pageKey}.`;
  });
}

function buildOfficerSummary(payload: HermesPayload): string {
  const seconds = payload.frictionContext.signals.find((signal) => signal.unit === "ms");
  const durationText = seconds && typeof seconds.value === "number"
    ? ` after ${Math.round(seconds.value / 1000)} seconds`
    : "";

  return `User may be stuck on ${payload.sessionContext.currentTask}${durationText}. UI mode is ${payload.userContext.uiMode}; rule ${payload.frictionContext.ruleId} triggered with ${payload.frictionContext.severity} severity.`;
}

function buildRiskFlags(payload: HermesPayload): string[] {
  const flags = [payload.frictionContext.ruleId];
  if (payload.userContext.vulnerabilityMarkers.length > 0) {
    flags.push("vulnerable_user_marker");
  }
  if (payload.routingPolicy.allowHumanEscalation) {
    flags.push("human_escalation_allowed");
  }
  return flags;
}
