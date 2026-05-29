import { type Request, type Response, type NextFunction } from "express";
import { randomUUID as uuid } from "crypto";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers["x-request-id"] as string) ?? uuid();
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-Id", id);
  next();
}

export function attachTraceContext(req: Request, _res: Response, next: NextFunction) {
  const traceId = req.headers["x-trace-id"] as string | undefined;
  const spanId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  req.headers["x-span-id"] = spanId;
  if (traceId) {
    req.headers["x-trace-id"] = traceId;
  }
  next();
}
