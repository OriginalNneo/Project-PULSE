/**
 * Escalation analyzer — decides whether to offer a CPF officer connection.
 *
 * Five layers, checked in priority order:
 *   1. Personal data request  — user asks about their own account details
 *   2. Life event             — death, disability, divorce, emigration, bankruptcy
 *   3. Explicit request       — user directly asks for a human / officer
 *   4. Complaint / dispute    — error in account, wrong deduction, appeal
 *   5. Genuine bot failure    — low confidence AND hedging reply
 *
 * When triage is provided (Category 2 or 3), it acts as a fallback: if none of
 * the five layers fire, the triage offerText is used so the button still appears.
 * Category 1 triage queries never get a button from this path.
 *
 * General informational questions ("what is CPF LIFE?") never trigger escalation.
 */
import type { TriageResult } from "../triage/classifier.js";

export type EscalationReason =
  | "personal_data"
  | "life_event"
  | "explicit_request"
  | "complaint"
  | "bot_failure"
  | null;

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason: EscalationReason;
  /** Sentence to append to the reply explaining the offer. null = no button shown. */
  offerText: string | null;
}

// ── Layer keyword sets ────────────────────────────────────────────────────────

const PERSONAL_DATA: readonly RegExp[] = [
  /\bmy (cpf |oa |sa |ma |ra |ordinary|special|medisave|retirement)?\b(balance|amount|savings|payout|contribution)/i,
  /\bhow much (do i have|is in my|have i|did i contribute)/i,
  /\bcheck my (cpf|account|balance|contribution|payout)/i,
  /\bview my (cpf|account|balance|statement)/i,
  /\bwhat is my (cpf|balance|payout|contribution)/i,
  /\bmy monthly payout/i,
  /\bmy retirement sum/i,
  /\bhow much (will|would) i (get|receive)/i,
];

const LIFE_EVENTS: readonly RegExp[] = [
  /\b(death|deceased|passed away|died|dying)\b/i,
  /\b(terminal illness|terminally ill)\b/i,
  /\b(total permanent disabilit|tpd\b|severely disabled|disability claim)/i,
  /\b(divorce|divorced|legal separation)\b/i,
  /\b(bankrupt|bankruptcy|insolvency)\b/i,
  /\b(leaving singapore|emigrat|renounce citizenship|give up pr|surrender pr)\b/i,
  /\b(intestate|estate|probate|letters of administration)\b/i,
  /\b(my (spouse|husband|wife|parent|father|mother) (died|passed|deceased))/i,
  /\b(nominee died|beneficiary died)\b/i,
];

const EXPLICIT_REQUESTS: readonly RegExp[] = [
  /\b(speak|talk|chat) (to|with) (a |an |the )?(human|officer|agent|person|staff|advisor)/i,
  /\b(want|need|like) (a |an )?(human|officer|agent|person|staff|real person)/i,
  /\bconnect me (to|with)/i,
  /\breal person/i,
  /\bhuman (help|assist|support)/i,
  /\bescalate\b/i,
];

