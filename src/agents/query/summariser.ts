import { getSessionsByUser, getConversationLog } from "../../db/proxy-client.js";
import { callHermes } from "../../shared/llm/client.js";
import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("summariser");

const SUMMARISER_SYSTEM_PROMPT = `You summarise previous CPF chatbot conversations for a returning user.
Output 2-4 concise bullet points in English covering:
- What the user needed help with
- Whether they were escalated to a human officer
- Whether the issue was resolved or left open
- Any CPF schemes or topics mentioned
Keep it factual, under 120 words total. No preamble.`;

export async function getPreviousSessionContext(
  userId: string,
  currentSessionId: string,
): Promise<string | null> {
  // Fetch recent sessions for this user, skipping the current one
  const sessions = await getSessionsByUser(userId).catch(() => null);
  if (!sessions || sessions.length === 0) return null;

  const previous = sessions.filter((s) => s.sessionId !== currentSessionId).slice(0, 2);
  if (previous.length === 0) return null;

  // Fetch conversation logs for each previous session
  const allMessages: string[] = [];
  for (const session of previous) {
    const logs = await getConversationLog(session.sessionId).catch(() => null);
    if (!logs || logs.length === 0) continue;

    for (const log of logs) {
      const messages = log.messages as Array<{ role: string; content: string }>;
      const snippet = messages
        .slice(0, 6) // cap per-session to avoid blowing the context
        .map((m) => `${m.role === "user" ? "User" : "Bot"}: ${m.content}`)
        .join("\n");
      allMessages.push(snippet);
    }
  }

  if (allMessages.length === 0) return null;

  const transcript = allMessages.join("\n---\n");

  log.info({ userId, sessions: previous.length }, "Summarising previous sessions");

  const summary = await callHermes(
    SUMMARISER_SYSTEM_PROMPT,
    `Previous conversation transcript:\n\n${transcript}`,
    [],
    256,
  ).catch((err: unknown) => {
    log.error(err, "Session summarisation failed");
    return null;
  });

  return summary ?? null;
}
