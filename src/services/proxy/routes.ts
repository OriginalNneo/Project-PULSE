import { Router, type Request, type Response } from "express";
import type { ApiResponse, ProxyRelationship } from "../../shared/types/index.js";

const router = Router();

router.get("/:principalUserId/proxies", async (req: Request, res: Response<ApiResponse<ProxyRelationship[]>>) => {
  const { principalUserId } = req.params;

  const proxies: ProxyRelationship[] = [];

  res.json({ data: proxies });
});

router.post("/:principalUserId/proxies", async (req: Request, res: Response<ApiResponse<ProxyRelationship>>) => {
  const principalUserId = req.params.principalUserId ?? "";
  const body = req.body as Partial<ProxyRelationship>;

  const rel: ProxyRelationship = {
    id: crypto.randomUUID(),
    principalUserId,
    proxyUserId: body.proxyUserId ?? "",
    relationshipType: body.relationshipType ?? "family",
    grantedAt: new Date().toISOString(),
    permissions: body.permissions ?? [],
  };

  res.status(201).json({ data: rel });
});

router.get("/:principalUserId/correspondence", async (req: Request, res: Response<ApiResponse>) => {
  const { principalUserId } = req.params;

  res.json({ data: [] });
});

export { router as proxyRoutes };
