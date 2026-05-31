import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { ApiResponse } from "../../shared/types/index.js";
import { isLlmConfigured, llmModel } from "../ai/llmClient.js";
import { answerQuestion } from "./service.js";

const router = Router();

const chatSchema = z.object({
  question: z.string().min(1).max(2000),
  userId: z.string().min(1).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "copilot", llmConfigured: isLlmConfigured(), model: llmModel() });
});

router.post("/chat", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_chat_request", message: "question is required" } });
    return;
  }

  try {
    const result = await answerQuestion(parsed.data);
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: { code: "copilot_error", message: (error as Error).message } });
  }
});

export { router as copilotRoutes };
