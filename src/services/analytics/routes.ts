import { Router, type Request, type Response } from "express";
import type { ApiResponse } from "../../shared/types/index.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "analytics" });
});

router.get("/engagement", async (req: Request, res: Response<ApiResponse>) => {
  res.json({
    data: {
      totalCorrespondence: 0,
      viewedRate: 0,
      actionCompletionRate: 0,
      avgTimeToAction: 0,
      dropOffPoints: [],
    },
  });
});

export { router as analyticsRoutes };
