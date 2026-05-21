import { Router, type Request, type Response } from "express";
import type { ApiResponse } from "../../shared/types/index.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "adaptation" });
});

router.post("/adapt", async (req: Request, res: Response<ApiResponse>) => {
  const { content, language, vulnerabilityTier } = req.body as Record<string, unknown>;

  res.json({
    data: {
      adaptedContent: content,
      language,
      readabilityScore: 75,
    },
  });
});

export { router as adaptationRoutes };
