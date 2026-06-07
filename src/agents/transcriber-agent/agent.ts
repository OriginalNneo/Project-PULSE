import type { Language, Dialect, VulnerabilityTier } from "../../shared/types/index.js";
import type { AgentResponse } from "../shared/types.js";
import { createServiceLogger } from "../../shared/logger.js";
import { getUserPrefs } from "../../db/proxy-client.js";
import { synthesizeSpeech } from "../../python-bridge/client.js";
import { selectPipeline, type TranscriberInput } from "./router.js";
import { transcriberRegistry, type PipelineState, type ToolContext } from "./registry.js";

const log = createServiceLogger("transcriber");

export const TRANSCRIBER_SYSTEM_PROMPT = `You are a multilingual accessibility assistant for CPF Board Singapore.
You help elderly Singaporeans and non-English speakers understand CPF services.
You support: English, Singlish, Mandarin, Cantonese, Hokkien, Teochew, Hakka,
Hainanese, Malay, Bazaar Melayu, Javanese, Tamil, Spoken Tamil, Hindi,
Malayalam, and Punjabi. Always respond in the user's preferred language.
Only answer using information returned by your tools. Never guess.`;

export interface TranscriberContext {
  userId: string;
  tenantId: string;
  vulnerabilityTier: VulnerabilityTier;
}

export interface TranscriberResponse extends AgentResponse {
  transcription?: string;
  detectedLanguage: Language;
  audioBase64?: string;
  audioMimeType?: string;
}

export async function runTranscriberAgent(
  input: TranscriberInput,
  ctx: TranscriberContext,
): Promise<TranscriberResponse> {
  // Step 3 from flow: fetch user prefs to derive language + speech rate
  const prefs = await getUserPrefs(ctx.userId).catch(() => null);

  // Priority: explicit request param > user saved prefs > system default
  const targetLanguage: Language = input.targetLanguage ?? (prefs?.preferred_lang as Language | undefined) ?? "en";
  const speechRate: number = prefs?.speech_rate ?? 1.0;

  const pipeline = selectPipeline(input);

  log.info(
    { userId: ctx.userId, mode: input.mode, dialect: input.dialect, targetLanguage, pipeline },
    "Transcriber pipeline selected",
  );

  const toolCtx: ToolContext = {
    dialect: input.dialect,
    language: input.language ?? "en",
    targetLanguage,
    tier: ctx.vulnerabilityTier,
    speechRate,
  };

  let state: PipelineState = {
    audioBase64: input.audioBase64,
    mimeType: input.mimeType,
    rawText: input.text ?? "",
    normalizedText: "",
    detectedLanguage: input.language ?? "en",
    outputText: "",
    confidence: 1.0,
    blocked: false,
  };

  for (const toolName of pipeline) {
    const tool = transcriberRegistry[toolName];
    state = await tool(state, toolCtx);

    if (state.blocked) {
      log.warn({ userId: ctx.userId, toolName, reason: state.blockReason }, "Guardian blocked transcriber output");
      return {
        content: "Your message could not be processed. Please rephrase or contact the CPF hotline at 1800-227-1188.",
        agentName: "transcriber",
        confidence: 1,
        requiresHumanReview: true,
        metadata: { reason: state.blockReason },
        detectedLanguage: state.detectedLanguage,
      };
    }
  }

  const finalText = state.outputText || state.normalizedText || state.rawText;
  const responseFormat = input.responseFormat ?? "text";

  // Step 9: synthesize audio if requested
  let audioBase64: string | undefined;
  let audioMimeType: string | undefined;

  if (responseFormat !== "text") {
    const tts = await synthesizeSpeech(finalText, state.detectedLanguage, speechRate).catch(() => null);
    if (tts !== null) {
      audioBase64 = tts.audioBase64;
      audioMimeType = tts.mimeType;
    }
  }

  // If text-only format requested, strip audio
  const includeText = responseFormat !== "audio";

  return {
    content: includeText ? finalText : "",
    agentName: "transcriber",
    confidence: state.transcriptionConfidence ?? state.confidence,
    requiresHumanReview: false,
    metadata: {
      detectedLanguage: state.detectedLanguage,
      targetLanguage,
      speechRate,
      pipeline,
      responseFormat,
    },
    transcription: input.mode === "voice" ? state.rawText : undefined,
    detectedLanguage: state.detectedLanguage,
    audioBase64,
    audioMimeType,
  };
}
