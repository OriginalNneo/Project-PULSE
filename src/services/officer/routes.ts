import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { ApiResponse } from "../../shared/types/index.js";
import {
  acknowledge,
  closeSession,
  getConversation,
  getDashboard,
  officerReply,
} from "./service.js";

const router = Router();

const replySchema = z.object({
  officer: z.string().min(1).max(120).default("CCU Officer"),
  message: z.string().min(1).max(4000),
});

const actorSchema = z.object({
  officer: z.string().min(1).max(120).default("CCU Officer"),
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "officer" });
});

/** Whole dashboard payload — stats + open/inactive chats + incoming rail. */
router.get("/dashboard", async (_req: Request, res: Response<ApiResponse>) => {
  try {
    res.json({ data: await getDashboard() });
  } catch (error) {
    res.status(500).json({ error: { code: "dashboard_error", message: (error as Error).message } });
  }
});

/** Full conversation + escalation context for one chat. */
router.get("/conversation/:sessionId", async (req: Request, res: Response<ApiResponse>) => {
  const conversation = await getConversation(req.params.sessionId ?? "");
  if (!conversation) {
    res.status(404).json({ error: { code: "session_not_found", message: "Chat not found" } });
    return;
  }
  res.json({ data: conversation });
});

/** Officer sends a reply to the citizen. */
router.post("/conversation/:sessionId/reply", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_reply", message: "message is required" } });
    return;
  }
  const result = await officerReply(req.params.sessionId ?? "", parsed.data.officer, parsed.data.message);
  if (!result.ok) {
    res.status(404).json({ error: { code: result.error ?? "reply_failed", message: "Could not send reply" } });
    return;
  }
  res.json({ data: result });
});

/** Officer acknowledges an incoming escalation (picks it up). */
router.post("/escalations/:escalationId/acknowledge", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = actorSchema.safeParse(req.body ?? {});
  const officer = parsed.success ? parsed.data.officer : "CCU Officer";
  const escalation = await acknowledge(req.params.escalationId ?? "", officer);
  if (!escalation) {
    res.status(404).json({ error: { code: "escalation_not_found", message: "Escalation not found" } });
    return;
  }
  res.json({ data: escalation });
});

/** Officer closes a chat session (resolves the escalation). */
router.post("/conversation/:sessionId/close", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = actorSchema.safeParse(req.body ?? {});
  const officer = parsed.success ? parsed.data.officer : "CCU Officer";
  const session = await closeSession(req.params.sessionId ?? "", officer);
  if (!session) {
    res.status(404).json({ error: { code: "session_not_found", message: "Chat not found" } });
    return;
  }
  res.json({ data: { closed: true, sessionId: session.sessionId } });
});

export { router as officerRoutes };
