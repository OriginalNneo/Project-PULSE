import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createServiceLogger } from "../logger.js";

const log = createServiceLogger("hermes");

const HERMES_BASE_URL = process.env.LLM_BASE_URL ?? process.env.HERMES_BASE_URL ?? "http://localhost:8000";
export const HERMES_MODEL = process.env.LLM_MODEL ?? process.env.HERMES_MODEL ?? "NousResearch/Hermes-3-Llama-3.1-8B-Instruct";
const HERMES_API_KEY = process.env.LLM_API_KEY ?? process.env.HERMES_API_KEY ?? "";
const HERMES_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS ?? "", 10) || 60000;

// Load soul.md once at startup — injected as a preamble into every agent system prompt
const SOUL_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../../soul.md");
const SOUL_PREAMBLE = (() => {
  try {
    return readFileSync(SOUL_PATH, "utf-8");
  } catch {
    log.warn({ path: SOUL_PATH }, "soul.md not found — proceeding without personality preamble");
    return "";
  }
})();

export interface HermesMessage {
  role: "user" | "assistant";
  content: string;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChatResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
}

export async function callHermes(
  systemPrompt: string,
  toolResultContext: string,
  conversationHistory: HermesMessage[] = [],
  maxTokens = 1024,
): Promise<string> {
  // Prepend the soul preamble so every agent inherits PULSE's core personality
  const fullSystemPrompt = SOUL_PREAMBLE
    ? `${SOUL_PREAMBLE}\n\n---\n\n## Agent-Specific Instructions\n\n${systemPrompt}`
    : systemPrompt;

  log.info({ model: HERMES_MODEL, contextLength: toolResultContext.length }, "Calling Hermes (self-hosted)");

  const messages: OpenAIMessage[] = [
    { role: "system", content: fullSystemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: toolResultContext },
  ];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HERMES_API_KEY) headers["Authorization"] = `Bearer ${HERMES_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HERMES_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${HERMES_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages,
        max_tokens: maxTokens,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    log.error({ status: res.status, body }, "Hermes VPS request failed");
    throw new Error(`Hermes VPS returned ${res.status}`);
  }

  const data = (await res.json()) as OpenAIChatResponse;
  const content = data.choices[0]?.message?.content ?? "";

  if (!content) {
    log.warn({ finish_reason: data.choices[0]?.finish_reason }, "Hermes returned empty content");
  }

  return content;
}
