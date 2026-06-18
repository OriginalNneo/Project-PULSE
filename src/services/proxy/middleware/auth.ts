import type { Request, Response, NextFunction } from "express";

export function internalKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-internal-key"];
  if (!key || key !== process.env.DB_PROXY_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
