import { Router, type Request, type Response } from "express";
import type { ApiResponse } from "../../shared/types/index.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "delivery" });
});

router.post("/dispatch", async (req: Request, res: Response<ApiResponse>) => {
  const { correspondenceId, channels, userId } = req.body as Record<string, unknown>;

  res.json({
    data: {
      correspondenceId,
      dispatchResults: (channels as string[])?.map((ch) => ({
        channel: ch,
        status: "queued",
        trackingId: `track-${Date.now()}`,
      })) ?? [],
    },
  });
});

export { router as deliveryRoutes };
