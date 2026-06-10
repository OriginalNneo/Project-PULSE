import type { Language, Dialect } from "../../shared/types/index.js";
import {
  transcribeAudio as whisperTranscribe,
  transcribeDialect as mmsTranscribe,
} from "../../python-bridge/client.js";
import { getSlang } from "../../db/proxy-client.js";
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
}

type ToolFn = (state: TranscriberState, ctx: TranscriberToolContext) => Promise<TranscriberState>;

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
};
