import type { Emotion, TurnAnalysis, Urgency } from "./types.js";

/**
 * Lightweight keyword classifier + emotion/urgency detector — the "Key AI
 * Features" (emotion detection, keyword search & classifier) from the system
 * diagram, implemented deterministically so the dashboard is fully functional
 * even before a live LLM key is present. When the LLM is available the chatbot
 * service can refine these, but routing never depends on the network.
 */

const EMOTION_LEXICON: Array<{ emotion: Emotion; weight: number; terms: RegExp }> = [
  { emotion: "distressed", weight: 3, terms: /\b(desperate|help me|please help|crying|can'?t cope|losing|lost everything|emergency|urgent help|no money|cannot survive)\b/i },
  { emotion: "angry", weight: 3, terms: /\b(angry|furious|ridiculous|unacceptable|disgusting|terrible|worst|useless|scam|cheated|complain|complaint|fed up|nonsense)\b/i },
  { emotion: "anxious", weight: 2, terms: /\b(worried|worry|anxious|scared|afraid|nervous|concern|concerned|stress|stressed|panic|what if)\b/i },
  { emotion: "confused", weight: 2, terms: /\b(confused|don'?t understand|not sure|unclear|how do i|how can i|what does|why is|where do i|lost|stuck)\b/i },
  { emotion: "happy", weight: 1, terms: /\b(thank you|thanks|great|appreciate|wonderful|happy|good job|helpful)\b/i },
  { emotion: "calm", weight: 1, terms: /\b(okay|ok|alright|noted|i see|understood|sure)\b/i },
];

const URGENT_TERMS = /\b(urgent|immediately|asap|today|now|emergency|deadline|overdue|due (?:today|tomorrow)|cut ?off|terminated|rejected|blocked|cannot access|locked out)\b/i;

/**
 * Explicit "get me a human" intent — ALWAYS escalates to the CCU, regardless of
 * verb or phrasing. Two-part match: (a) a request/transfer verb OR a bare
 * "human" noun, combined with (b) a human/agent noun. Catches "refer me to a
 * real person", "connect me to an agent", "talk to staff", "is there a person
 * I can call", etc.
 */
const HUMAN_NOUN = /(real |actual |live )?(person|human|someone|somebody|agent|officer|staff|representative|rep|operator|advisor|adviser|consultant|customer service|customer support|cso|ccu|help ?desk|hotline)/i;
const HANDOFF_VERB = /\b(speak|talk|chat|connect|refer|transfer|escalate|forward|pass|put me|reach|contact|call)\b/i;
function wantsHuman(text: string): boolean {
  if (!HUMAN_NOUN.test(text)) return false;
  // A handoff verb + a human noun = clear request ("refer me to a person").
  if (HANDOFF_VERB.test(text)) return true;
  // Or a bare plea naming a human ("I need a real person", "any human there?").
  return /\b(need|want|get me|give me|is there|any|a)\b/i.test(text);
}

/** Complex / private / unique signals → escalate to a human officer. */
const COMPLEX_TERMS =
  /\b(discrepancy|dispute|disputing|rejected|rejection|reject|appeal|appealing|special case|my case|my account|my balance|specific to me|personal|medical condition|disability|deceased|death|legal|lawyer|court|fraud|hardship|waiver|exception|override|manual review|complaint|complain|unfair|wrongly|mistake on my)\b/i;

/** Topics for the keyword classifier → dashboard summary label. */
const TOPIC_RULES: Array<{ topic: string; terms: RegExp }> = [
  { topic: "Medisave / Healthcare", terms: /\b(medisave|medishield|careshield|bhs|hospital|outpatient|polyclinic|chas|medical|claim)\b/i },
  { topic: "Retirement / CPF LIFE", terms: /\b(cpf ?life|retirement|payout|frs|brs|ers|ra |retirement sum|monthly payout|age 65|55)\b/i },
  { topic: "Housing / HDB", terms: /\b(hdb|housing|flat|home|property|mortgage|oa |ordinary account|withdraw.*hous)\b/i },
  { topic: "Transfers / Top-ups", terms: /\b(transfer|top ?up|topping|voluntary contribution|sa to ra|oa to sa)\b/i },
  { topic: "Nomination", terms: /\b(nominat|beneficiar|next of kin)\b/i },
  { topic: "Statement / Account", terms: /\b(statement|balance|transaction|interest|contribution|account)\b/i },
  { topic: "Employment / Contributions", terms: /\b(employer|employment|job|salary|self-employed|workpass|mom)\b/i },
];

function detectEmotion(text: string): Emotion {
  let best: { emotion: Emotion; weight: number } | null = null;
  for (const entry of EMOTION_LEXICON) {
    if (entry.terms.test(text) && (!best || entry.weight > best.weight)) {
      best = { emotion: entry.emotion, weight: entry.weight };
    }
  }
  return best?.emotion ?? "neutral";
}

function detectTopic(text: string): string {
  for (const rule of TOPIC_RULES) {
    if (rule.terms.test(text)) return rule.topic;
  }
  return "General CPF enquiry";
}

const NEGATIVE_EMOTIONS: ReadonlySet<Emotion> = new Set(["distressed", "angry", "anxious"]);

/**
 * Classify a citizen message. `complex` true means the chatbot should escalate.
 * `confidence` is how sure the bot is it can self-serve (LOW confidence on a
 * complex/charged message → the dashboard shows it as needing a human).
 */
export function analyzeMessage(text: string, knowledgeHits: number): TurnAnalysis {
  const emotion = detectEmotion(text);
  const topic = detectTopic(text);
  const urgentSignal = URGENT_TERMS.test(text);
  const complexSignal = COMPLEX_TERMS.test(text);
  // An explicit ask for a human is the strongest escalation signal there is.
  const humanRequest = wantsHuman(text);

  const urgency: Urgency =
    urgentSignal || emotion === "distressed"
      ? "high"
      : NEGATIVE_EMOTIONS.has(emotion) || complexSignal || humanRequest
        ? "medium"
        : "low";

  // Confidence the bot can resolve it alone: starts from how well the knowledge
  // base covered the question, then penalised for complexity / strong emotion.
  let confidence = Math.min(95, 35 + knowledgeHits * 12);
  if (humanRequest) confidence = 0; // they don't want the bot — hand off.
  if (complexSignal) confidence -= 40;
  if (NEGATIVE_EMOTIONS.has(emotion)) confidence -= 15;
  if (urgentSignal) confidence -= 10;
  if (text.length < 12) confidence -= 10;
  confidence = Math.max(0, Math.min(99, Math.round(confidence)));

  // Escalate when the citizen explicitly asks for a human, or it's complex/
  // private, or the bot is not confident, or the citizen is distressed/angry.
  const complex =
    humanRequest ||
    complexSignal ||
    confidence < 35 ||
    emotion === "distressed" ||
    emotion === "angry";

  // Label the dashboard summary clearly when a human was explicitly requested.
  const finalTopic = humanRequest ? `${topic} · asked for an officer` : topic;

  return { emotion, confidence, urgency, complex, topic: finalTopic };
}
