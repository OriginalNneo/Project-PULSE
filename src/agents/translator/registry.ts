import type { Language, VulnerabilityTier } from "../../shared/types/index.js";
import {
  translateText as seamlessTranslate,
  detectLanguage as fastTextDetect,
} from "../../python-bridge/client.js";
import { getTranslationCache, writeTranslationCache } from "../../db/proxy-client.js";
import { validateOutput } from "../guardian/agent.js";
import { formatForTTS } from "../accessibility/agent.js";
import type { TranslatorToolName } from "./routes.js";

export interface TranslatorToolContext {
  language: Language;
  targetLanguage: Language;
  tier: VulnerabilityTier;
  speechRate: number;
}

export interface TranslatorState {
  inputText: string;
  detectedLanguage: Language;
  outputText: string;
  confidence: number;
  blocked: boolean;
  blockReason?: string;
}

type ToolFn = (state: TranslatorState, ctx: TranslatorToolContext) => Promise<TranslatorState>;

export const translatorRegistry: Record<TranslatorToolName, ToolFn> = {
  detect_language: async (state, ctx) => {
    const lang = await fastTextDetect(state.inputText).catch(() => ctx.language as string);
    return { ...state, detectedLanguage: lang as Language };
  },

  translate_text: async (state, ctx) => {
    const source = state.detectedLanguage;
    // Skip translation when source and target are the same
    if (source === ctx.targetLanguage) return { ...state, outputText: state.inputText };

    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${state.inputText}:${source}:${ctx.targetLanguage}`),
    );
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const cached = await getTranslationCache(hash).catch(() => null);
    if (cached !== null) {
      return { ...state, outputText: cached.translated_text };
    }

    const result = await seamlessTranslate(state.inputText, source, ctx.targetLanguage).catch(() => ({
      translated_text: state.inputText,
      source_lang: source,
      target_lang: ctx.targetLanguage,
    }));

    await writeTranslationCache({
      hash,
      translated_text: result.translated_text,
      model: "seamless-m4t-v2-large",
      created_at: new Date().toISOString(),
    }).catch(() => null);

    return { ...state, outputText: result.translated_text };
  },

  validate_output: async (state, _ctx) => {
    const text = state.outputText || state.inputText;
    const result = validateOutput(text);
    if (!result.safe) {
      return { ...state, blocked: true, blockReason: result.reason, outputText: text };
    }
    return { ...state, outputText: text };
  },

  format_response: async (state, ctx) => {
    const text = state.outputText || state.inputText;
    const formatted = formatForTTS(text, state.detectedLanguage, ctx.tier);
    return { ...state, outputText: formatted };
  },
};
