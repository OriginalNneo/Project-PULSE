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

const log = createServiceLogger("query");

export const QUERY_SYSTEM_PROMPT = `You are a CPF navigation assistant for elderly Singaporeans. You help users
find the right CPF service, form, or webpage. You ONLY answer using content
retrieved from your tools — content scraped from the official CPF website.
You never provide CPF balance, contribution, or payout figures — those are
private and stored in CPF's own systems which you cannot access. If asked
about personal CPF data, explain that the user must log in at cpf.gov.sg
or call the CPF hotline at 1800-227-1188. Always respond in the user's
preferred language.`;

export interface QueryContext {
  userId: string;
  tenantId: string;
  vulnerabilityTier: VulnerabilityTier;
  language?: Language;
  sessionId?: string;
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
        content: "Your query is being reviewed. Please call the CPF hotline at 1800-227-1188 for immediate assistance.",
        agentName: "query",
        confidence: 1,
        requiresHumanReview: true,
        metadata: { reason: state.blockReason },
        intent,
      };
    }
  }

  const toolOutput = state.outputText || state.retrievedContent;

  // ── Feature 5: Response-level cache ─────────────────────────────────────────
  const cacheHash = createHash("sha256")
    .update(`${intent}|${query.toLowerCase().trim()}|${language}`)
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

  // ── Feature 6: Previous session context ──────────────────────────────────────
  let sessionContext = "";
  if (ctx.userId && ctx.sessionId) {
    const summary = await getPreviousSessionContext(ctx.userId, ctx.sessionId).catch(() => null);
    if (summary) {
      sessionContext = `\n\nContext from user's previous session:\n${summary}`;
      log.info({ userId: ctx.userId }, "Previous session context injected");
    }
  }

  const hermesContext = [
    `User question: "${query}"`,
    `Intent detected: ${intent}`,
    `Retrieved CPF information:\n${toolOutput}`,
    state.navigationUrl ? `Relevant URL: ${state.navigationUrl}` : null,
    `User language: ${language}`,
    `User accessibility tier: ${ctx.vulnerabilityTier}`,
    sessionContext || null,
  ].filter(Boolean).join("\n\n");

  const rawContent = await callHermes(QUERY_SYSTEM_PROMPT, hermesContext).catch(() => toolOutput);

  // ── Feature 7: Hallucination / grounding check ───────────────────────────────
  const grounding = groundingCheck(rawContent, state.retrievedContent);
  const requiresHumanReview = state.confidence < 0.5 || !grounding.grounded;

  if (!grounding.grounded) {
    log.warn(
      { ungroundedNumbers: grounding.ungroundedNumbers, confidence: grounding.confidence },
      "Hallucination guard triggered — flagging for human review",
    );
  }

  // Append a soft disclaimer when the response is ungrounded but not blocked
  const content =
    !grounding.grounded && grounding.ungroundedNumbers.length > 0
      ? `${rawContent}\n\n(Please verify this information at cpf.gov.sg or call 1800-227-1188.)`
      : rawContent;

  // Write to cache only when grounded and not requiring human review
  if (grounding.grounded && !requiresHumanReview) {
    await writeQueryCache({ hash: cacheHash, response: content, intent, lang: language }).catch(() => null);
  }

  return {
    content,
    agentName: "query",
    confidence: Math.min(state.confidence, grounding.confidence),
    requiresHumanReview,
    metadata: {
      intent,
      navigationUrl: state.navigationUrl,
      pipeline,
      grounded: grounding.grounded,
      ungroundedNumbers: grounding.ungroundedNumbers,
    },
    intent,
    navigationUrl: state.navigationUrl,
    fromCache: false,
  };
}
