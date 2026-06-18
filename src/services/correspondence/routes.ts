import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
<<<<<<< HEAD
import type { ApiResponse, PaginatedResponse, Correspondence } from "../../shared/types/index.js";
import type { AuthenticatedRequest } from "../../shared/types/index.js";
=======
import type { ApiResponse, Correspondence, PaginatedResponse } from "../../shared/types/index.js";
>>>>>>> bbbcd6a0ad6287fddd6d91b59aed624801f9dbff

const router = Router();

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(["tax", "health", "housing", "employment", "legal"]).optional(),
  urgency: z.enum(["normal", "high", "critical"]).optional(),
});

const CreateCorrespondenceSchema = z.object({
  category: z.enum(["tax", "health", "housing", "employment", "legal"]),
  urgency: z.enum(["normal", "high", "critical"]).default("normal"),
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  channels: z.array(z.enum(["physical", "sms", "voice", "email", "in-app"])).min(1),
  language: z.enum(["en", "zh", "ms", "ta"]).default("en"),
});

router.get("/", async (req: Request, res: Response<PaginatedResponse<Correspondence>>) => {
  const auth = req.auth!;
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError("Invalid query parameters", { issues: parsed.error.issues });
  }

  const { page, limit, category, urgency } = parsed.data;

  const items: Correspondence[] = [];
  const total = 0;

  res.json({
    data: items,
    pagination: { page, limit, total },
  });
});

router.get("/:id", async (req: Request, res: Response<ApiResponse<Correspondence>>) => {
  const auth = req.auth!;
  const { id } = req.params;

  const item: Correspondence | null = null;

  if (!item) {
    throw new NotFoundError("Correspondence", id);
  }

  res.json({ data: item });
});

router.post("/", async (req: Request, res: Response<ApiResponse<Correspondence>>) => {
  const auth = req.auth!;
  const parsed = CreateCorrespondenceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError("Invalid request body", { issues: parsed.error.issues });
  }

  const data = parsed.data;

  const item: Correspondence = {
    id: crypto.randomUUID(),
    userId: auth.userId,
    tenantId: auth.tenantId,
    ...data,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({ data: item });
});

router.post("/:id/view", async (req: Request, res: Response<ApiResponse>) => {
  const auth = req.auth!;
  const { id } = req.params;

  res.json({ data: { viewed: true, id } });
});

router.post("/:id/action", async (req: Request, res: Response<ApiResponse>) => {
  const auth = req.auth!;
  const { id } = req.params;

  res.json({ data: { actionTaken: true, id } });
});

export { router as correspondenceRoutes };
