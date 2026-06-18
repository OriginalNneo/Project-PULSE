import { randomUUID } from "node:crypto";
import { createServiceLogger } from "../../shared/logger.js";
import { getCustomer } from "../../data/customers/repository.js";
import { searchKnowledge, searchTerminology } from "../../data/knowledge/repository.js";
import { getAiProvider } from "../ai/providers/index.js";
import type { ChatMessage } from "../ai/providers/types.js";
import { analyzeMessage } from "./analysis.js";
import { findSessionByChannelUser, getSession, saveSession } from "./repository.js";
import { createEscalation } from "../escalation/service.js";
import type {
  ChatMessageInput,
  ChatMessageResult,
  ChatSession,
  ChatTurn,
} from "./types.js";

const log = createServiceLogger("chatbot");

const SYSTEM_PROMPT = `You are the CPF Integrated Assistant — a warm, plain-spoken chatbot for Singapore CPF (Central Provident Fund) members.

Rules:
- Answer ONLY from the CPF KNOWLEDGE and MEMBER CONTEXT provided. Never invent figures, rules, or eligibility decisions.
- Plain English, Primary 6 reading level. Short sentences. Respectful and reassuring.
- If the question is personal but no member context is given, say the member's record needs to be opened first.
- If the knowledge does not cover it, say so plainly — do not guess.
- Never ask for passwords, Singpass, or OTP. If a message hints at a scam, give a brief safety reminder.
- Keep it under ~150 words unless step-by-step guidance is needed.
- If the request is complex, private, or a dispute, reassure the citizen that a Customer Correspondence Unit officer will follow up.`;

function maskNric(seed: string): string {
  // The real NRIC is never stored here; produce a stable masked label for display.
  const digits = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 1000;
  return `S${String(digits).padStart(3, "0")}••••H`;
}

function buildKnowledgeBlock(matches: Awaited<ReturnType<typeof searchKnowledge>>): string {
  if (matches.length === 0) return "(no matching CPF knowledge found)";
  return matches
    .map((m, i) => `[${i + 1}] ${m.title} — ${m.summary}\n    Facts: ${m.keyFacts.join(" | ")}\n    Source: ${m.sourceUrl}`)
    .join("\n");
}

function buildMemberBlock(memberId: string | undefined): string {
  if (!memberId) return "(no member selected)";
  const member = getCustomer(memberId);
  if (!member) return `(member ${memberId} not found)`;
  const a = member.cpfAccount;
  const lines = [
    `- Alias: ${member.displayAlias}`,
    `- Age bracket: ${member.ageBracket} (age ${member.age})`,
    `- Support tier: ${member.vulnerabilityTier}`,
    `- Preferred language: ${member.preferredLanguage}`,
  ];
  if (a) {
    lines.push(
      `- CPF balances: OA S$${Math.round(a.oaBalance)}, SA S$${Math.round(a.saBalance)}, MA S$${Math.round(a.maBalance)}, RA S$${Math.round(a.raBalance)}`,
    );
  }
  return lines.join("\n");
}

