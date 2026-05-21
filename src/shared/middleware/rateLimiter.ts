import { type Request, type Response, type NextFunction } from "express";
import { RateLimitError } from "../errors.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;

const LIMITS: Record<string, number> = {
  anonymous: 10,
  authenticated: 100,
  service: 1000,
  admin: 500,
};

function getKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip ?? "unknown";
  return `${ip}:${req.auth?.userId ?? "anon"}`;
}

function getLimit(req: Request): number {
  if (!req.auth) return LIMITS.anonymous;
  if (req.auth.roles.includes("admin")) return LIMITS.admin;
  if (req.auth.roles.includes("service")) return LIMITS.service;
  return LIMITS.authenticated;
}

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = getKey(req);
  const limit = getLimit(req);
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  } else {
    entry.count++;
  }

  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - entry.count));
  res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return next(new RateLimitError(retryAfter));
  }

  next();
}
