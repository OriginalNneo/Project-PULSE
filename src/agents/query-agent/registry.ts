import type { Language, VulnerabilityTier } from "../../shared/types/index.js";
import { getCpfPage, getCpfLinks, getCpfKnowledge } from "../../db/proxy-client.js";
import { validateOutput } from "../guardian/agent.js";
import { formatForTTS } from "../accessibility/agent.js";
import type { QueryToolName } from "./routes.js";

export interface QueryToolContext {
  language: Language;
  tier: VulnerabilityTier;
  query: string;
}

export interface QueryPipelineState {
  query: string;
  retrievedContent: string;
  navigationUrl?: string;
  outputText: string;
  confidence: number;
  blocked: boolean;
  blockReason?: string;
  isPersonalDataRequest: boolean;
}

const CPF_HOTLINE_REDIRECT =
  "I'm sorry, I can't access your personal CPF account details. " +
  "To check your CPF balance, contributions, or payout information, " +
  "please log in at cpf.gov.sg using your SingPass, or call the CPF hotline at 1800-227-1188 (Mon–Fri, 8am–5:30pm).";

type QueryToolFn = (state: QueryPipelineState, ctx: QueryToolContext) => Promise<QueryPipelineState>;

export const queryRegistry: Record<QueryToolName, QueryToolFn> = {
  cpf_search: async (state, ctx) => {
    const results = await getCpfKnowledge(ctx.query).catch(() => null);
    if (results === null || results.length === 0) {
      const page = await getCpfPage("https://www.cpf.gov.sg/member").catch(() => null);
      return {
        ...state,
        retrievedContent: page?.content ?? "Please visit cpf.gov.sg for more information.",
        confidence: page ? 0.5 : 0.2,
      };
    }
    const top = results[0]!;
    return {
      ...state,
      retrievedContent: `${top.answer}\n\nSource: ${top.source_url}`,
      navigationUrl: top.source_url,
      confidence: 0.85,
    };
  },

  hyperlink_lookup: async (state, ctx) => {
    const links = await getCpfLinks(ctx.query).catch(() => null);
    if (links === null || links.length === 0) return state;
    const best = links[0]!;
    return {
      ...state,
      retrievedContent: `${best.service_name}: ${best.description}`,
      navigationUrl: best.url,
      confidence: 0.9,
    };
  },

  cpf_navigate: async (state, _ctx) => {
    // Adds navigation instruction using the URL already found by hyperlink_lookup
    if (!state.navigationUrl) return state;
    const navMessage = state.retrievedContent
      ? `${state.retrievedContent}\n\nYou can find this at: ${state.navigationUrl}`
      : `You can find this at: ${state.navigationUrl}`;
    return { ...state, retrievedContent: navMessage };
  },

  service_lookup: async (state, ctx) => {
    const links = await getCpfLinks(ctx.query).catch(() => null);
    const knowledge = await getCpfKnowledge(ctx.query).catch(() => null);

    const parts: string[] = [];
    if (knowledge !== null && knowledge.length > 0) {
      parts.push(knowledge[0]!.answer);
      if (knowledge[0]!.source_url) parts.push(`More info: ${knowledge[0]!.source_url}`);
    }
    if (links !== null && links.length > 0) {
      parts.push(`Apply or view: ${links[0]!.url}`);
    }

    return {
      ...state,
      retrievedContent: parts.length > 0 ? parts.join("\n\n") : "Please visit cpf.gov.sg for service details.",
      navigationUrl: links?.[0]?.url,
      confidence: parts.length > 0 ? 0.9 : 0.3,
    };
  },

  validate_output: async (state, _ctx) => {
    // Personal data requests: guardian injects hotline redirect instead of blocking
    if (state.isPersonalDataRequest) {
      return { ...state, outputText: CPF_HOTLINE_REDIRECT, blocked: false };
    }

    const text = state.retrievedContent || state.query;
    const result = validateOutput(text);
    if (!result.safe) {
      return { ...state, blocked: true, blockReason: result.reason, outputText: text };
    }
    return { ...state, outputText: text };
  },

  format_response: async (state, ctx) => {
    const text = state.outputText || state.retrievedContent;
    const formatted = formatForTTS(text, ctx.language, ctx.tier);
    return { ...state, outputText: formatted };
  },
};
