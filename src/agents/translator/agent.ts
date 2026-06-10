import type { Language, VulnerabilityTier } from "../../shared/types/index.js";
import { createServiceLogger } from "../../shared/logger.js";
import { synthesizeSpeech } from "../../python-bridge/client.js";
import { selectTranslatorPipeline, type TranslatorInput } from "./router.js";
import { translatorRegistry, type TranslatorState, type TranslatorToolContext } from "./registry.js";

const log = createServiceLogger("translator-subagent");

export interface TranslatorSubagentContext {
  language: Language;
  targetLanguage: Language;
  tier: VulnerabilityTier;
  speechRate: number;
  responseFormat?: "text" | "audio" | "both";
}

export interface TranslatorSubagentResult {
  text: string;
  detectedLanguage: Language;
  audioBase64?: string;
  audioMimeType?: string;
  blocked: boolean;
  blockReason?: string;
  pipeline: string[];
}

export async function runTranslatorSubagent(
  input: TranslatorInput,
  ctx: TranslatorSubagentContext,
): Promise<TranslatorSubagentResult> {
  const pipeline = selectTranslatorPipeline(input);

  log.info(
    { targetLanguage: ctx.targetLanguage, detectOnly: input.detectOnly, pipeline },
    "Translator subagent selected pipeline",
  );

  const toolCtx: TranslatorToolContext = {
    language: ctx.language,
    targetLanguage: ctx.targetLanguage,
    tier: ctx.tier,
    speechRate: ctx.speechRate,
  };

  let state: TranslatorState = {
    inputText: input.text,
    detectedLanguage: input.sourceLang ?? ctx.language,
    outputText: "",
    confidence: 1.0,
    blocked: false,
  };

  for (const toolName of pipeline) {
    const tool = translatorRegistry[toolName];
    state = await tool(state, toolCtx);

    if (state.blocked) {
      log.warn({ toolName, reason: state.blockReason }, "Guardian blocked translator output");
      return {
        text: "Your message could not be processed. Please rephrase or contact the CPF hotline at 1800-227-1188.",
        detectedLanguage: state.detectedLanguage,
        blocked: true,
        blockReason: state.blockReason,
        pipeline,
      };
    }
  }

  const finalText = state.outputText || state.inputText;
  const responseFormat = ctx.responseFormat ?? "text";

  let audioBase64: string | undefined;
  let audioMimeType: string | undefined;

  if (responseFormat !== "text" && !input.detectOnly) {
    const tts = await synthesizeSpeech(finalText, state.detectedLanguage, ctx.speechRate).catch(() => null);
    if (tts !== null) {
      audioBase64 = tts.audioBase64;
      audioMimeType = tts.mimeType;
    }
  }

  return {
    text: responseFormat !== "audio" ? finalText : "",
    detectedLanguage: state.detectedLanguage,
    audioBase64,
    audioMimeType,
    blocked: false,
    pipeline,
  };
}
