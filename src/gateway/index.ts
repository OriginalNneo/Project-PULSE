import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { attachWebSocket } from "./ws.js";
import { startQueueRefreshTimer } from "../dashboard/queue.js";
import { webhookRoutes } from "./webhook.js";
import { dashboardRoutes } from "./dashboard.js";
import { requireAuth, rateLimiter, errorHandler, requestId, attachTraceContext } from "../shared/middleware/index.js";
import { createServiceLogger } from "../shared/logger.js";
import { correspondenceRoutes } from "../services/correspondence/routes.js";
import { vulnerabilityRoutes } from "../services/vulnerability/routes.js";
import { orchestrationRoutes } from "../services/orchestration/routes.js";
import { adaptationRoutes } from "../services/adaptation/routes.js";
import { deliveryRoutes } from "../services/delivery/routes.js";
import { notificationRoutes } from "../services/notification/routes.js";
import { proxyRoutes } from "../services/proxy/routes.js";
import { analyticsRoutes } from "../services/analytics/routes.js";
import { billingRoutes } from "../services/billing/routes.js";
<<<<<<< HEAD
import { runMainAgent } from "../agents/main/agent.js";
import { z } from "zod";
import { ValidationError } from "../shared/errors.js";
import type { ApiResponse } from "../shared/types/index.js";
import type { Request, Response } from "express";
=======
import { adaptiveLocalRoutes } from "../services/adaptive-local/index.js";
import { consoleRoutes } from "../services/console/routes.js";
import { copilotRoutes } from "../services/copilot/routes.js";
import { agentRoutes } from "../agents/orchestrator/routes.js";
import { chatbotRoutes } from "../services/chatbot/routes.js";
import { messagingRoutes } from "../services/messaging/routes.js";
import { officerRoutes } from "../services/officer/routes.js";
import { startMessaging } from "../services/messaging/index.js";
import { handleInboundMessage } from "../services/messaging/inbound.js";
>>>>>>> bbbcd6a0ad6287fddd6d91b59aed624801f9dbff

dotenv.config();

const log = createServiceLogger("gateway");
const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestId);
app.use(attachTraceContext);

app.get("/", (_req, res) => {
  res.json({
    name: "PULSE Gateway",
    version: "0.1.0",
    status: "running",
    endpoints: {
      health: { live: "GET /health/live", ready: "GET /health/ready" },
      agents: { query: "POST /query", transcribe: "POST /transcribe", translate: "POST /translate", detect: "POST /detect" },
      api: {
        correspondence: "GET|POST /api/v1/correspondence",
        vulnerability:  "GET|POST /api/v1/vulnerability",
        orchestration:  "GET|POST /api/v1/orchestration",
        adaptation:     "GET|POST /api/v1/adaptation",
        delivery:       "GET|POST /api/v1/delivery",
        notification:   "GET|POST /api/v1/notification",
        proxy:          "GET|POST /api/v1/proxy",
        analytics:      "GET|POST /api/v1/analytics",
        billing:        "GET|POST /api/v1/billing",
      },
      dashboard: "GET|POST /dashboard/*",
      webhook:   "POST /webhook",
    },
  });
});

app.get("/health/live", (_req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

app.get("/health/ready", async (_req, res) => {
  const services = [
    { name: "py-transcriber", url: `${process.env.PYTHON_BRIDGE_URL ?? "http://localhost:5001"}/health` },
    { name: "py-translator",  url: `${process.env.TRANSLATOR_URL  ?? "http://localhost:5002"}/health` },
  ];
  const checks = await Promise.all(
    services.map(async ({ name, url }) => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
        return { name, ok: r.ok };
      } catch {
        return { name, ok: false };
      }
    }),
  );
  const allOk = checks.every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ready" : "degraded",
    services: checks,
    timestamp: new Date().toISOString(),
  });
});

app.use(rateLimiter);

app.use("/api/v1/correspondence", requireAuth, correspondenceRoutes);
app.use("/api/v1/vulnerability",  requireAuth, vulnerabilityRoutes);
app.use("/api/v1/orchestration",  requireAuth, orchestrationRoutes);
app.use("/api/v1/adaptation",     requireAuth, adaptationRoutes);
app.use("/api/v1/delivery",       requireAuth, deliveryRoutes);
app.use("/api/v1/notification",   requireAuth, notificationRoutes);
app.use("/api/v1/proxy",          requireAuth, proxyRoutes);
app.use("/api/v1/analytics",      requireAuth, analyticsRoutes);
app.use("/api/v1/billing",        requireAuth, billingRoutes);

<<<<<<< HEAD
// WhatsApp inbound webhook — unauthenticated (Twilio signs requests instead)
app.use("/webhook", webhookRoutes);

// CCU officer dashboard REST endpoints
app.use("/dashboard", requireAuth, dashboardRoutes);

// ── Shared schema building blocks ─────────────────────────────────────────────
const DialectEnum = z.enum([
  "zh-hok", "zh-can", "zh-teo", "zh-hak", "zh-hai",
  "ms-bms", "ms-joh", "ms-boy", "ms-jav",
  "ta-sin", "ta-spo", "ml", "pa", "hi",
]);
const LanguageEnum = z.enum(["en", "zh", "ms", "ta"]);
const ResponseFormatEnum = z.enum(["text", "audio", "both"]);

