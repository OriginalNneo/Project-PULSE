export interface AuthenticatedRequest {
  userId: string;
  tenantId: string;
  roles: string[];
  language: import("./language.js").Language;
  dialect?: import("./language.js").Dialect;
  vulnerabilityTier: import("./language.js").VulnerabilityTier;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
