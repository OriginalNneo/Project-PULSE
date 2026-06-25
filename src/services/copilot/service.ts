import { createServiceLogger } from "../../shared/logger.js";
import { getCustomer } from "../../data/customers/repository.js";
import type { CustomerDetail } from "../../data/customers/types.js";
import { searchKnowledge, searchTerminology, type KnowledgeMatch } from "../../data/knowledge/repository.js";
import type { CpfTerm } from "../../data/docstore/types.js";
import { chatComplete, isLlmConfigured, llmModel, type ChatMessage } from "../ai/llmClient.js";

const log = createServiceLogger("copilot");

export interface CopilotRequest {
  question: string;
  userId?: string;
  /** Conversation history (most recent last), excluding the new question. */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface CopilotCitation {
  docId: string;
  title: string;
  topic: string;
  sectionKey: string;
  sourceUrl: string;
  score: number;
}

export interface CopilotMember {
  id: string;
  alias: string;
  ageBracket: string;
  tier: string;
  preferredLanguage: string;
}

export interface CopilotResult {
  answer: string;
  citations: CopilotCitation[];
  terminology: CpfTerm[];
  navigation: string[];
  member: CopilotMember | null;
  model: string | null;
  source: "llm" | "fallback";
  groundedInKnowledge: boolean;
}

const PERSONAL_HINTS = /\b(my|mine|i have|i am|i'm|am i|do i|my own|balance|owe|i owe|my account|my case|my cpf|how much do i)\b/i;

function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `S$${Math.round(n).toLocaleString()}`;
}

function buildMemberBlock(member: CustomerDetail): string {
  const a = member.cpfAccount;
  const lines = [
    `- Alias: ${member.displayAlias}`,
    `- Age bracket: ${member.ageBracket} (age ${member.age})`,
    `- Support tier: ${member.vulnerabilityTier}`,
    `- Preferred language: ${member.preferredLanguage}${member.dialect ? `; dialect: ${member.dialect}` : ""}`,
  ];
  if (a) {
    lines.push(
      `- CPF balances: OA ${money(a.oaBalance)}, SA ${money(a.saBalance)}, MA ${money(a.maBalance)}, RA ${money(a.raBalance)}; Total ${money(a.total)}`,
    );
    if (a.retirementSumTarget) {
      lines.push(
        `- Retirement: target ${a.retirementSumTarget} (${money(a.retirementSumAmount)}), CPF LIFE plan ${a.cpfLifePlan ?? "not chosen"}, est. monthly payout ${money(a.monthlyPayoutEstimate)} from age ${a.payoutEligibilityAge}`,
      );
    }
    lines.push(`- Basic Healthcare Sum that applies: ${money(a.bhsApplicable)}`);
  }
  const openCases = member.cases.filter((c) => c.status === "open" || c.status === "in_progress");
  if (openCases.length > 0) {
    lines.push(`- Open cases: ${openCases.map((c) => `"${c.title}" (${c.priority})`).join("; ")}`);
  }
  return lines.join("\n");
}

function buildKnowledgeBlock(matches: KnowledgeMatch[]): string {
  return matches
    .map((m, i) => `[${i + 1}] ${m.title} — ${m.summary}\n    Facts: ${m.keyFacts.join(" | ")}\n    Source: ${m.sourceUrl}`)
    .join("\n");
}

const SYSTEM_PROMPT = `You are PULSE Copilot, an assistant for Singapore CPF (Central Provident Fund) members and the Customer Service Officers (CSOs) who help them.

Answer ONLY using the CPF KNOWLEDGE and MEMBER CONTEXT provided in the user message. Follow these rules strictly:
- Use plain, simple language at a Primary 6 reading level. Short sentences. Be warm and respectful.
- If the question is about the member's own balances, payouts, or cases, use MEMBER CONTEXT. If the question is personal but no MEMBER CONTEXT is given, say you need the member's record opened first.
- Never invent CPF figures, eligibility decisions, or rules. If the provided knowledge does not cover it, say so plainly and suggest checking the CPF website or speaking to a human officer.
- Refer to the CPF topics you used by their titles.
- Never ask for passwords, Singpass, or OTP. If the question hints at a scam, give a short safety reminder.
- Keep answers concise (under ~180 words) unless clear step-by-step guidance is needed.`;

export async function answerQuestion(req: CopilotRequest): Promise<CopilotResult> {
  const navigation: string[] = [];
  const question = req.question.trim();
  navigation.push(`Interpreted the question: "${question.slice(0, 120)}"`);

  // 1. Navigate the CPF knowledge store (MongoDB document model).
  const matches = await searchKnowledge(question, 5);
  const terminology = await searchTerminology(question, 3);
  navigation.push(
    matches.length > 0
      ? `Searched the CPF knowledge store → matched ${matches.length} document(s): ${matches.map((m) => m.title).join("; ")}`
      : `Searched the CPF knowledge store → no direct match (will answer generally / suggest a human officer)`,
  );

  // 2. Navigate the customer SQL store if a member is in context.
  let member: CustomerDetail | null = null;
  if (req.userId) {
    member = getCustomer(req.userId);
    if (member) {
      navigation.push(
        `Loaded member ${member.displayAlias} from the SQLite customer store (CPF accounts + ${member.cases.length} case(s))`,
      );
    } else {
      navigation.push(`Member id ${req.userId} was not found in the customer store`);
    }
  } else if (PERSONAL_HINTS.test(question)) {
    navigation.push("Question looks personal but no member is selected — answering generally");
  }

  const citations: CopilotCitation[] = matches.map((m) => ({
    docId: m.docId,
    title: m.title,
    topic: m.topic,
    sectionKey: m.sectionKey,
    sourceUrl: m.sourceUrl,
    score: m.score,
  }));

  const memberSummary: CopilotMember | null = member
    ? {
        id: member.id,
        alias: member.displayAlias,
        ageBracket: member.ageBracket,
        tier: member.vulnerabilityTier,
        preferredLanguage: member.preferredLanguage,
      }
    : null;

  // 3. Try the live LLM; fall back to a deterministic grounded answer.
  if (isLlmConfigured()) {
    try {
      const knowledgeBlock = matches.length > 0 ? buildKnowledgeBlock(matches) : "(no matching CPF knowledge found)";
      const terminologyBlock =
        terminology.length > 0 ? terminology.map((t) => `- ${t.term}: ${t.plainEnglish}`).join("\n") : "(none)";
      const memberBlock = member ? buildMemberBlock(member) : "(no member selected)";

      const userContent = [
        `QUESTION:\n${question}`,
        `\nCPF KNOWLEDGE:\n${knowledgeBlock}`,
        `\nTERMINOLOGY:\n${terminologyBlock}`,
        `\nMEMBER CONTEXT:\n${memberBlock}`,
        `\nAnswer the question grounded strictly in the above.`,
      ].join("\n");

      const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
      for (const turn of req.history ?? []) {
        messages.push({ role: turn.role, content: turn.content });
      }
      messages.push({ role: "user", content: userContent });

      navigation.push("Generated a grounded answer with the language model (z.ai GLM)");
      const result = await chatComplete(messages);
      return {
        answer: result.content,
        citations,
        terminology,
        navigation,
        member: memberSummary,
        model: llmModel(),
        source: "llm",
        groundedInKnowledge: matches.length > 0,
      };
    } catch (error) {
      log.warn({ err: (error as Error).message }, "LLM call failed — using deterministic fallback");
      navigation.push("Language model unavailable — composed a grounded answer from retrieved knowledge");
    }
  } else {
    navigation.push("No language model configured — composed a grounded answer from retrieved knowledge");
  }

  return {
    answer: buildFallbackAnswer(question, matches, member),
    citations,
    terminology,
    navigation,
    member: memberSummary,
    model: null,
    source: "fallback",
    groundedInKnowledge: matches.length > 0,
  };
}

function buildFallbackAnswer(question: string, matches: KnowledgeMatch[], member: CustomerDetail | null): string {
  if (matches.length === 0) {
    return "I could not find CPF information that answers that. Please check the CPF website at cpf.gov.sg, or I can connect you with a Customer Service Officer who can help.";
  }
  const top = matches[0]!;
  const parts = [`Here is what the CPF information says about "${top.topic}":`, "", top.summary, ""];
  parts.push("Key points:");
  for (const fact of top.keyFacts.slice(0, 4)) {
    parts.push(`• ${fact}`);
  }
  if (member?.cpfAccount && PERSONAL_HINTS.test(question)) {
    const a = member.cpfAccount;
    parts.push("", `For ${member.displayAlias}: OA ${money(a.oaBalance)}, MA ${money(a.maBalance)}, RA ${money(a.raBalance)} (total ${money(a.total)}).`);
  }
  parts.push("", `Source: ${top.sourceUrl}`);
  return parts.join("\n");
}
