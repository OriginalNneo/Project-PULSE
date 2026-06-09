import { getIntegrationConfig } from "../../../config/integration.js";
import { createHermesProvider } from "./hermesProvider.js";
import { createZaiProvider } from "./zaiProvider.js";
import type { AiProvider } from "./types.js";

export type { AiProvider, AiChatOptions, AiChatResult, ChatMessage } from "./types.js";

/**
 * Returns the AI provider selected by AI_PROVIDER in the integration config.
 * One provider is active at a time; switch by changing the env flag + restart.
 */
export function getAiProvider(): AiProvider {
  const { aiProvider } = getIntegrationConfig();
  switch (aiProvider) {
    case "hermes":
      return createHermesProvider();
    case "zai":
    default:
      return createZaiProvider();
  }
}
