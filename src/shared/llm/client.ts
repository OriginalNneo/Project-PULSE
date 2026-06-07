import { createServiceLogger } from "../logger.js";

const log = createServiceLogger("hermes");

const HERMES_BASE_URL = process.env.HERMES_BASE_URL ?? "http://localhost:8000";
export const HERMES_MODEL = process.env.HERMES_MODEL ?? "NousResearch/Hermes-3-Llama-3.1-8B-Instruct";
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? "";

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
  log.info({ model: HERMES_MODEL, contextLength: toolResultContext.length }, "Calling Hermes (self-hosted)");

  const messages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: toolResultContext },
  ];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HERMES_API_KEY) headers["Authorization"] = `Bearer ${HERMES_API_KEY}`;

  const res = await fetch(`${HERMES_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: HERMES_MODEL,
      messages,
      max_tokens: maxTokens,
    }),
  });

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
