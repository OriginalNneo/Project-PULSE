import { Router, type Request, type Response } from "express";
import type { ApiResponse } from "../../shared/types/index.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "billing" });
});

router.get("/usage", async (req: Request, res: Response<ApiResponse>) => {
  const auth = req.auth!;

  res.json({
    data: {
      tenantId: auth.tenantId,
      period: new Date().toISOString().slice(0, 7),
      correspondenceSent: 0,
      voiceAssistMinutes: 0,
      physicalMailSent: 0,
    },
  });
});

export { router as billingRoutes };
