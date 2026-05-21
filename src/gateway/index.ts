import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
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
import { agentRoutes } from "../agents/orchestrator/routes.js";

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
app.use(requestId);
app.use(attachTraceContext);

app.get("/health/live", (_req, res) => {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
});

app.get("/health/ready", (_req, res) => {
  res.json({ status: "ready", timestamp: new Date().toISOString() });
});

app.use(rateLimiter);

app.use("/api/v1/correspondence", requireAuth, correspondenceRoutes);
app.use("/api/v1/vulnerability", requireAuth, vulnerabilityRoutes);
app.use("/api/v1/orchestration", requireAuth, orchestrationRoutes);
app.use("/api/v1/adaptation", requireAuth, adaptationRoutes);
app.use("/api/v1/delivery", requireAuth, deliveryRoutes);
app.use("/api/v1/notification", requireAuth, notificationRoutes);
app.use("/api/v1/proxy", requireAuth, proxyRoutes);
app.use("/api/v1/analytics", requireAuth, analyticsRoutes);
app.use("/api/v1/billing", requireAuth, billingRoutes);

app.use("/api/v1/agents", agentRoutes);

app.use(errorHandler);

const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.listen(PORT, () => {
  log.info({ port: PORT, env: process.env.NODE_ENV }, "PULSE Gateway started");
});

export { app };
