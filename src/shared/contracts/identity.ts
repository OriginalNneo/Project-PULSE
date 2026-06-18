import { z } from "zod";
import { validateContract } from "./validation.js";

export const IDENTITY_SCHEMA_VERSION = "1.0" as const;

export const AgeBracketSchema = z.enum([
  "under_18",
  "18_34",
  "35_49",
  "50_64",
  "65_plus",
]);

export const VulnerabilityMarkerTypeSchema = z.enum([
  "senior_age_bracket",
  "assisted_living_service",
  "caregiver_linked",
  "repeated_prior_support",
  "accessibility_preference",
]);

export const VulnerabilityMarkerSchema = z.object({
  schemaVersion: z.literal(IDENTITY_SCHEMA_VERSION),
  type: VulnerabilityMarkerTypeSchema,
  value: z.string().min(1),
  source: z.enum(["verified_identity", "user_preference", "service_history", "cso_record"]),
  confidence: z.number().min(0).max(1),
  createdAt: z.string().datetime(),
});

export const UserProfileSchema = z.object({
  schemaVersion: z.literal(IDENTITY_SCHEMA_VERSION),
  id: z.string().min(1),
  singpassSubjectHash: z.string().min(1).optional(),
  displayName: z.string().min(1),
  ageBracket: AgeBracketSchema,
  preferredLocale: z.string().min(2).max(16).optional(),
  vulnerabilityMarkers: z.array(VulnerabilityMarkerSchema).default([]),
});

export const MemberSessionSchema = z.object({
  schemaVersion: z.literal(IDENTITY_SCHEMA_VERSION),
  id: z.string().min(1),
  userId: z.string().min(1),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type AgeBracket = z.infer<typeof AgeBracketSchema>;
export type VulnerabilityMarkerType = z.infer<typeof VulnerabilityMarkerTypeSchema>;
export type VulnerabilityMarker = z.infer<typeof VulnerabilityMarkerSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type MemberSession = z.infer<typeof MemberSessionSchema>;

export const validateVulnerabilityMarker = (value: unknown) =>
  validateContract(VulnerabilityMarkerSchema, value);

export const validateUserProfile = (value: unknown) =>
  validateContract(UserProfileSchema, value);

export const validateMemberSession = (value: unknown) =>
  validateContract(MemberSessionSchema, value);
