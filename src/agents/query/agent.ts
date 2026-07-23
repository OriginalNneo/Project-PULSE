import { createHash } from "crypto";
import type { Language, VulnerabilityTier } from "../../shared/types/index.js";
import type { ConversationMessage, AgentResponse } from "../shared/types.js";
import { createServiceLogger } from "../../shared/logger.js";
import { callHermes } from "../../services/ai/llmClient.js";
import { translateText } from "../../python-bridge/client.js";
import { getQueryCache, writeQueryCache } from "../../db/proxy-client.js";
import { groundingCheck } from "../guardian/agent.js";
import { getPreviousSessionContext } from "./summariser.js";
import { selectQueryPipeline } from "./router.js";
import { toneDirective } from "../main/tone.js";
import { stripLinks } from "../../shared/formatter.js";
import { queryRegistry, type QueryPipelineState, type QueryToolContext } from "./registry.js";
import type { QueryIntent } from "./routes.js";
import type { TriageResult } from "../triage/classifier.js";

const log = createServiceLogger("query");

export const BASE_SYSTEM_PROMPT = `You are PULSE, a warm, knowledgeable CPF assistant for Singaporeans. Answer using ONLY the retrieved CPF information provided. A citizen reads your reply on a phone — format every answer like this:

1. Lead with ONE sentence that directly answers the question — the most important fact first.
2. Keep it short: under about 120 words. Usually a lead sentence plus 2–4 short bullets. Use bullets only for genuinely multi-part topics; otherwise 1–3 sentences. No walls of text.
3. One idea per sentence; keep sentences under about 25 words. Use plain words ("buy" not "purchase", "about" not "approximately") and the active voice.
4. Begin the message with ONE relevant emoji (💰 CPF/money, 🏠 housing, 🏥 health, 📅 age/dates, ℹ️ general). At most one more emoji before a section heading. No decorative emoji.
5. Quote exact figures — dollar amounts, percentages, ages, dates — from the retrieved information. Never round, estimate or invent. Spell out an acronym the first time you use it, e.g. "Retirement Account (RA)".
6. NEVER include links, URLs, or web addresses of any kind (no "cpf.gov.sg", no "https://…"). Government agencies never send links. Refer to "the official CPF website" in words instead.
7. Respond in the reply language named at the end of the context — never any other language — keeping this same warm, plain tone.
8. If asked about a user's personal balance, contributions or payout: say clearly that you cannot access personal account data, tell them to log in to the official CPF website (in words — no link), and offer a CPF officer. Do NOT mention phone numbers or hotlines.

Do NOT say you cannot answer if the retrieved information covers the topic. Do NOT pad the answer or add disclaimers like "please consult a financial advisor" for public CPF information.`;

// Spelled-out names for the reply-language directive — a bare ISO code ("Respond in: zh")
// is a weaker anchor for the LLM than the language's own name.
const LANG_NAMES: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese (中文)",
  ms: "Malay (Bahasa Melayu)",
  ta: "Tamil (தமிழ்)",
  hi: "Hindi",
  ml: "Malayalam",
  pa: "Punjabi",
};

// Script ranges for the non-Latin supported languages, used to catch replies that came
// back in the wrong language. GLM drifts into Chinese when the target language isn't
// pinned hard — a drifted reply must never be shown as-is, and never cached.
const LANG_SCRIPTS: Partial<Record<Language, RegExp>> = {
  zh: /[㐀-䶿一-鿿]/,
  ta: /[஀-௿]/,
  hi: /[ऀ-ॿ]/,
  pa: /[਀-੿]/,
  ml: /[ഀ-ൿ]/,
};
const NON_LATIN_CHARS = /[㐀-䶿一-鿿஀-௿ऀ-ॿ਀-੿ഀ-ൿ]/g;

// True when the reply's script contradicts the target language: a non-Latin target whose
// script is absent, or a Latin target (en/ms) where non-Latin characters outnumber Latin
// letters (a quoted term like "公积金" inside an English sentence stays fine).
export function replyLanguageLooksWrong(text: string, language: Language): boolean {
  const expected = LANG_SCRIPTS[language];
  if (expected) return !expected.test(text);
  const nonLatin = text.match(NON_LATIN_CHARS)?.length ?? 0;
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  return nonLatin > 2 && nonLatin > latin;
}

