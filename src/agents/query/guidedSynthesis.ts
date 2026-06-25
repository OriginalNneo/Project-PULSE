/**
 * Guided-answer synthesis.
 *
 * After the user has answered a topic's guiding questions, compose the final
 * tailored answer from: their original question + the Q&A pairs + the CPF
 * knowledge retrieved when the flow started. Same single-call pattern as
 * `runQueryAgent` (no structured output needed).
 *
 * LANGUAGE: native generation — the LLM responds directly in the user's language
 * (the delivery tail no longer translates), so no double-translation.
 */
import { callHermes } from "../../services/ai/llmClient.js";
import { BASE_SYSTEM_PROMPT } from "./agent.js";
import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("guided-synthesis");

const LANG_NAMES: Record<string, string> = {
  en: "English", zh: "Chinese (Simplified)", ms: "Malay", ta: "Tamil",
  hi: "Hindi", ml: "Malayalam", pa: "Punjabi",
};

export interface GuidedSynthesisInput {
  originalQuery: string;
  topicTitle: string;
  qa: Array<{ question: string; answer: string }>;
  knowledge: string;
  synthesisHint?: string;
  language?: string;
}

export async function synthesizeGuidedAnswer(input: GuidedSynthesisInput): Promise<string> {
  const langName = LANG_NAMES[input.language ?? "en"] ?? "the user's language";
  const systemPrompt = [
    BASE_SYSTEM_PROMPT,
    input.synthesisHint ? `Guidance for this topic (${input.topicTitle}): ${input.synthesisHint}` : null,
    `Personalise the answer using the user's answers below, but quote any figures, ages, sums or ` +
      `percentages strictly from the retrieved CPF information. Do not invent the user's account numbers. ` +
      `Respond in ${langName}.`,
  ].filter(Boolean).join("\n\n");

  const qaBlock = input.qa.map((p) => `- ${p.question} ${p.answer}`).join("\n");

  const userContext = [
    `User's original question: "${input.originalQuery}"`,
    `The user answered these guiding questions:\n${qaBlock}`,
    `Retrieved CPF information:\n${input.knowledge}`,
    "Now give a complete, tailored answer using the user's answers.",
  ].join("\n\n");

  const raw = await callHermes(systemPrompt, userContext).catch((err: unknown) => {
    log.error(err, "Guided synthesis LLM call failed");
    return "";
  });

  // Fall back to the retrieved knowledge so the user always gets something useful.
  return raw.trim() || input.knowledge;
}