async function loadSession(input: ChatMessageInput): Promise<ChatSession> {
  if (input.sessionId) {
    const existing = await getSession(input.sessionId);
    if (existing) return existing;
  }
  // Resume an open session for the same channel identity (e.g. Telegram chat).
  if (input.channelUserId) {
    const open = await findSessionByChannelUser(input.channel, input.channelUserId);
    if (open) return open;
  }

  const now = new Date().toISOString();
  const seed = input.channelUserId ?? input.memberId ?? randomUUID();
  const displayName =
    input.displayName ??
    (input.memberId ? getCustomer(input.memberId)?.displayAlias ?? "CPF Member" : "CPF Member");

  return {
    sessionId: `chat_${randomUUID()}`,
    channel: input.channel,
    channelUserId: input.channelUserId,
    memberId: input.memberId,
    displayName,
    maskedNric: maskNric(seed),
    status: "active",
    emotion: "neutral",
    confidence: 50,
    urgency: "low",
    summary: "",
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Handle one inbound citizen message: ground it in MongoDB CPF knowledge,
 * analyse it (emotion / confidence / urgency / complexity), answer SIMPLE
 * requests with the active AI provider, and ESCALATE complex/private ones to a
 * CCU officer. Every turn is persisted to the document store so the officer
 * dashboard sees the full context window.
 */
export async function handleChatMessage(input: ChatMessageInput): Promise<ChatMessageResult> {
  const session = await loadSession(input);
  const now = new Date().toISOString();
  const question = input.message.trim();

  // 1. Retrieve from the CPF knowledge store (MongoDB document model).
  const matches = await searchKnowledge(question, 5);
  const terminology = await searchTerminology(question, 3);

  // 2. Classify: emotion, urgency, confidence, and whether to escalate.
  const analysis = analyzeMessage(question, matches.length);

  // Record the citizen's turn.
  const userTurn: ChatTurn = { role: "user", content: question, at: now };
  session.turns.push(userTurn);

  // 3. If it's already escalated, the bot stops answering — the officer owns it.
  if (session.status === "escalated") {
    session.updatedAt = now;
    session.summary = session.summary || analysis.topic;
    await saveSession(session);
    return {
      sessionId: session.sessionId,
      reply: "Your request has been passed to a Customer Correspondence Unit officer, who will continue with you shortly.",
      status: session.status,
      analysis,
      escalated: true,
      escalationId: session.escalationId,
      source: "system",
      citations: matches.slice(0, 3).map((m) => ({ title: m.title, sourceUrl: m.sourceUrl })),
    };
  }

  // 4. Generate the reply (SIMPLE path) — grounded answer via the AI provider,
  //    with a deterministic fallback when no provider is ready / it fails.
  let reply: string;
  let source: string;
  if (!analysis.complex) {
    const generated = await generateAnswer(question, session, matches, terminology);
    reply = generated.reply;
    source = generated.source;
  } else {
    reply =
      "Thank you for sharing this. Because your request is specific to your situation, I'm connecting you with a Customer Correspondence Unit officer who can look into it properly. They will continue with you on this chat.";
    source = "escalation";
  }

  // Record the assistant's turn with the analysis attached (drives the card).
  session.turns.push({ role: "assistant", content: reply, at: new Date().toISOString(), analysis });

  // 5. Update the live card fields the dashboard renders.
  session.emotion = analysis.emotion;
  session.confidence = analysis.confidence;
  session.urgency = analysis.urgency;
  session.summary = analysis.topic;
  session.updatedAt = new Date().toISOString();

  // 6. Escalate complex/private/unique requests to a CCU officer.
  let escalated = false;
  if (analysis.complex) {
    try {
      const escalation = await createEscalation(session, analysis);
      session.status = "escalated";
      session.escalationId = escalation.escalationId;
      escalated = true;
    } catch (error) {
      log.error({ err: (error as Error).message }, "Escalation failed — keeping session active");
    }
  }

  await saveSession(session);

  return {
    sessionId: session.sessionId,
    reply,
    status: session.status,
    analysis,
    escalated,
    escalationId: session.escalationId,
    source,
    citations: matches.slice(0, 3).map((m) => ({ title: m.title, sourceUrl: m.sourceUrl })),
  };
}

async function generateAnswer(
  question: string,
  session: ChatSession,
  matches: Awaited<ReturnType<typeof searchKnowledge>>,
  terminology: Awaited<ReturnType<typeof searchTerminology>>,
): Promise<{ reply: string; source: string }> {
  const provider = getAiProvider();
  if (provider.isReady()) {
    try {
      const knowledgeBlock = buildKnowledgeBlock(matches);
      const terminologyBlock =
        terminology.length > 0 ? terminology.map((t) => `- ${t.term}: ${t.plainEnglish}`).join("\n") : "(none)";
      const memberBlock = buildMemberBlock(session.memberId);

      const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
      // Replay recent conversation for continuity.
      for (const turn of session.turns.slice(-8)) {
        if (turn.role === "user" || turn.role === "assistant") {
          messages.push({ role: turn.role, content: turn.content });
        }
      }
      messages.push({
        role: "user",
        content: [
          `QUESTION:\n${question}`,
          `\nCPF KNOWLEDGE:\n${knowledgeBlock}`,
          `\nTERMINOLOGY:\n${terminologyBlock}`,
          `\nMEMBER CONTEXT:\n${memberBlock}`,
          `\nAnswer grounded strictly in the above.`,
        ].join("\n"),
      });

      // glm-5-turbo is a reasoning model — let it think as long as it needs.
      // The Telegram path shows a live "thinking" animation while it works, so
      // latency is covered by UX rather than by truncating the reasoning.
      const result = await provider.chat(messages, { maxTokens: 8000 });
      return { reply: result.content, source: result.provider };
    } catch (error) {
      log.warn({ err: (error as Error).message, provider: provider.kind }, "AI provider failed — using grounded fallback");
    }
  }

  // Deterministic grounded fallback — keeps the chatbot useful with no LLM key.
  if (matches.length === 0) {
    return {
      reply:
        "I couldn't find CPF information that answers that directly. You can check cpf.gov.sg, or I can connect you with a Customer Correspondence Unit officer.",
      source: "fallback",
    };
  }
  const top = matches[0]!;
  const parts = [`Here is what the CPF information says about ${top.topic}:`, "", top.summary, "", "Key points:"];
  for (const fact of top.keyFacts.slice(0, 3)) parts.push(`• ${fact}`);
  parts.push("", `Source: ${top.sourceUrl}`);
  return { reply: parts.join("\n"), source: "fallback" };
}

/** Append an officer's reply to a session (called from the officer service). */
export async function appendOfficerReply(sessionId: string, officer: string, message: string): Promise<ChatSession | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  const now = new Date().toISOString();
  session.turns.push({ role: "officer", content: message, at: now });
  session.assignedOfficer = officer;
  session.updatedAt = now;
  await saveSession(session);
  return session;
}
