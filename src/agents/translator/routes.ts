export type TranslatorToolName =
  | "detect_language"
  | "translate_text"
  | "validate_output"
  | "format_response";

export const PIPELINE_TRANSLATE: TranslatorToolName[] = [
  "detect_language", "translate_text", "validate_output", "format_response",
];

export const PIPELINE_DETECT_ONLY: TranslatorToolName[] = ["detect_language"];
