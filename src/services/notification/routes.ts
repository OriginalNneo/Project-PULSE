import { Router, type Request, type Response } from "express";
import type { ApiResponse } from "../../shared/types/index.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "notification" });
});

router.post("/send", async (req: Request, res: Response<ApiResponse>) => {
  const { userId, channel, message } = req.body as Record<string, unknown>;

  res.json({
    data: { sent: true, channel, userId },
  });
});

export { router as notificationRoutes };
