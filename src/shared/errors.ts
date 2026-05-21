export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    isRetryable: boolean = false,
    metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.metadata = metadata;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` ${id}` : ""} not found`,
      `${resource.toUpperCase()}.NOT_FOUND`,
      404,
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, "AUTH.UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, "AUTH.FORBIDDEN", 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "VALIDATION.ERROR", 400, false, metadata);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super("Too many requests", "RATE_LIMIT.EXCEEDED", 429, true, { retryAfter });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`, `EXTERNAL.${service.toUpperCase()}_ERROR`, 502, true);
  }
}
