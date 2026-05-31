import { z } from "zod";

export type ContractValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

export function validateContract<T>(
  schema: z.ZodType<T>,
  value: unknown,
): ContractValidationResult<T> {
  const result = schema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    }),
  };
}

export function parseContract<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}
