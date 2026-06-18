import type { ChatMessage } from "../llmClient.js";

export type { ChatMessage } from "../llmClient.js";

/**
 * A swappable AI backend for the integrated chatbot. z.ai GLM and Hermes.AI
 * both implement this, so the chatbot service never hard-codes a vendor —
 * the active one is chosen by AI_PROVIDER in the integration config.
 */
export interface AiProvider {
  /** Stable identifier, e.g. "zai" or "hermes". */
  readonly kind: string;
  /** Whether this provider has the credentials it needs to make live calls. */
  isReady(): boolean;
  /** Run a chat completion. May throw if the provider is unreachable. */
  chat(messages: ChatMessage[], opts?: AiChatOptions): Promise<AiChatResult>;
}

export interface AiChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AiChatResult {
  content: string;
  model: string;
  provider: string;
  usage?: Record<string, unknown>;
}