// ── POST /transcribe — voice → text (main agent → transcriber + translator subagents) ──
const TranscribeSchema = z.object({
  audio: z.string().min(1),
  mimeType: z.string().default("audio/wav"),
  dialect: DialectEnum.optional(),
  language: LanguageEnum.optional(),
  targetLanguage: LanguageEnum.optional(),
  responseFormat: ResponseFormatEnum.default("text"),
});

app.post("/transcribe", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = TranscribeSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Invalid request body", { issues: parsed.error.issues });
  const auth = req.auth;
  const result = await runMainAgent(
    {
      type: "transcribe",
      audioBase64: parsed.data.audio,
      mimeType: parsed.data.mimeType,
      dialect: parsed.data.dialect,
      language: parsed.data.language,
      targetLanguage: parsed.data.targetLanguage,
      responseFormat: parsed.data.responseFormat,
    },
    {
      userId: auth?.userId ?? "anonymous",
      tenantId: auth?.tenantId ?? "default",
      vulnerabilityTier: auth?.vulnerabilityTier ?? "self-service",
    },
  );
  res.json({ data: result });
});

// ── POST /translate — text → translated text (main agent → translator subagent) ──
const TextInputSchema = z.object({
  text: z.string().min(1).max(5000),
  dialect: DialectEnum.optional(),
  language: LanguageEnum.optional(),
  targetLanguage: LanguageEnum.optional(),
  responseFormat: ResponseFormatEnum.default("text"),
});

app.post("/translate", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = TextInputSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Invalid request body", { issues: parsed.error.issues });
  const auth = req.auth;
  const result = await runMainAgent(
    {
      type: "translate",
      text: parsed.data.text,
      dialect: parsed.data.dialect,
      language: parsed.data.language,
      targetLanguage: parsed.data.targetLanguage,
      responseFormat: parsed.data.responseFormat,
    },
    {
      userId: auth?.userId ?? "anonymous",
      tenantId: auth?.tenantId ?? "default",
      vulnerabilityTier: auth?.vulnerabilityTier ?? "self-service",
    },
  );
  res.json({ data: result });
});

// ── POST /detect — text → detected language (main agent → translator subagent, detect-only) ──
app.post("/detect", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = z.object({ text: z.string().min(1).max(5000) }).safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Invalid request body", { issues: parsed.error.issues });
  const auth = req.auth;
  const result = await runMainAgent(
    { type: "detect", text: parsed.data.text },
    {
      userId: auth?.userId ?? "anonymous",
      tenantId: auth?.tenantId ?? "default",
      vulnerabilityTier: auth?.vulnerabilityTier ?? "self-service",
    },
  );
  res.json({ data: { detectedLanguage: result.detectedLanguage } });
});

// ── POST /query — CPF knowledge lookup (main agent → query subagent) ──────────
const QuerySchema = z.object({
  message: z.string().min(1).max(5000),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "agent"]),
      content: z.string(),
      timestamp: z.string().optional(),
    }),
  ).default([]),
  language: LanguageEnum.optional(),
});

app.post("/query", async (req: Request, res: Response<ApiResponse>) => {
  const parsed = QuerySchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Invalid request body", { issues: parsed.error.issues });
  const auth = req.auth;
  const { message, conversationHistory, language } = parsed.data;
  const messages = [
    ...conversationHistory.map((m) => ({ ...m, timestamp: m.timestamp ?? new Date().toISOString() })),
    { role: "user" as const, content: message, timestamp: new Date().toISOString() },
  ];
  const result = await runMainAgent(
    { type: "query", messages, language },
    {
      userId: auth?.userId ?? "anonymous",
      tenantId: auth?.tenantId ?? "default",
      vulnerabilityTier: auth?.vulnerabilityTier ?? "self-service",
    },
  );
  res.json({ data: result });
});
=======
app.use("/api/v1/adaptive-local", adaptiveLocalRoutes);
app.use("/api/v1/console", consoleRoutes);
app.use("/api/v1/copilot", copilotRoutes);
app.use("/api/v1/agents", agentRoutes);
>>>>>>> bbbcd6a0ad6287fddd6d91b59aed624801f9dbff

// Integrated chatbot + escalation messaging + CCU officer console.
app.use("/api/v1/chatbot", chatbotRoutes);
app.use("/api/v1/messaging", messagingRoutes);
app.use("/api/v1/officer", officerRoutes);

app.use(errorHandler);

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const server = http.createServer(app);

attachWebSocket(server);
startQueueRefreshTimer();

server.listen(PORT, () => {
  log.info({ port: PORT, env: process.env.NODE_ENV }, "PULSE Gateway started");

  // Start the active messaging channel (Telegram long-polling in dev). This lets
  // citizens chat with the integrated bot over Telegram and receive officer
  // replies on the same channel. Failures here never take the gateway down.
  startMessaging(handleInboundMessage).catch((error) => {
    log.error({ err: (error as Error).message }, "Failed to start messaging channel");
  });
});

export { app, server };
