import { type Request, type Response, type NextFunction } from "express";
import { AppError } from "../errors.js";
import { createServiceLogger } from "../logger.js";

const log = createServiceLogger("gateway");

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    log.warn({ errCode: err.code, statusCode: err.statusCode }, err.message);
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  log.error({ err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL.SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
