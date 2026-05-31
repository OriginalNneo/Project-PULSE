import { z } from "zod";
import { validateContract } from "./validation.js";

export const UI_PROFILE_SCHEMA_VERSION = "1.0" as const;

export const UiModeSchema = z.enum(["standard", "simplified", "assisted", "high_contrast"]);

export const PageKeySchema = z.enum([
  "home",
  "check_medisave_balance",
  "retirement_payout_planner",
  "update_contact_details",
  "nomination_status",
  "transaction_review",
]);

export const RecommendedActionSchema = z.object({
  schemaVersion: z.literal(UI_PROFILE_SCHEMA_VERSION),
  actionKey: z.string().min(1),
  pageKey: PageKeySchema,
  label: z.string().min(1),
  priority: z.number().int().min(1).max(10),
});

export const UiProfileSchema = z.object({
  schemaVersion: z.literal(UI_PROFILE_SCHEMA_VERSION),
  userId: z.string().min(1),
  mode: UiModeSchema,
  recommendedActions: z.array(RecommendedActionSchema).default([]),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export type UiMode = z.infer<typeof UiModeSchema>;
export type PageKey = z.infer<typeof PageKeySchema>;
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;
export type UiProfile = z.infer<typeof UiProfileSchema>;

export const validateRecommendedAction = (value: unknown) =>
  validateContract(RecommendedActionSchema, value);

export const validateUiProfile = (value: unknown) =>
  validateContract(UiProfileSchema, value);
