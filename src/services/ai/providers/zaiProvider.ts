import { getIntegrationConfig } from "../../../config/integration.js";
import { chatComplete } from "../llmClient.js";
import type { AiChatOptions, AiChatResult, AiProvider, ChatMessage } from "./types.js";

/**
 * z.ai GLM provider — the production-ready brain today. Thin wrapper over the
 * existing OpenAI-compatible llmClient (which reads LLM_BASE_URL / LLM_API_KEY).
 * Answers are grounded in MongoDB by the chatbot/copilot layer above this.
 */
export function createZaiProvider(): AiProvider {
  return {
    kind: "zai",
    isReady(): boolean {
      const { zai } = getIntegrationConfig();
      return Boolean(zai.baseUrl && zai.apiKey);
    },
    async chat(messages: ChatMessage[], opts: AiChatOptions = {}): Promise<AiChatResult> {
      const result = await chatComplete(messages, {
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });
      return { content: result.content, model: result.model, provider: "zai", usage: result.usage };
    },
  };
}
