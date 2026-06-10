import type { Language, Dialect, VulnerabilityTier } from "../../shared/types/index.js";
import type { ConversationMessage } from "../shared/types.js";
import { createServiceLogger } from "../../shared/logger.js";
import { getUserPrefs } from "../../db/proxy-client.js";
import { runTranscriberSubagent } from "../transcriber/agent.js";
import { runTranslatorSubagent } from "../translator/agent.js";
import { runQueryAgent } from "../query/agent.js";

const log = createServiceLogger("main-agent");

// ── Shared context passed to every request ────────────────────────────────────
export interface MainAgentContext {
  userId: string;
  tenantId: string;
  vulnerabilityTier: VulnerabilityTier;
}

// ── Request shapes (discriminated union) ──────────────────────────────────────

export interface TranscribeRequest {
  type: "transcribe";
  audioBase64: string;
  mimeType?: string;
  dialect?: Dialect;
  language?: Language;
  targetLanguage?: Language;
  responseFormat?: "text" | "audio" | "both";
}

export interface TranslateRequest {
  type: "translate";
  text: string;
  dialect?: Dialect;
  language?: Language;
  targetLanguage?: Language;
  responseFormat?: "text" | "audio" | "both";
}

export interface DetectRequest {
  type: "detect";
  text: string;
}

export interface QueryRequest {
  type: "query";
  messages: ConversationMessage[];
  language?: Language;
  sessionId?: string;
}

export type MainAgentRequest =
  | TranscribeRequest
  | TranslateRequest
  | DetectRequest
  | QueryRequest;

// ── Unified response returned to the gateway ─────────────────────────────────
export interface MainAgentResponse {
  content: string;
  agentName: "main";
  confidence: number;
  requiresHumanReview: boolean;
  metadata: Record<string, unknown>;
  // Transcriber / translator fields
  transcription?: string;
  detectedLanguage?: Language;
  audioBase64?: string;
  audioMimeType?: string;
  // Query fields
  intent?: string;
  navigationUrl?: string;
  fromCache?: boolean;
}

export async function runMainAgent(
  request: MainAgentRequest,
  ctx: MainAgentContext,
): Promise<MainAgentResponse> {
  const prefs = await getUserPrefs(ctx.userId).catch(() => null);
  const targetLanguage: Language =
    (request.type !== "detect" ? request.targetLanguage : undefined) ??
    (prefs?.preferred_lang as Language | undefined) ??
    "en";
  const speechRate: number = prefs?.speech_rate ?? 1.0;

  log.info({ userId: ctx.userId, type: request.type }, "Main agent dispatching request");

  // ── Transcribe: audio → text (transcriber subagent) then translate (translator subagent) ──
  if (request.type === "transcribe") {
    const transcribed = await runTranscriberSubagent(
      {
        mode: "voice",
        audioBase64: request.audioBase64,
        mimeType: request.mimeType,
        dialect: request.dialect,
        language: request.language,
      },
      { language: request.language ?? "en", dialect: request.dialect },
    );

    const translated = await runTranslatorSubagent(
      { text: transcribed.normalizedText, targetLanguage },
      {
        language: request.language ?? "en",
        targetLanguage,
        tier: ctx.vulnerabilityTier,
        speechRate,
        responseFormat: request.responseFormat ?? "text",
      },
    );

    if (translated.blocked) {
      return {
        content: translated.text,
        agentName: "main",
        confidence: 1,
        requiresHumanReview: true,
        metadata: { reason: translated.blockReason, subagent: "translator" },
        detectedLanguage: translated.detectedLanguage,
        transcription: transcribed.text,
      };
    }

    return {
      content: translated.text,
      agentName: "main",
      confidence: transcribed.confidence,
      requiresHumanReview: false,
      metadata: {
        detectedLanguage: translated.detectedLanguage,
        targetLanguage,
        speechRate,
        transcriberPipeline: transcribed.pipeline,
        translatorPipeline: translated.pipeline,
        responseFormat: request.responseFormat ?? "text",
      },
      transcription: transcribed.text,
      detectedLanguage: translated.detectedLanguage,
      audioBase64: translated.audioBase64,
      audioMimeType: translated.audioMimeType,
    };
  }

  // ── Translate: text → translated text (optional slang normalise then translator subagent) ──
  if (request.type === "translate") {
    let inputText = request.text;
    let transcriberPipeline: string[] = [];

    // If a dialect is present, run slang normalisation first
    if (request.dialect !== undefined) {
      const normalised = await runTranscriberSubagent(
        { mode: "text", text: request.text, dialect: request.dialect, language: request.language },
        { language: request.language ?? "en", dialect: request.dialect },
      );
      inputText = normalised.normalizedText;
      transcriberPipeline = normalised.pipeline;
    }

    const translated = await runTranslatorSubagent(
      { text: inputText, targetLanguage },
      {
        language: request.language ?? "en",
        targetLanguage,
        tier: ctx.vulnerabilityTier,
        speechRate,
        responseFormat: request.responseFormat ?? "text",
      },
    );

    if (translated.blocked) {
      return {
        content: translated.text,
        agentName: "main",
        confidence: 1,
        requiresHumanReview: true,
        metadata: { reason: translated.blockReason, subagent: "translator" },
        detectedLanguage: translated.detectedLanguage,
      };
    }

    return {
      content: translated.text,
      agentName: "main",
      confidence: 1.0,
      requiresHumanReview: false,
      metadata: {
        detectedLanguage: translated.detectedLanguage,
        targetLanguage,
        speechRate,
        transcriberPipeline,
        translatorPipeline: translated.pipeline,
        responseFormat: request.responseFormat ?? "text",
      },
      detectedLanguage: translated.detectedLanguage,
      audioBase64: translated.audioBase64,
      audioMimeType: translated.audioMimeType,
    };
  }

  // ── Detect: text → detected language only (translator subagent, detect-only pipeline) ──
  if (request.type === "detect") {
    const result = await runTranslatorSubagent(
      { text: request.text, targetLanguage: "en", detectOnly: true },
      { language: "en", targetLanguage: "en", tier: ctx.vulnerabilityTier, speechRate: 1.0 },
    );
    return {
      content: "",
      agentName: "main",
      confidence: 1.0,
      requiresHumanReview: false,
      metadata: { detectedLanguage: result.detectedLanguage },
      detectedLanguage: result.detectedLanguage,
    };
  }

  // ── Query: CPF knowledge lookup (query subagent) ──────────────────────────────
  const queryResult = await runQueryAgent(request.messages, {
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    vulnerabilityTier: ctx.vulnerabilityTier,
    language: request.language ?? targetLanguage,
    sessionId: request.sessionId,
  });

  return {
    content: queryResult.content,
    agentName: "main",
    confidence: queryResult.confidence,
    requiresHumanReview: queryResult.requiresHumanReview,
    metadata: queryResult.metadata,
    intent: queryResult.intent,
    navigationUrl: queryResult.navigationUrl,
    fromCache: queryResult.fromCache,
  };
}