// Reading-level adaptation for citizens who told us (or showed us) they need simpler
// communication. Deliberately tighter than BASE_SYSTEM_PROMPT on the axes it does NOT
// already constrain — total length, chunking, and vocabulary — because the base prompt
// already caps sentence length (~25 words) and overall length (~120 words); mapping the
// tier's per-sentence word caps here would be a no-op. self_service returns null (the base
// prompt is the standard experience). This shortens/simplifies at GENERATION time rather
// than truncating a finished answer, so no CPF caveat is ever cut mid-sentence.
export function readingLevelDirective(tier: VulnerabilityTier): string | null {
  switch (tier) {
    case "guided":
      return "This citizen has asked for simpler communication. Keep the WHOLE reply under about 60 words — one lead sentence plus at most two short bullets. Use only everyday words; avoid financial jargon, and if a CPF term is unavoidable, define it in one plain phrase. Do not add extra detail, background, or caveats.";
    case "high_touch":
      return "This citizen needs very simple, gentle communication. Give ONE idea only, in about 40 words or fewer, as plain short sentences with no bullets. Use the simplest everyday words and define any CPF term in plain words. Finish by warmly inviting them to ask for more (e.g. \"Ask me if you'd like more.\").";
    default:
      return null;
  }
}

function buildSystemPrompt(
  triage?: TriageResult,
  emotion?: { score: number; label: string; sustained?: boolean },
  tier: VulnerabilityTier = "self_service",
): string {
  let prompt = BASE_SYSTEM_PROMPT;
  if (triage?.promptHint) {
    prompt += `\n\nAdditional guidance for this query: ${triage.promptHint}`;
  }
  // Reading-level adaptation takes priority over the base formatting rules for length.
  const reading = readingLevelDirective(tier);
  if (reading) {
    prompt += `\n\nREADING LEVEL FOR THIS REPLY (overrides the length limits above): ${reading}`;
  }
  // Emotion-driven tone: soften wording for upset callers (empathy-first, never
  // shortening the answer). The score/label are already trajectory-folded upstream
  // (effectiveEmotion), and `sustained` adds an ongoing-difficulty acknowledgement.
  // Null for neutral.
  const tone = emotion ? toneDirective(emotion.score, emotion.label, emotion.sustained) : null;
  if (tone) {
    prompt += `\n\nTONE FOR THIS REPLY: ${tone}`;
  }
  return prompt;
}

export interface QueryContext {
  userId: string;
  tenantId: string;
  vulnerabilityTier: VulnerabilityTier;
  language?: Language;
  sessionId?: string;
  triage?: TriageResult;
  emotion?: { score: number; label: string; sustained?: boolean };
}

export interface QueryAgentResponse extends AgentResponse {
  intent: QueryIntent;
  navigationUrl?: string;
  fromCache?: boolean;
}

