import type { Dialect } from "../../shared/types/index.js";

export type TranscriberToolName =
  | "transcribe_audio"
  | "transcribe_dialect"
  | "resolve_singlish"
  | "resolve_malay"
  | "resolve_indian";

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

export const PIPELINE_VOICE_LOW_RESOURCE: TranscriberToolName[] = [
  "transcribe_dialect", "resolve_singlish",
];

export const PIPELINE_VOICE_STANDARD: TranscriberToolName[] = [
  "transcribe_audio", "resolve_singlish",
];

export const PIPELINE_TEXT_CHINESE_DIALECT: TranscriberToolName[] = ["resolve_singlish"];
export const PIPELINE_TEXT_MALAY_DIALECT: TranscriberToolName[] = ["resolve_malay"];
export const PIPELINE_TEXT_INDIAN_DIALECT: TranscriberToolName[] = ["resolve_indian"];
export const PIPELINE_TEXT_PASSTHROUGH: TranscriberToolName[] = [];
