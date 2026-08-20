import type { Language, VulnerabilityTier } from "../../shared/types/index.js";
import { getCpfPage, getCpfLinks, getCpfKnowledge } from "../../db/proxy-client.js";
import { searchTerminology, countQueryTokens } from "../../data/knowledge/repository.js";
import type { ScopeSignal } from "./scopeGuard.js";
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
  /**
   * Deterministic evidence of how well retrieval actually covered the question. Consumed by
   * the scope guard before generation — see scopeGuard.ts. Undefined when the pipeline took a
   * path that does no knowledge search.
   */
  relevance?: ScopeSignal;
}

const CPF_HOTLINE_REDIRECT =
  "I'm sorry, I can't access your personal CPF account details. " +
  "To check your CPF balance, contributions, or payout information, " +
  "please log in at cpf.gov.sg using your SingPass. " +
  "If you'd like further assistance, I can redirect you to a CPF officer — just reply *Officer*.";

type QueryToolFn = (state: QueryPipelineState, ctx: QueryToolContext) => Promise<QueryPipelineState>;

export const queryRegistry: Record<QueryToolName, QueryToolFn> = {
  cpf_search: async (state, ctx) => {
    const [results, terms] = await Promise.all([
      getCpfKnowledge(ctx.query).catch(() => null),
      searchTerminology(ctx.query, 3).catch(() => []),
    ]);

    if (results === null || results.length === 0) {
      const page = await getCpfPage("https://www.cpf.gov.sg/member").catch(() => null);
      return {
        ...state,
        retrievedContent: page?.content ?? "Please visit cpf.gov.sg for more information.",
        confidence: page ? 0.5 : 0.2,
        // Nothing in the knowledge base matched at all. The generic cpf.gov.sg landing page
        // is a placeholder, not an answer to this question — record that as zero relevance
        // so the scope guard can refuse rather than let the LLM improvise from boilerplate.
        relevance: { topScore: 0, coverage: 0 },
      };
    }

    // Combine top 3 results so the LLM has richer context to draw from
    const knowledgeParts = results.slice(0, 3).map((r) => r.answer).join("\n\n---\n\n");
    const termGlossary = terms.length > 0
      ? `\n\nKey terms:\n${terms.map((t) => `• ${t.term}: ${t.plainEnglish}`).join("\n")}`
      : "";

    const bestGeneral = results[0]!;
    const askedGeneral = countQueryTokens(ctx.query);

    return {
      ...state,
      retrievedContent: `${knowledgeParts}${termGlossary}\n\nSource: ${bestGeneral.source_url}`,
      navigationUrl: bestGeneral.source_url,
      confidence: 0.9,
      relevance: {
        topScore: bestGeneral.score ?? 0,
        coverage: askedGeneral > 0
          ? Math.min(1, (bestGeneral.matched_terms?.length ?? 0) / askedGeneral)
          : 0,
      },
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
    if (!state.navigationUrl) return state;
    const navMessage = state.retrievedContent
      ? `${state.retrievedContent}\n\nYou can find this at: ${state.navigationUrl}`
      : `You can find this at: ${state.navigationUrl}`;
    return { ...state, retrievedContent: navMessage };
  },

  service_lookup: async (state, ctx) => {
    const [links, knowledge, terms] = await Promise.all([
      getCpfLinks(ctx.query).catch(() => null),
      getCpfKnowledge(ctx.query).catch(() => null),
      searchTerminology(ctx.query, 3).catch(() => []),
    ]);

    const parts: string[] = [];

    // Include top 3 knowledge answers for richer LLM context
    if (knowledge !== null && knowledge.length > 0) {
      parts.push(knowledge.slice(0, 3).map((k) => k.answer).join("\n\n---\n\n"));
      if (knowledge[0]!.source_url) parts.push(`More info: ${knowledge[0]!.source_url}`);
    }
    if (links !== null && links.length > 0) {
      const linkLines = links.slice(0, 3).map((l) => `• ${l.service_name}: ${l.url}`).join("\n");
      parts.push(`Relevant links:\n${linkLines}`);
    }
    if (terms.length > 0) {
      parts.push(`Key terms:\n${terms.map((t) => `• ${t.term}: ${t.plainEnglish}`).join("\n")}`);
    }

    // Relevance evidence for the scope guard. `confidence` above is effectively binary
    // ("did retrieval return any rows"), which is why it could not catch out-of-scope
    // questions: searchKnowledge keeps anything scoring > 0, so one incidental token match
    // looked identical to a real topical hit. Coverage — the share of the citizen's own
    // tokens the best document matched — separates the two.
    const best = knowledge?.[0];
    const askedTokens = countQueryTokens(ctx.query);
    const relevance: ScopeSignal = {
      topScore: best?.score ?? 0,
      coverage: best && askedTokens > 0
        ? Math.min(1, (best.matched_terms?.length ?? 0) / askedTokens)
        : 0,
    };

    return {
      ...state,
      retrievedContent: parts.length > 0 ? parts.join("\n\n") : "Please visit cpf.gov.sg for service details.",
      navigationUrl: links?.[0]?.url,
      confidence: parts.length > 0 ? 0.9 : 0.3,
      relevance,
    };
  },

  validate_output: async (state, _ctx) => {
    // Always run PII check first — even personal-data paths may carry user-provided PII
    // (e.g. "My NRIC is S1234567Z, what's my balance?"). Block before returning anything.
    const text = state.retrievedContent || state.query;
    const result = validateOutput(text);
    if (!result.safe) {
      return { ...state, blocked: true, blockReason: result.reason, outputText: text };
    }
    if (state.isPersonalDataRequest) {
      return { ...state, outputText: CPF_HOTLINE_REDIRECT, blocked: false };
    }
    return { ...state, outputText: text };
  },

  format_response: async (state, ctx) => {
    const text = state.outputText || state.retrievedContent;
    const formatted = formatForTTS(text, ctx.language, ctx.tier);
    return { ...state, outputText: formatted };
  },
};