export async function runQueryAgent(
  messages: ConversationMessage[],
  ctx: QueryContext,
): Promise<QueryAgentResponse> {
  const lastMessage = messages.filter((m) => m.role === "user").at(-1);
  const query = lastMessage?.content ?? "";
  const language = ctx.language ?? "en";

  // The knowledge base, intent keywords, and terminology glossary are all English —
  // searching them with raw Chinese/Tamil/… text retrieved nothing, leaving the LLM
  // to answer from a generic fallback page (hallucination-prone) and misclassifying
  // intent (e.g. a zh balance query never became personal_data). Translate for
  // retrieval only; the LLM still sees the user's original words below.
  let searchQuery = query;
  if (language !== "en" && query.trim()) {
    const t = await translateText(query, language, "en").catch(() => null);
    if (t?.translated_text?.trim()) {
      searchQuery = t.translated_text;
      log.info({ userId: ctx.userId, language }, "Query translated to English for retrieval");
    }
  }

  const { intent, pipeline } = selectQueryPipeline(searchQuery);

  log.info({ userId: ctx.userId, intent, pipeline }, "Query pipeline selected");

  const toolCtx: QueryToolContext = { language, tier: ctx.vulnerabilityTier, query: searchQuery };

  let state: QueryPipelineState = {
    query,
    retrievedContent: "",
    outputText: "",
    confidence: 1.0,
    blocked: false,
    isPersonalDataRequest: intent === "personal_data",
  };

  for (const toolName of pipeline) {
    const tool = queryRegistry[toolName];
    state = await tool(state, toolCtx);

    if (state.blocked) {
      log.warn({ userId: ctx.userId, toolName, reason: state.blockReason }, "Guardian blocked query output");
      return {
        content: "Your query is being reviewed. If you need immediate assistance, I can redirect you to a CPF officer — just reply *Officer*.",
        agentName: "query",
        confidence: 1,
        requiresHumanReview: true,
        metadata: { reason: state.blockReason },
        intent,
      };
    }
  }

  // Always use the full retrieved content for Hermes — never the truncated outputText.
  const retrievedForLLM = state.retrievedContent || state.outputText;

  // Bring the recent conversation forward so follow-ups ("what about my spouse?", asked in
  // any language) are understood in context — the pipeline only retrieves on the last message.
  const historyStr = messages
    .slice(0, -1)
    .filter((m) => m.content?.trim())
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n")
    .slice(0, 1500);

  // ── Response-level cache ─────────────────────────────────────────────────────
  // The effective emotion tier is part of the key — otherwise a soothing (angry)
  // reply would be served from a neutral cache entry, defeating tone adaptation.
  // `sustained` is keyed too because it changes the directive wording (the
  // ongoing-difficulty acknowledgement), so it must not share a cache slot.
  // The vulnerability tier is part of the key — a self_service (full-length) reply must
  // never be served from cache to a guided/high_touch user, which would silently defeat
  // the reading-level adaptation for exactly the citizens it exists to help.
  const cacheHash = createHash("sha256")
    .update(`${intent}|${query.toLowerCase().trim()}|${language}|${ctx.triage?.category ?? 1}|${ctx.emotion?.label ?? "neutral"}|${ctx.emotion?.sustained ? "s" : ""}|${ctx.vulnerabilityTier}|${historyStr}`)
    .digest("hex");

  // Ignore (and later overwrite) cache entries whose script contradicts the target
  // language — drifted replies written before the language guard existed poison the
  // cache, making "English question → Chinese answer" reproducible forever.
  let cached = await getQueryCache(cacheHash).catch(() => null);
  if (cached && replyLanguageLooksWrong(cached.response, language)) {
    log.warn({ cacheHash, language }, "Cached reply is in the wrong language — regenerating");
    cached = null;
  }
  if (cached) {
    log.info({ cacheHash, intent }, "Query response served from cache");
    return {
      content: stripLinks(cached.response),
      agentName: "query",
      confidence: state.confidence,
      requiresHumanReview: false,
      metadata: { intent, navigationUrl: state.navigationUrl, pipeline, fromCache: true },
      intent,
      navigationUrl: state.navigationUrl,
      fromCache: true,
    };
  }

  const hermesContext = [
    historyStr ? `Conversation so far:\n${historyStr}` : null,
    `User question: "${query}"`,
    `Retrieved CPF information:\n${retrievedForLLM}`,
    state.navigationUrl ? `Source URL: ${state.navigationUrl}` : null,
    // Always pin the reply language — English included. Without an explicit anchor the
    // model (GLM) drifts into Chinese on English queries.
    `Reply language: ${LANG_NAMES[language] ?? "English"}. Write your ENTIRE reply in this language and no other.`,
  ].filter(Boolean).join("\n\n");

  // GLM is a thinking model; content is empty if the LLM is down or ran out of tokens
  // mid-reasoning. Fall back to the raw retrieved knowledge so the user still gets the
  // facts — but remember it failed so we DON'T cache a degraded answer and the officer is
  // offered (B8: the raw retrieval scaffold used to be served and cached as a real answer).
  const rawContent = await callHermes(buildSystemPrompt(ctx.triage, ctx.emotion, ctx.vulnerabilityTier), hermesContext, [], 1024, true, { thinking: { type: "disabled" } }).catch(() => "");
  let llmContent = rawContent.trim();

  // Language-drift guard: if the reply's script contradicts the target language,
  // retry once with a hard directive. A still-wrong reply is delivered (better than
  // nothing) but never cached — see the write guard below.
  let wrongLanguage = llmContent.length > 0 && replyLanguageLooksWrong(llmContent, language);
  if (wrongLanguage) {
    log.warn({ userId: ctx.userId, language }, "Reply came back in the wrong language — retrying once");
    const retry = (await callHermes(
      `${buildSystemPrompt(ctx.triage, ctx.emotion, ctx.vulnerabilityTier)}\n\nCRITICAL: Your entire reply MUST be written in ${LANG_NAMES[language] ?? "English"}. Any other language is a failure.`,
      hermesContext, [], 1024, true, { thinking: { type: "disabled" } },
    ).catch(() => "")).trim();
    if (retry && !replyLanguageLooksWrong(retry, language)) {
      llmContent = retry;
      wrongLanguage = false;
    }
  }
  const llmFailed = llmContent.length === 0;
  const content = stripLinks(llmContent || retrievedForLLM);

  // Only flag hallucinations on fabricated numbers (>3 ungrounded). Word-overlap
  // is not used — GLM naturally paraphrases and that is not a hallucination.
  const grounding = groundingCheck(content, state.retrievedContent);
  if (grounding.ungroundedNumbers.length > 0) {
    log.warn({ ungroundedNumbers: grounding.ungroundedNumbers }, "Possible hallucinated numbers in response");
  }

  // Never auto-escalate from the query agent. inbound.ts offers the officer
  // as an option when confidence is low or this is a personal data request;
  // the user decides by replying *Officer*.
  const requiresHumanReview = state.blocked || state.confidence < 0.3 || state.isPersonalDataRequest || llmFailed;

  if (!requiresHumanReview && !wrongLanguage) {
    await writeQueryCache({ hash: cacheHash, response: content, intent, lang: language }).catch(() => null);
  }

  return {
    content,
    agentName: "query",
    confidence: state.confidence,
    requiresHumanReview,
    metadata: { intent, navigationUrl: state.navigationUrl, pipeline },
    intent,
    navigationUrl: state.navigationUrl,
    fromCache: false,
  };
}
