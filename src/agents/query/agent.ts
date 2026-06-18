import { createHash } from "crypto";
import type { Language, VulnerabilityTier } from "../../shared/types/index.js";
import type { ConversationMessage, AgentResponse } from "../shared/types.js";
import { createServiceLogger } from "../../shared/logger.js";
import { callHermes } from "../../shared/llm/client.js";
import { getQueryCache, writeQueryCache } from "../../db/proxy-client.js";
import { groundingCheck } from "../guardian/agent.js";
import { getPreviousSessionContext } from "./summariser.js";
import { selectQueryPipeline } from "./router.js";
import { queryRegistry, type QueryPipelineState, type QueryToolContext } from "./registry.js";
import type { QueryIntent } from "./routes.js";
import type { TriageResult } from "../triage/classifier.js";

const log = createServiceLogger("query");

const BASE_SYSTEM_PROMPT = `You are PULSE, a friendly and knowledgeable CPF assistant for Singaporeans. Your job is to give accurate, complete, helpful answers using the retrieved CPF information provided.

Rules:
1. Use the retrieved CPF information as your primary source. Quote exact figures — dollar amounts, percentages, ages, dates — directly from it. Never round or estimate.
2. Give a FULL answer. If the retrieved information covers the topic, explain it completely. Do not hold back or truncate the answer.
3. Structure your answer well:
   - For simple factual questions (1–2 facts): answer in 1–3 clear sentences.
   - For multi-part topics (e.g. CPF LIFE plans, contribution rates, housing schemes): use bullet points or a short numbered list.
   - Always end with the relevant cpf.gov.sg URL if one was retrieved.
4. If asked about a user's personal balance, contributions, or payout: state clearly that you cannot access personal account data, direct them to cpf.gov.sg/member, and do NOT mention phone numbers or hotlines.
5. Respond in the user's language. If the query is in Chinese, reply in Chinese. Malay → Malay. Tamil → Tamil. And so on.
6. Tone: warm, patient, conversational — like a knowledgeable friend explaining to someone who may not be familiar with financial jargon. Spell out acronyms on first use.
7. Do NOT say you cannot answer if the retrieved information covers the topic.
8. Do NOT add disclaimers like "please consult a financial advisor" for publicly available CPF information.`;

function buildSystemPrompt(triage?: TriageResult): string {
  if (!triage?.promptHint) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}\n\nAdditional guidance for this query: ${triage.promptHint}`;
}

export interface QueryContext {
  userId: string;
  tenantId: string;
  vulnerabilityTier: VulnerabilityTier;
  language?: Language;
  sessionId?: string;
  triage?: TriageResult;
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

  const { intent, pipeline } = selectQueryPipeline(query);

  log.info({ userId: ctx.userId, intent, pipeline }, "Query pipeline selected");

  const toolCtx: QueryToolContext = { language, tier: ctx.vulnerabilityTier, query };

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

  // ── Response-level cache ─────────────────────────────────────────────────────
  const cacheHash = createHash("sha256")
    .update(`${intent}|${query.toLowerCase().trim()}|${language}|${ctx.triage?.category ?? 1}`)
    .digest("hex");

  const cached = await getQueryCache(cacheHash).catch(() => null);
  if (cached) {
    log.info({ cacheHash, intent }, "Query response served from cache");
    return {
      content: cached.response,
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
    `User question: "${query}"`,
    `Retrieved CPF information:\n${retrievedForLLM}`,
    state.navigationUrl ? `Source URL: ${state.navigationUrl}` : null,
    language !== "en" ? `Respond in: ${language}` : null,
  ].filter(Boolean).join("\n\n");

  // GLM-5-turbo is a thinking model; content is empty if it ran out of tokens mid-reasoning.
  // Fall back to the raw retrieved content so the user always gets something useful.
  const rawContent = await callHermes(buildSystemPrompt(ctx.triage), hermesContext).catch(() => "");
  const content = rawContent.trim() || retrievedForLLM;

  // Only flag hallucinations on fabricated numbers (>3 ungrounded). Word-overlap
  // is not used — GLM naturally paraphrases and that is not a hallucination.
  const grounding = groundingCheck(content, state.retrievedContent);
  if (grounding.ungroundedNumbers.length > 0) {
    log.warn({ ungroundedNumbers: grounding.ungroundedNumbers }, "Possible hallucinated numbers in response");
  }

  // Never auto-escalate from the query agent. inbound.ts offers the officer
  // as an option when confidence is low or this is a personal data request;
  // the user decides by replying *Officer*.
  const requiresHumanReview = state.blocked || state.confidence < 0.3 || state.isPersonalDataRequest;

  if (!requiresHumanReview) {
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