const COMPLAINTS: readonly RegExp[] = [
  /\b(wrong|incorrect|missing|error|discrepancy) (amount|contribution|deduction|payout|balance)/i,
  /\b(not (credited|received|reflected|updated))\b/i,
  /\b(dispute|complain|complaint|appeal|feedback)\b.*cpf/i,
  /\bcpf.*(dispute|complain|complaint|appeal)\b/i,
  /\b(employer (did not|didn't|never) (pay|contribute|submit))/i,
  /\b(short(paid|changed)|underpaid|over(paid|deducted))\b/i,
];

// Non-English signals for the other six supported languages (zh covers simplified +
// traditional). The analyzer receives raw citizen text from every channel, so the
// English-only patterns above silently dropped the officer button for anyone not
// typing English. 人工 excludes 人工智能 ("AI") so "are you an AI?" doesn't escalate.
const EXPLICIT_REQUESTS_I18N: readonly RegExp[] = [
  /专员|專員|客服|人工(?!智能)|真人|职员|職員|官员|官員|工作人员|工作人員|转人工|轉人工/, // zh
  /\b(pegawai|kakitangan)\b|orang sebenar/i,                                          // ms
  /அதிகாரி|மனிதருடன்|உண்மையான நபர்/,                                                    // ta
  /अधिकारी|असली इंसान|इंसान से बात/,                                                     // hi
  /ഉദ്യോഗസ്ഥ/,                                                                          // ml
  /ਅਧਿਕਾਰੀ/,                                                                            // pa
];

const PERSONAL_DATA_I18N: readonly RegExp[] = [
  /(我|自己).{0,10}(余额|餘額|结余|結餘|存款|供款|户口|戶口|账户|帳戶|派息|结存|結存)/, // zh "my …balance/account"
  /\bbaki (cpf|akaun|saya)\b|\bcaruman saya\b/i,                                      // ms
  /எனது (சிபிஎஃப்|கணக்கு|இருப்பு)|என் இருப்பு/,                                            // ta
  /मेरा (बैलेंस|खाता|योगदान)|मेरी शेष राशि/,                                                // hi
  /എന്റെ (ബാലൻസ്|അക്കൗണ്ട്)/,                                                            // ml
  /ਮੇਰਾ (ਬੈਲੇਂਸ|ਖਾਤਾ)/,                                                                  // pa
];

// Hedge phrases that indicate the bot itself signalled it couldn't fully answer
const BOT_HEDGE_PHRASES: readonly RegExp[] = [
  /i (don't|do not|cannot|can't) (have|find|access|provide) (specific|detailed|exact|personalised)/i,
  /i (don't|do not) have (enough|sufficient) information/i,
  /i('m| am) not (sure|certain|able to confirm)/i,
  /beyond what i can (answer|help|assist)/i,
  /for (more|further|detailed|specific) (information|guidance|advice|help)/i,
];

// ── Offer text per layer ──────────────────────────────────────────────────────

const OFFER_TEXT: Record<NonNullable<EscalationReason>, string> = {
  personal_data:
    "Since this involves your personal CPF account details, only a CPF officer with direct account access can give you the exact figures. Tap below to connect.",
  life_event:
    "For situations like this, personalised guidance from a CPF officer is important to make sure everything is handled correctly. Tap below to connect.",
  explicit_request:
    "Of course — let me connect you to a CPF officer now. Tap the button below.",
  complaint:
    "For account discrepancies or disputes, a CPF officer can investigate and resolve this directly. Tap below to connect.",
  bot_failure:
    "For more specific guidance on your situation, a CPF officer would be better placed to help you. Tap below if you'd like to connect.",
};

// ── Main analyzer ─────────────────────────────────────────────────────────────

export function analyzeEscalation(
  query: string,
  reply: string,
  confidence: number,
  triage?: TriageResult,
): EscalationDecision {
  const q = query.toLowerCase();

  // Layer 3 first — explicit request is highest priority signal. The i18n patterns
  // also scan the reply, so a bot promise like "我会将您转接给专员" carries the button.
  if (
    EXPLICIT_REQUESTS.some((p) => p.test(q) || p.test(reply)) ||
    EXPLICIT_REQUESTS_I18N.some((p) => p.test(query) || p.test(reply))
  ) {
    return escalate("explicit_request");
  }

  // Layer 1 — personal data
  if (PERSONAL_DATA.some((p) => p.test(q)) || PERSONAL_DATA_I18N.some((p) => p.test(query))) {
    return escalate("personal_data");
  }

  // Layer 2 — life event
  if (LIFE_EVENTS.some((p) => p.test(q))) {
    return escalate("life_event");
  }

  // Layer 4 — complaint / dispute
  if (COMPLAINTS.some((p) => p.test(q))) {
    return escalate("complaint");
  }

  // Layer 5 — bot genuinely failed (low confidence + hedging reply)
  const isLowConfidence = confidence < 0.4;
  const isHedging = BOT_HEDGE_PHRASES.some((p) => p.test(reply));
  if (isLowConfidence && isHedging) {
    return escalate("bot_failure");
  }

  // Triage fallback — Cat 2 or Cat 3 queries always get the officer button
  // even when none of the five signal layers fired above. Cat 1 queries never
  // get a button from this path.
  if (triage && (triage.category === 2 || triage.category === 3) && triage.offerText) {
    return {
      shouldEscalate: true,
      reason: "personal_data",
      offerText: triage.offerText,
    };
  }

  return { shouldEscalate: false, reason: null, offerText: null };
}

function escalate(reason: NonNullable<EscalationReason>): EscalationDecision {
  return { shouldEscalate: true, reason, offerText: OFFER_TEXT[reason] };
}

// True when the message contains a life-event or complaint/dispute signal — used
// by the urgency scorer to boost priority without re-running the full analyzer.
export function hasFinancialUrgency(text: string): boolean {
  const q = text.toLowerCase();
  return LIFE_EVENTS.some((p) => p.test(q)) || COMPLAINTS.some((p) => p.test(q));
}
