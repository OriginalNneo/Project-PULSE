import { type Request, type Response, type NextFunction } from "express";
import { RateLimitError } from "../errors.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Limits are read lazily (per request) so values set in .env apply even though
 * dotenv loads after this module is imported. All are overridable via env.
 *
 * NOTE: this middleware runs before route-level auth, so most traffic is seen
 * as "anonymous". The anonymous default is therefore set high enough for an
 * interactive SPA + chat console, while still bounding abuse.
 */
function envInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

<<<<<<< HEAD
const LIMITS: Record<"anonymous" | "authenticated" | "service" | "admin", number> = {
  anonymous: 10,
  authenticated: 100,
  service: 1000,
  admin: 500,
};
=======
function windowMs(): number {
  return envInt("RATE_LIMIT_WINDOW_MS", 60_000);
}
>>>>>>> bbbcd6a0ad6287fddd6d91b59aed624801f9dbff

function getKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? (forwarded.split(",")[0]?.trim() ?? "unknown") : req.ip ?? "unknown";
  return `${ip}:${req.auth?.userId ?? "anon"}`;
}

function getLimit(req: Request): number {
  if (!req.auth) return envInt("RATE_LIMIT_ANONYMOUS", 300);
  if (req.auth.roles.includes("admin")) return envInt("RATE_LIMIT_ADMIN", 600);
  if (req.auth.roles.includes("service")) return envInt("RATE_LIMIT_SERVICE", 1000);
  return envInt("RATE_LIMIT_AUTHENTICATED", 600);
}

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = getKey(req);
  const limit = getLimit(req);
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs() };
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
