// Compatibility shim — console and copilot services import from here.
// Delegates to shared/llm/client.ts (callHermes) so we have one LLM codepath.
import { callHermes, HERMES_MODEL } from "../../shared/llm/client.js";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_BASE_URL ?? process.env.HERMES_BASE_URL);
}

export function llmModel(): string {
  return process.env.LLM_MODEL ?? process.env.HERMES_MODEL ?? HERMES_MODEL;
}

export async function chatComplete(messages: ChatMessage[]): Promise<{ content: string }> {
  const systemPrompt = messages.find((m) => m.role === "system")?.content ?? "";
  const history = messages
    .filter((m) => m.role !== "system")
    .slice(0, -1) as Array<{ role: "user" | "assistant"; content: string }>;
  const lastUser = messages.filter((m) => m.role === "user").at(-1);
  const content = await callHermes(systemPrompt, lastUser?.content ?? "", history);
  return { content };
}
