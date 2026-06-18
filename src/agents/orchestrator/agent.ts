import type { Language, Dialect, VulnerabilityTier } from "../../shared/types/index.js";
import type { RoutingContext, ConversationMessage, AgentResponse, LanguageAgentResponse } from "../shared/types.js";
import { registry } from "./registry.js";
import { classifyIntent, detectLanguage, detectDialect } from "./router.js";
import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("orchestrator");

export async function handleUserMessage(
  messages: ConversationMessage[],
  context: {
    userId: string;
    tenantId: string;
    vulnerabilityTier: VulnerabilityTier;
    language?: Language;
    dialect?: Dialect;
  },
): Promise<AgentResponse> {
  const language = context.language ?? detectLanguage(messages);
  const dialect = context.dialect ?? detectDialect(messages, language);
  const intent = classifyIntent(messages);

  log.info(
    { userId: context.userId, language, dialect, intent: intent.domain, confidence: intent.confidence },
    "Routing decision",
  );

  if (intent.confidence < 0.3) {
    return {
      content: "I'm not sure I understood your question. Could you rephrase it, or let me connect you with a human agent who can help?",
      agentName: "orchestrator",
      confidence: intent.confidence,
      requiresHumanReview: true,
      metadata: { reason: "low_confidence" },
    };
  }

  if (intent.domain === "general" || intent.domain === "unclear") {
    return {
      content: "I need a little more detail before I can route this safely. Let me connect you with a human agent.",
      agentName: "orchestrator",
      confidence: intent.confidence,
      requiresHumanReview: true,
      metadata: { reason: "non_domain_intent", domain: intent.domain },
    };
  }

  const domainAgents = registry.findByDomain(intent.domain);
  if (domainAgents.length === 0) {
    return {
      content: "I couldn't find a specialist for that topic. Let me connect you with a human agent.",
      agentName: "orchestrator",
      confidence: 0,
      requiresHumanReview: true,
      metadata: { reason: "no_domain_agent" },
    };
  }

  const domainAgent = domainAgents[0];
  if (!domainAgent) {
    return {
      content: "I couldn't find a specialist for that topic. Let me connect you with a human agent.",
      agentName: "orchestrator",
      confidence: 0,
      requiresHumanReview: true,
      metadata: { reason: "no_domain_agent" },
    };
  }

  const response = await invokeDomainAgent(domainAgent.name, {
    userId: context.userId,
    tenantId: context.tenantId,
    language,
    dialect,
    vulnerabilityTier: context.vulnerabilityTier,
    conversationHistory: messages,
    detectedIntent: intent,
    requiresHumanFallback: false,
  });

  return response;
}

async function invokeDomainAgent(
  agentName: string,
  context: RoutingContext,
): Promise<AgentResponse> {
  const domainContent = `[${agentName}] Processing your ${context.detectedIntent.domain} query...`;

  let languageContext: LanguageAgentResponse | null = null;
  if (context.detectedIntent.keywords.length > 0 && context.language !== "en") {
    const firstKeyword = context.detectedIntent.keywords[0];
    if (!firstKeyword) {
      return {
        content: domainContent,
        agentName,
        confidence: context.detectedIntent.confidence,
        requiresHumanReview: context.detectedIntent.confidence < 0.7,
        metadata: {
          language: context.language,
          dialect: context.dialect,
          domain: context.detectedIntent.domain,
          languageContext: false,
        },
      };
    }

    languageContext = await invokeLanguageOrDialectAgent(
      firstKeyword,
      context.detectedIntent.domain as "tax" | "health" | "housing" | "employment" | "legal",
      context.language,
      context.dialect,
      context.vulnerabilityTier,
    );
  }

  const simplifiedContent = await invokeAccessibilityAgent(
    languageContext?.plainExplanation ?? domainContent,
    context.language,
    context.vulnerabilityTier,
  );

  const safetyResult = await invokeGuardianAgent(simplifiedContent);
  if (!safetyResult.safe) {
    log.warn({ userId: context.userId, reason: safetyResult.reason }, "Guardian blocked response");
    return {
      content: "Your query is being reviewed. A human agent will follow up shortly.",
      agentName: "guardian",
      confidence: 1,
      requiresHumanReview: true,
      metadata: { reason: safetyResult.reason },
    };
  }

  return {
    content: simplifiedContent,
    agentName: agentName,
    confidence: context.detectedIntent.confidence,
    requiresHumanReview: context.detectedIntent.confidence < 0.7,
    metadata: {
      language: context.language,
      dialect: context.dialect,
      domain: context.detectedIntent.domain,
      languageContext: languageContext ? true : false,
    },
  };
}

async function invokeLanguageOrDialectAgent(
  term: string,
  domain: "tax" | "health" | "housing" | "employment" | "legal",
  language: Language,
  dialect: Dialect | undefined,
  tier: VulnerabilityTier,
): Promise<LanguageAgentResponse | null> {
  if (dialect) {
    const dialectAgents = registry.findByDialect(dialect);
    if (dialectAgents.length > 0) {
      log.info({ dialect, term, domain }, "Routing to dialect agent");
      return {
        translation: `[${dialect} translation of "${term}"]`,
        plainExplanation: `[${dialect} plain explanation of "${term}" in ${domain} context]`,
        dialectTerm: `[${dialect} term]`,
        culturalNote: `[Cultural context for ${dialect}]`,
        parentLanguageEquivalent: `[Parent language equivalent]`,
      };
    }
  }

  const languageAgents = registry.findByLanguage(language);
  if (languageAgents.length > 0) {
    log.info({ language, term, domain }, "Routing to language agent");
    return {
      translation: `[${language} translation of "${term}"]`,
      plainExplanation: `[${language} plain explanation of "${term}" in ${domain} context]`,
    };
  }

  return null;
}

async function invokeAccessibilityAgent(
  content: string,
  language: Language,
  tier: VulnerabilityTier,
): Promise<string> {
  log.info({ language, tier }, "Routing to accessibility agent");
  return content;
}

async function invokeGuardianAgent(content: string): Promise<{ safe: boolean; reason?: string }> {
  log.info("Routing to guardian agent");
  return { safe: true };
}
