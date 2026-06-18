import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { ApiResponse } from "../../shared/types/index.js";
import { getIntegrationConfig } from "../../config/integration.js";
import { getAiProvider } from "../ai/providers/index.js";
import { handleChatMessage } from "./service.js";
import { getSession } from "./repository.js";

const router = Router();

const messageSchema = z.object({
  sessionId: z.string().min(1).optional(),
  channel: z.enum(["web_cpf", "app_cpf", "telegram", "whatsapp"]).default("web_cpf"),
  channelUserId: z.string().min(1).optional(),
  memberId: z.string().min(1).optional(),
  displayName: z.string().min(1).max(120).optional(),
  message: z.string().min(1).max(4000),
});

router.get("/health", (_req: Request, res: Response) => {
  const config = getIntegrationConfig();
  const provider = getAiProvider();
  res.json({
    status: "ok",
    service: "chatbot",
    aiProvider: config.aiProvider,
    aiReady: provider.isReady(),
    messagingChannel: config.messagingChannel,
  });
});

router.post("/message", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_chat_request", message: "message is required" } });
    return;
  }
  try {
    const result = await handleChatMessage(parsed.data);
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: { code: "chatbot_error", message: (error as Error).message } });
  }
});

router.get("/session/:sessionId", async (req: Request, res: Response<ApiResponse>) => {
  const session = await getSession(req.params.sessionId ?? "");
  if (!session) {
    res.status(404).json({ error: { code: "session_not_found", message: "Chat session not found" } });
    return;
  }
  res.json({ data: session });
});

export { router as chatbotRoutes };
