import type { Language, Dialect } from "../../shared/types/index.js";
import {
  LOW_RESOURCE_DIALECTS,
  CHINESE_DIALECTS,
  MALAY_DIALECTS,
  INDIAN_DIALECTS,
  PIPELINE_VOICE_LOW_RESOURCE,
  PIPELINE_VOICE_STANDARD,
  PIPELINE_TEXT_CHINESE_DIALECT,
  PIPELINE_TEXT_MALAY_DIALECT,
  PIPELINE_TEXT_INDIAN_DIALECT,
  PIPELINE_TEXT_PASSTHROUGH,
  type TranscriberToolName,
} from "./routes.js";

export interface TranscriberInput {
  mode: "voice" | "text";
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  language?: Language;
  dialect?: Dialect;
}

export function selectPipeline(input: TranscriberInput): TranscriberToolName[] {
  if (input.mode === "voice") {
    if (input.dialect !== undefined && LOW_RESOURCE_DIALECTS.has(input.dialect)) {
      return PIPELINE_VOICE_LOW_RESOURCE;
    }
    return PIPELINE_VOICE_STANDARD;
  }

  if (input.dialect !== undefined) {
    if (CHINESE_DIALECTS.has(input.dialect)) return PIPELINE_TEXT_CHINESE_DIALECT;
    if (MALAY_DIALECTS.has(input.dialect)) return PIPELINE_TEXT_MALAY_DIALECT;
    if (INDIAN_DIALECTS.has(input.dialect)) return PIPELINE_TEXT_INDIAN_DIALECT;
  }

  return PIPELINE_TEXT_PASSTHROUGH;
}
