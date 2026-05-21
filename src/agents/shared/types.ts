import type { Language, Dialect, VulnerabilityTier, CorrespondenceCategory } from "../../shared/types/index.js";

export interface AgentMessage {
  messageId: string;
  correlationId: string;
  from: string;
  to: string;
  type: "request" | "response" | "handoff" | "escalation";
  payload: unknown;
  metadata: AgentMetadata;
}

export interface AgentMetadata {
  userId: string;
  tenantId: string;
  language: Language;
  dialect?: Dialect;
  vulnerabilityTier: VulnerabilityTier;
  timestamp: string;
  conversationTurn: number;
}

export interface RoutingContext {
  userId: string;
  tenantId: string;
  language: Language;
  dialect?: Dialect;
  vulnerabilityTier: VulnerabilityTier;
  correspondenceId?: string;
  conversationHistory: ConversationMessage[];
  detectedIntent: DetectedIntent;
  requiresHumanFallback: boolean;
}

export interface ConversationMessage {
  role: "user" | "agent";
  content: string;
  timestamp: string;
  agentName?: string;
}

export interface DetectedIntent {
  domain: CorrespondenceCategory | "general" | "unclear";
  confidence: number;
  keywords: string[];
}

export interface AgentRegistration {
  name: string;
  type: "domain" | "language" | "dialect" | "accessibility" | "guardian";
  version: string;
  description: string;
  capabilities: string[];
  supportedLanguages?: Language[];
  supportedDialects?: Dialect[];
  domains?: CorrespondenceCategory[];
  healthEndpoint?: string;
}

export interface LanguageAgentRequest {
  term: string;
  domain: CorrespondenceCategory;
  targetLanguage: Language;
  targetDialect?: Dialect;
  context?: string;
  vulnerabilityTier: VulnerabilityTier;
}

export interface LanguageAgentResponse {
  translation: string;
  plainExplanation: string;
  example?: string;
  culturalNote?: string;
  relatedTerms?: string[];
  dialectTerm?: string;
  parentLanguageEquivalent?: string;
}

export interface AgentResponse {
  content: string;
  agentName: string;
  confidence: number;
  requiresHumanReview: boolean;
  metadata: Record<string, unknown>;
}
