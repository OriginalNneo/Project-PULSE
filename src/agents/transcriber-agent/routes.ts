import type { Dialect } from "../../shared/types/index.js";

export type TranscriberToolName =
  | "transcribe_audio"
  | "transcribe_dialect"
  | "resolve_singlish"
  | "resolve_malay"
  | "resolve_indian"
  | "translate_text"
  | "detect_language"
  | "validate_output"
  | "format_response";

// Low-resource dialects require MMS-300m; Whisper cannot handle them reliably
export const LOW_RESOURCE_DIALECTS: ReadonlySet<Dialect> = new Set<Dialect>([
  "zh-hok", "zh-teo", "zh-hak", "zh-hai", "ms-jav",
]);

export const CHINESE_DIALECTS: ReadonlySet<Dialect> = new Set<Dialect>([
  "zh-hok", "zh-can", "zh-teo", "zh-hak", "zh-hai",
]);

export const MALAY_DIALECTS: ReadonlySet<Dialect> = new Set<Dialect>([
  "ms-bms", "ms-joh", "ms-boy", "ms-jav",
]);

export const INDIAN_DIALECTS: ReadonlySet<Dialect> = new Set<Dialect>([
  "ta-sin", "ta-spo", "ml", "pa", "hi",
]);

// Ordered tool pipelines. Edit this file to change routing behaviour
// without touching the dispatcher logic in router.ts.
export const PIPELINE_VOICE_LOW_RESOURCE: TranscriberToolName[] = [
  "transcribe_dialect", "resolve_singlish", "translate_text", "validate_output", "format_response",
];

export const PIPELINE_VOICE_STANDARD: TranscriberToolName[] = [
  "transcribe_audio", "resolve_singlish", "translate_text", "validate_output", "format_response",
];

export const PIPELINE_TEXT_CHINESE_DIALECT: TranscriberToolName[] = [
  "resolve_singlish", "detect_language", "translate_text", "validate_output", "format_response",
];

export const PIPELINE_TEXT_MALAY_DIALECT: TranscriberToolName[] = [
  "resolve_malay", "detect_language", "translate_text", "validate_output", "format_response",
];

export const PIPELINE_TEXT_INDIAN_DIALECT: TranscriberToolName[] = [
  "resolve_indian", "detect_language", "translate_text", "validate_output", "format_response",
];

// No translation when source is already the target language
export const PIPELINE_TEXT_PASSTHROUGH: TranscriberToolName[] = [
  "detect_language", "validate_output", "format_response",
];

export const PIPELINE_DETECT_ONLY: TranscriberToolName[] = ["detect_language"];
