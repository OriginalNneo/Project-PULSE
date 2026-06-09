import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("llm");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface ChatResult {
  content: string;
  model: string;
  usage?: Record<string, unknown>;
}

export class LlmNotConfiguredError extends Error {
  constructor() {
    super("LLM is not configured (set LLM_BASE_URL and LLM_API_KEY)");
    this.name = "LlmNotConfiguredError";
  }
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY);
}

export function llmModel(): string {
  return process.env.LLM_MODEL ?? "glm-4.6";
}

/**
 * Calls an OpenAI-compatible chat completions endpoint.
 * Defaults to the z.ai GLM coding endpoint configured in .env, but works
 * against any OpenAI-shaped API (OpenAI, GLM, local llama.cpp, etc.).
 */
export async function chatComplete(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  if (!base || !key) {
    throw new LlmNotConfiguredError();
  }

  const model = opts.model ?? llmModel();
  const url = `${base.replace(/\/$/, "")}/chat/completions`;
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 30000) || 30000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 900,
        stream: false,
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      log.warn({ status: response.status, body: text.slice(0, 300) }, "LLM request failed");
      throw new Error(`LLM request failed (${response.status}): ${text.slice(0, 200)}`);
    }

    const data = JSON.parse(text) as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string }; finish_reason?: string }>;
      usage?: Record<string, unknown>;
    };
    const choice = data.choices?.[0];
    // Reasoning models (e.g. glm-5-turbo) may stream their thinking into
    // `reasoning_content` and leave `content` empty when the token budget runs
    // out mid-thought. Prefer the real answer, fall back to reasoning text.
    const content = (choice?.message?.content?.trim() || choice?.message?.reasoning_content?.trim());
    if (!content) {
      throw new Error("LLM returned an empty response");
    }

    return { content, model, usage: data.usage };
  } finally {
    clearTimeout(timer);
  }
}
