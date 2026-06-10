import type { Language } from "../../shared/types/index.js";
import {
  PIPELINE_TRANSLATE,
  PIPELINE_DETECT_ONLY,
  type TranslatorToolName,
} from "./routes.js";

export interface TranslatorInput {
  text: string;
  sourceLang?: Language;
  targetLanguage: Language;
  detectOnly?: boolean;
}

export function selectTranslatorPipeline(input: TranslatorInput): TranslatorToolName[] {
  if (input.detectOnly) return PIPELINE_DETECT_ONLY;
  return PIPELINE_TRANSLATE;
}
