import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { ApiResponse } from "../../shared/types/index.js";
import { simulateSingpassLogin, getUserById } from "./auth.js";
import { listCsoAlerts, projectCsoAlert } from "./csoAlerts.js";
import { detectFrictionForEvent } from "./friction.js";
import { buildHermesPayload, requestHermesDecision } from "./hermesStub.js";
import { resolveUiProfile } from "./profiles.js";
import { endSession, getActiveSession } from "./sessions.js";
import { resetAdaptiveLocalStore, store } from "./store.js";
import { ingestTelemetryEvent, recordPageChange } from "./telemetry.js";
import type { CsoAlert, FrictionEvent } from "./types.js";

const router = Router();

const loginSchema = z.object({
  singpassSubject: z.string().min(1),
});

const logoutSchema = z.object({
  sessionId: z.string().min(1),
});

const pageChangeSchema = z.object({
  sessionId: z.string().min(1),
  pageKey: z.enum([
    "home",
    "check_medisave_balance",
    "retirement_payout_planner",
    "update_contact_details",
    "nomination_status",
    "transaction_review",
  ]),
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "adaptive-local",
    mode: "in-memory-dev-only",
    hermes: "stubbed",
  });
});

router.post("/auth/singpass/simulate", (req: Request, res: Response<ApiResponse>) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_login_request", message: "singpassSubject is required" } });
    return;
  }

  res.json({ data: simulateSingpassLogin(parsed.data.singpassSubject) });
});

router.post("/auth/logout", (req: Request, res: Response<ApiResponse>) => {
  const parsed = logoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_logout_request", message: "sessionId is required" } });
    return;
  }

  res.json({ data: { ended: endSession(parsed.data.sessionId) } });
});

router.get("/me", (req: Request, res: Response<ApiResponse>) => {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(400).json({ error: { code: "missing_session_id", message: "Provide x-session-id or sessionId" } });
    return;
  }

  const session = getActiveSession(sessionId);
  if (!session) {
    res.status(404).json({ error: { code: "session_not_found", message: "No active session found" } });
    return;
  }

  const user = getUserById(session.userId);
  if (!user) {
    res.status(404).json({ error: { code: "user_not_found", message: "Session user was not found" } });
    return;
  }

  const { singpassSubject: _subject, ...safeUser } = user;
  res.json({
    data: {
      user: safeUser,
      session,
      uiProfile: resolveUiProfile(user),
    },
  });
});

router.get("/ui-profile/:userId", (req: Request, res: Response<ApiResponse>) => {
  const userId = req.params.userId;
  if (!userId) {
    res.status(400).json({ error: { code: "missing_user_id", message: "userId route parameter is required" } });
    return;
  }

  const user = getUserById(userId);
  if (!user) {
    res.status(404).json({ error: { code: "user_not_found", message: "User was not found" } });
    return;
  }

  res.json({ data: resolveUiProfile(user) });
});

router.post("/telemetry/events", (req: Request, res: Response<ApiResponse>) => {
  const result = ingestTelemetryEvent(req.body);
  if (!result.ok) {
    res.status(400).json({ error: { code: "invalid_telemetry_event", message: result.errors.join("; ") } });
    return;
  }

  const frictionEvents = detectFrictionForEvent(result.value);
  const alerts = frictionEvents
    .map((frictionEvent) => projectCsoAlert(frictionEvent))
    .filter((alert): alert is CsoAlert => alert !== undefined);

  res.status(202).json({
    data: {
      event: result.value,
      frictionEvents,
      alerts,
    },
  });
});

router.post("/telemetry/page", (req: Request, res: Response<ApiResponse>) => {
  const parsed = pageChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_page_change", message: "sessionId and known pageKey are required" } });
    return;
  }

  const result = recordPageChange(parsed.data.sessionId, parsed.data.pageKey);
  if (!result.ok) {
    res.status(400).json({ error: { code: "page_change_rejected", message: result.errors.join("; ") } });
    return;
  }

  res.json({ data: result.value });
});

router.get("/friction/events", (_req: Request, res: Response<ApiResponse<FrictionEvent[]>>) => {
  res.json({ data: store.frictionEvents });
});

router.post("/friction/events/:frictionEventId/project-alert", (req: Request, res: Response<ApiResponse>) => {
  const frictionEventId = req.params.frictionEventId;
  if (!frictionEventId) {
    res.status(400).json({ error: { code: "missing_friction_event_id", message: "frictionEventId route parameter is required" } });
    return;
  }

  const frictionEvent = store.frictionEvents.find((candidate) => candidate.frictionEventId === frictionEventId);
  if (!frictionEvent) {
    res.status(404).json({ error: { code: "friction_event_not_found", message: "Friction event was not found" } });
    return;
  }

  const alert = projectCsoAlert(frictionEvent);
  res.json({ data: { alert, deduped: alert === undefined } });
});

router.get("/hermes/preview/:frictionEventId", (req: Request, res: Response<ApiResponse>) => {
  const frictionEventId = req.params.frictionEventId;
  if (!frictionEventId) {
    res.status(400).json({ error: { code: "missing_friction_event_id", message: "frictionEventId route parameter is required" } });
    return;
  }

  const frictionEvent = store.frictionEvents.find((candidate) => candidate.frictionEventId === frictionEventId);
  if (!frictionEvent) {
    res.status(404).json({ error: { code: "friction_event_not_found", message: "Friction event was not found" } });
    return;
  }

  const user = getUserById(frictionEvent.userId);
  const session = getActiveSession(frictionEvent.sessionId);
  if (!user || !session) {
    res.status(404).json({ error: { code: "context_not_found", message: "User or active session was not found" } });
    return;
  }

  const payload = buildHermesPayload(user, session, frictionEvent);
  res.json({
    data: {
      payload,
      decision: requestHermesDecision(payload),
    },
  });
});

router.get("/cso/alerts", (_req: Request, res: Response<ApiResponse<CsoAlert[]>>) => {
  res.json({ data: listCsoAlerts() });
});

router.post("/dev/reset", (_req: Request, res: Response<ApiResponse>) => {
  resetAdaptiveLocalStore();
  res.json({ data: { reset: true } });
});

function getSessionId(req: Request): string | undefined {
  const headerValue = req.header("x-session-id");
  if (headerValue) {
    return headerValue;
  }

  const queryValue = req.query.sessionId;
  return typeof queryValue === "string" ? queryValue : undefined;
}

export { router as adaptiveLocalRoutes };
