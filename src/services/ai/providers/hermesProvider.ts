import { getIntegrationConfig } from "../../../config/integration.js";
import { createServiceLogger } from "../../../shared/logger.js";
import type { AiChatOptions, AiChatResult, AiProvider, ChatMessage } from "./types.js";

const log = createServiceLogger("ai.hermes");

/**
 * Hermes.AI provider — PLACEHOLDER.
 *
 * Hermes.AI lives on the VPS and will be wired in later. The integration points
 * are already in place: set AI_PROVIDER=hermes and fill HERMES_BASE_URL /
 * HERMES_API_KEY in .env, and this adapter will call it as an OpenAI-compatible
 * endpoint. Until then `isReady()` returns false, so the chatbot service treats
 * Hermes as unavailable and uses its grounded fallback — nothing breaks.
 *
 * When Hermes is ready, no other file needs to change: the chatbot service only
 * ever talks to the AiProvider interface.
 */
export function createHermesProvider(): AiProvider {
  return {
    kind: "hermes",
    isReady(): boolean {
      const { hermes } = getIntegrationConfig();
      return Boolean(hermes.baseUrl && hermes.apiKey);
    },
    async chat(messages: ChatMessage[], opts: AiChatOptions = {}): Promise<AiChatResult> {
      const { hermes } = getIntegrationConfig();
      if (!hermes.baseUrl || !hermes.apiKey) {
        throw new Error(
          "Hermes.AI is not configured yet (set HERMES_BASE_URL and HERMES_API_KEY). " +
            "This is a placeholder until Hermes is integrated on the VPS.",
        );
      }

      // Assumes an OpenAI-compatible /chat/completions surface, same shape as z.ai.
      const url = `${hermes.baseUrl.replace(/\/$/, "")}/chat/completions`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hermes.apiKey}`,
          },
          body: JSON.stringify({
            model: hermes.model,
            messages,
            temperature: opts.temperature ?? 0.2,
            max_tokens: opts.maxTokens ?? 900,
            stream: false,
          }),
          signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
          log.warn({ status: response.status, body: text.slice(0, 200) }, "Hermes request failed");
          throw new Error(`Hermes request failed (${response.status})`);
        }
        const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }>; usage?: Record<string, unknown> };
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new Error("Hermes returned an empty response");
        }
        return { content, model: hermes.model, provider: "hermes", usage: data.usage };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
