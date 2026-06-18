import type { Language, Dialect } from "../../shared/types/index.js";
import {
  transcribeAudio as whisperTranscribe,
  transcribeDialect as mmsTranscribe,
} from "../../python-bridge/client.js";
import { getAllSlangFull } from "../../db/proxy-client.js";
import type { TranscriberToolName } from "./routes.js";

export interface TranscriberToolContext {
  dialect?: Dialect;
  language: Language;
}

export interface TranscriberState {
  audioBase64?: string;
  mimeType?: string;
  rawText: string;
  normalizedText: string;
  transcriptionConfidence?: number;
  confidence: number;
  /** Dominant Chinese dialect inferred from matched slang words, e.g. "zh-can". Null = none detected. */
  detectedDialect?: string | null;
}

type ToolFn = (state: TranscriberState, ctx: TranscriberToolContext) => Promise<TranscriberState>;

// Slang DB dialect label → internal dialect code (only Chinese dialects affect TTS voice).
// Singlish, Malay, Tamil, Hindi, etc. are handled by base-language detection — no override needed.
const DIALECT_CODE: Record<string, string> = {
  cantonese:  "zh-can",
  hokkien:    "zh-hok",
  teochew:    "zh-teo",
  hakka:      "zh-hak",
  hainanese:  "zh-hai",
};

// Loaded once on first use — Map<term, { normalized, dialect }>
let _slangFullMap: Map<string, { normalized: string; dialect: string }> | null = null;

async function getSlangFullMap(): Promise<Map<string, { normalized: string; dialect: string }>> {
  if (_slangFullMap) return _slangFullMap;
  _slangFullMap = await getAllSlangFull();
  return _slangFullMap;
}

/**
 * Normalise slang in `text` and tally dialect hits.
 * Returns resolved text + the dominant Chinese dialect code if ≥2 distinct
 * words from the same dialect were matched (null otherwise).
 */
async function resolveSlang(
  text: string,
): Promise<{ text: string; detectedDialect: string | null }> {
  const map = await getSlangFullMap();
  if (map.size === 0) return { text, detectedDialect: null };

  const dialectHits: Record<string, number> = {};
  const words = text.split(/\s+/).map((w) => {
    const entry = map.get(w.toLowerCase());
    if (!entry) return w;
    const code = DIALECT_CODE[entry.dialect];
    if (code) dialectHits[code] = (dialectHits[code] ?? 0) + 1;
    return entry.normalized;
  });

  // Pick dominant dialect only if ≥2 distinct words matched — avoids
  // flipping dialect from a single incidental slang word.
  let detectedDialect: string | null = null;
  let maxHits = 1;
  for (const [code, hits] of Object.entries(dialectHits)) {
    if (hits > maxHits) { maxHits = hits; detectedDialect = code; }
  }

  return { text: words.join(" "), detectedDialect };
}

export const transcriberRegistry: Record<TranscriberToolName, ToolFn> = {
  transcribe_audio: async (state, _ctx) => {
    const audio = state.audioBase64 ?? "";
    const mime = state.mimeType ?? "audio/ogg";
    if (!audio) return state;
    const result = await whisperTranscribe(audio, mime);
    return { ...state, rawText: result.text, transcriptionConfidence: result.confidence };
  },

  transcribe_dialect: async (state, ctx) => {
    const audio = state.audioBase64 ?? "";
    const mime = state.mimeType ?? "audio/ogg";
    const code = ctx.dialect ?? "zh-hok";
    if (!audio) return state;
    const result = await mmsTranscribe(audio, mime, code);
    return { ...state, rawText: result.text, transcriptionConfidence: result.confidence };
  },

  resolve_singlish: async (state, _ctx) => {
    const { text, detectedDialect } = await resolveSlang(state.rawText);
    return {
      ...state,
      normalizedText: text,
      detectedDialect: detectedDialect ?? state.detectedDialect ?? null,
    };
  },

  resolve_malay: async (state, _ctx) => {
    const { text, detectedDialect } = await resolveSlang(state.rawText);
    return {
      ...state,
      normalizedText: text,
      detectedDialect: detectedDialect ?? state.detectedDialect ?? null,
    };
  },

  resolve_indian: async (state, _ctx) => {
    const { text, detectedDialect } = await resolveSlang(state.rawText);
    return {
      ...state,
      normalizedText: text,
      detectedDialect: detectedDialect ?? state.detectedDialect ?? null,
    };
  },
};
