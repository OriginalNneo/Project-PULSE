import { z } from "zod";

export const LanguageSchema = z.enum(["en", "zh", "ms", "ta", "hi", "ml", "pa"]);

export const DialectSchema = z.enum([
  "zh-hok", "zh-can", "zh-teo", "zh-hak", "zh-hai",
  "ms-bms", "ms-joh", "ms-boy", "ms-jav",
  "ta-sin", "ta-spo", "ml", "pa", "hi",
]);

export const VulnerabilityTierSchema = z.enum(["self_service", "guided", "high_touch"]);

export const ResponseFormatSchema = z.enum(["text", "audio", "both"]);
