import { type Request, type Response, type NextFunction } from "express";
import { AppError, UnauthorizedError } from "../errors.js";
import type { AuthenticatedRequest, Language, VulnerabilityTier } from "../types/index.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequest;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedError("No access token provided");
    }

    const decoded = verifyToken(token);
    req.auth = {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
      roles: decoded.roles,
      language: (decoded.language as Language) ?? "en",
      vulnerabilityTier: (decoded.vulnerabilityTier as VulnerabilityTier) ?? "self_service",
    };

    next();
  } catch (err) {
    next(err instanceof AppError ? err : new UnauthorizedError("Invalid or expired token"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new UnauthorizedError());
    }
    const hasRole = req.auth.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      return next(new AppError("Insufficient permissions", "AUTH.FORBIDDEN", 403));
    }
    next();
  };
}

function verifyToken(token: string): { sub: string; tenantId: string; roles: string[]; language?: string; vulnerabilityTier?: string } {
  if (process.env.NODE_ENV === "development" && token === "dev-token") {
    return {
      sub: "dev-user-001",
      tenantId: "dev-tenant",
      roles: ["user", "admin"],
      language: "en",
      vulnerabilityTier: "self_service",
    };
  }

  const jwt = await_import_jsonwebtoken();
  const payload = jwt.verify(token, process.env.JWT_PUBLIC_KEY ?? "secret");
  return payload as { sub: string; tenantId: string; roles: string[]; language?: string; vulnerabilityTier?: string };
}

function await_import_jsonwebtoken() {
  return require("jsonwebtoken");
}
