import { Router, type Request, type Response } from "express";
import type { ApiResponse } from "../../shared/types/index.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "orchestration" });
});

router.post("/route", async (req: Request, res: Response<ApiResponse>) => {
  const { correspondenceId, userId, category, urgency, channels } = req.body as Record<string, unknown>;

  res.json({
    data: {
      correspondenceId,
      routingDecision: {
        channels: channels ?? ["in-app"],
        priority: urgency === "critical" ? "immediate" : "normal",
        estimatedDelivery: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  });
});

export { router as orchestrationRoutes };
