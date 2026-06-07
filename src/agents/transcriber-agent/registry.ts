import type { Language, Dialect, VulnerabilityTier } from "../../shared/types/index.js";
import {
  transcribeAudio as whisperTranscribe,
  transcribeDialect as mmsTranscribe,
  translateText as seamlessTranslate,
  detectLanguage as fastTextDetect,
} from "../../python-bridge/client.js";
import { getSlang, getTranslationCache, writeTranslationCache } from "../../db/proxy-client.js";
import { validateOutput } from "../guardian/agent.js";
import { formatForTTS } from "../accessibility/agent.js";
import type { TranscriberToolName } from "./routes.js";

export interface ToolContext {
  dialect?: Dialect;
  language: Language;
  targetLanguage: Language;
  tier: VulnerabilityTier;
  speechRate: number;
}

export interface PipelineState {
  audioBase64?: string;
  mimeType?: string;
  rawText: string;
  normalizedText: string;
  detectedLanguage: Language;
  outputText: string;
  transcriptionConfidence?: number;
  confidence: number;
  blocked: boolean;
  blockReason?: string;
}

type ToolFn = (state: PipelineState, ctx: ToolContext) => Promise<PipelineState>;

async function resolveSlang(text: string): Promise<string> {
  const words = text.split(/\s+/);
  const resolved = await Promise.all(
    words.map(async (w) => {
      const entry = await getSlang(w.toLowerCase()).catch(() => null);
      if (entry === null || entry.normalized_form === "") return w;
      return entry.normalized_form;
    }),
  );
  return resolved.join(" ");
}

export const transcriberRegistry: Record<TranscriberToolName, ToolFn> = {
  transcribe_audio: async (state, _ctx) => {
    const audio = state.audioBase64 ?? "";
    const mime = state.mimeType ?? "audio/wav";
    const result = await whisperTranscribe(audio, mime);
    return { ...state, rawText: result.text, transcriptionConfidence: result.confidence };
  },

  transcribe_dialect: async (state, ctx) => {
    const audio = state.audioBase64 ?? "";
    const mime = state.mimeType ?? "audio/wav";
    const code = ctx.dialect ?? "zh-hok";
    const result = await mmsTranscribe(audio, mime, code);
    return { ...state, rawText: result.text, transcriptionConfidence: result.confidence };
  },

  resolve_singlish: async (state, _ctx) => {
    const normalized = await resolveSlang(state.rawText);
    return { ...state, normalizedText: normalized };
  },

  resolve_malay: async (state, _ctx) => {
    const normalized = await resolveSlang(state.rawText);
    return { ...state, normalizedText: normalized };
  },

  resolve_indian: async (state, _ctx) => {
    const normalized = await resolveSlang(state.rawText);
    return { ...state, normalizedText: normalized };
  },

  detect_language: async (state, ctx) => {
    const text = state.normalizedText || state.rawText;
    const lang = await fastTextDetect(text).catch(() => ctx.language as string);
    return { ...state, detectedLanguage: lang as Language };
  },

  translate_text: async (state, ctx) => {
    const text = state.normalizedText || state.rawText;
    const source = state.detectedLanguage;
    // Rule from spec: never call translate_text if source lang == target lang
    if (source === ctx.targetLanguage) return { ...state, outputText: text };

    // Generate cache key: sha256("text:sourceLang:targetLang")
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${text}:${source}:${ctx.targetLanguage}`),
    );
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Cache hit — skip SeamlessM4T entirely
    const cached = await getTranslationCache(hash).catch(() => null);
    if (cached !== null) {
      return { ...state, outputText: cached.translated_text };
    }

    // Cache miss — call SeamlessM4T then write result
    const result = await seamlessTranslate(text, source, ctx.targetLanguage).catch(() => ({
      translated_text: text,
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
    const text = state.outputText || state.normalizedText || state.rawText;
    const result = validateOutput(text);
    if (!result.safe) {
      return { ...state, blocked: true, blockReason: result.reason, outputText: text };
    }
    return { ...state, outputText: text };
  },

  format_response: async (state, ctx) => {
    const text = state.outputText || state.normalizedText || state.rawText;
    const lang = state.detectedLanguage;
    const formatted = formatForTTS(text, lang, ctx.tier);
    return { ...state, outputText: formatted };
  },
};
