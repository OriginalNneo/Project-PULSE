import type { Language, VulnerabilityTier } from "../../shared/types/index.js";
import type { ConversationMessage, AgentResponse } from "../shared/types.js";
import { createServiceLogger } from "../../shared/logger.js";
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
}

export async function runQueryAgent(
  messages: ConversationMessage[],
  ctx: QueryContext,
): Promise<AgentResponse & { intent: QueryIntent; navigationUrl?: string }> {
  const lastMessage = messages.filter((m) => m.role === "user").at(-1);
  const query = lastMessage?.content ?? "";
  const language = ctx.language ?? "en";

  const { intent, pipeline } = selectQueryPipeline(query);

  log.info({ userId: ctx.userId, intent, pipeline }, "Query pipeline selected");

  const toolCtx: QueryToolContext = {
    language,
    tier: ctx.vulnerabilityTier,
    query,
  };

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

  const finalText = state.outputText || state.retrievedContent;

  return {
    content: finalText,
    agentName: "query",
    confidence: state.confidence,
    requiresHumanReview: state.confidence < 0.5,
    metadata: {
      intent,
      navigationUrl: state.navigationUrl,
      pipeline,
    },
    intent,
    navigationUrl: state.navigationUrl,
  };
}
