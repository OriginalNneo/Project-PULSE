import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { ValidationError } from "../../shared/errors.js";
import type { ApiResponse } from "../../shared/types/index.js";
import { handleUserMessage } from "./agent.js";
import { registry } from "./registry.js";

const router = Router();

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "agent"]),
    content: z.string(),
    timestamp: z.string().optional(),
  })).default([]),
  language: z.enum(["en", "zh", "ms", "ta"]).optional(),
  dialect: z.enum([
    "zh-hok", "zh-can", "zh-teo", "zh-hak", "zh-hai",
    "ms-bms", "ms-joh", "ms-boy", "ms-jav",
    "ta-sin", "ta-spo", "ml", "pa", "hi",
  ]).optional(),
});

router.post("/chat", async (req: Request, res: Response<ApiResponse>) => {
  const auth = req.auth;
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError("Invalid request body", { issues: parsed.error.issues });
  }

  const { message, conversationHistory, language, dialect } = parsed.data;

  const messages = [
    ...conversationHistory.map((m) => ({
      ...m,
      timestamp: m.timestamp ?? new Date().toISOString(),
    })),
    { role: "user" as const, content: message, timestamp: new Date().toISOString() },
  ];

  const response = await handleUserMessage(messages, {
    userId: auth?.userId ?? "anonymous",
    tenantId: auth?.tenantId ?? "default",
    vulnerabilityTier: auth?.vulnerabilityTier ?? "self-service",
    language,
    dialect,
  });

  res.json({
    data: {
      response: response.content,
      agentName: response.agentName,
      confidence: response.confidence,
      requiresHumanReview: response.requiresHumanReview,
    },
  });
});

router.get("/registry", (_req: Request, res: Response<ApiResponse>) => {
  const agents = registry.getAll();
  res.json({
    data: agents.map((a) => ({
      name: a.name,
      type: a.type,
      version: a.version,
      description: a.description,
      capabilities: a.capabilities,
    })),
  });
});

router.get("/registry/:name", (req: Request, res: Response<ApiResponse>) => {
  const agent = registry.get(req.params.name);
  if (!agent) {
    res.status(404).json({ error: { code: "AGENT.NOT_FOUND", message: `Agent ${req.params.name} not found` } });
    return;
  }
  res.json({ data: agent });
});

export { router as agentRoutes };
