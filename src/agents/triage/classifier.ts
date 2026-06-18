/**
 * Query triage classifier.
 *
 * Runs BEFORE the query agent to determine what kind of answer the bot
 * is capable of giving. Three categories:
 *
 *   Category 1 — Bot can fully answer from public CPF knowledge. No button.
 *                Educational, navigational, general eligibility, process guidance,
 *                calculations using numbers the user provided.
 *
 *   Category 2 — Bot answers the public/general part. Officer offered for the
 *                personal/specific part that needs account data.
 *                e.g. "Am I eligible for MRSS?", "How much will I get?"
 *
 *   Category 3 — Requires personal account access. Security boundary.
 *                Bot explains honestly WHY it can't answer, offers officer.
 *                e.g. "What's my OA balance?", "Did my employer contribute?"
 *
 * Default: Category 1 — when in doubt, let the bot try. Never suppress an
 * answer the bot is capable of giving.
 */

export type QueryCategory = 1 | 2 | 3;

export interface TriageResult {
  category: QueryCategory;
  reason: string;
  /** Hint injected into the LLM system prompt to shape the response. */
  promptHint: string | null;
  /** Offer text for the button. null = no button from triage (escalation layer decides). */
  offerText: string | null;
}

// ── Category 3 — personal account data (security boundary) ───────────────────
// These patterns mean the user is asking about THEIR OWN specific account data.
// The bot genuinely cannot access this regardless of what it knows.

const CAT3_PATTERNS: readonly RegExp[] = [
  // Balance / savings
  /\bmy (cpf |oa |sa |ma |ra |ordinary|special|medisave|retirement)?\s*(balance|amount|savings)\b/i,
  /\bhow much (do i|have i|did i) (have|saved|accumulated|contributed)\b/i,
  /\bhow much is (in my|left in my)\b/i,
  /\bwhat('s| is) (in my|my) (oa|sa|ma|ra|ordinary|special|medisave|retirement)\b/i,
  /\bcheck my (cpf|account|balance|savings)\b/i,
  /\bview my (cpf|account|statement|balance)\b/i,
  // Contribution history
  /\bmy (cpf )?contribution (history|record|status)\b/i,
  /\b(did|has) my employer (contribute|pay|submit|credit)\b/i,
  /\b(my employer (didn't|did not|never) (contribute|pay))\b/i,
  /\bemployer (missing|short|late) (contribution|payment)\b/i,
  // Personal payout — asking THEIR specific figure, not a general estimate
  /\b(what('s| is)|how much (is|will be)) my (exact |actual )?(cpf life |monthly )?payout\b/i,
  /\bhow much (will i|would i|do i) (receive|get|collect) (per month|monthly|every month)\b/i,
  /\bmy (exact|actual|specific) (payout|retirement income)\b/i,
  // Personal withdrawal
  /\bhow much can i (withdraw|take out|cash out)\b/i,
  /\bcan i (withdraw|take out) (my|some|any) (cpf|savings)\b/i,
  /\bmy (withdrawal|cpf withdrawal) (status|amount|limit)\b/i,
  // Account statements / history
  /\bmy (cpf )?statement\b/i,
  /\bmy (transaction|contribution) history\b/i,
  /\bmy (cpf )?account (details|overview|summary|history)\b/i,
];

// ── Category 2 — partially answerable (public part + personal specifics) ──────
// Bot answers general rules / framework. For THEIR specific case, officer offered.

const CAT2_PATTERNS: readonly RegExp[] = [
  // Personal eligibility — general criteria answerable, their specific case needs verification
  /\b(am|are) i (eligible|qualified|entitled) (for|to)\b/i,
  /\bdo i (qualify|meet the criteria) (for|to)\b/i,
  /\bwill i (get|receive|qualify for)\b/i,
  // Advisory — "should I" questions where general advice is possible but personal advice needs officer
  /\bshould i (top.?up|withdraw|invest|join|switch|defer|opt)\b/i,
  /\bwhat (should|would) (i|you recommend) (do|use|choose|pick)\b/i,
  /\bis it (worth|better|advisable) (to|for me)\b/i,
  /\bwhich (plan|option|scheme) (is best|should i|would you recommend) (for me|to choose)\b/i,
  // Estimates that need their personal RA/OA/SA figure — general table answerable, exact needs account
  /\bhow much (payout|income|money) (will i|would i|can i expect) (get|receive|have)\b/i,
  /\bwhat (will|would) (my|the) (monthly )?payout be\b/i,
  /\bproject(ed)? (my |my cpf )?(retirement |payout |income )\b/i,
  // "Is my X enough" — general threshold answerable, their specific amount needs account
  /\bis my (medisave|oa|sa|ra|cpf|savings) (enough|sufficient|adequate)\b/i,
  /\bdo i have enough (in my|cpf|medisave|oa|sa)\b/i,
];

// ── Public — signals this is clearly Category 1 even if ambiguous otherwise ──
// Presence of user-provided numbers shifts from Cat 2 → Cat 1 for estimates.

const USER_PROVIDED_NUMBER = /\b(i have|i've saved|i put in|my (oa|sa|ra|medisave) (is|has|balance is|has))\s*\$?[\d,]+/i;

// ── Main classifier ───────────────────────────────────────────────────────────

export function classifyQuery(query: string): TriageResult {
  // If the user provides their own numbers in the query, estimates become Cat 1
  // e.g. "If I have $200,000 in RA, how much payout?" — fully answerable
  const hasUserProvidedNumbers = USER_PROVIDED_NUMBER.test(query);

  // Check Category 3 first — highest confidence, security boundary
  const isPersonalData = CAT3_PATTERNS.some((p) => p.test(query));
  if (isPersonalData) {
    return {
      category: 3,
      reason: "personal_account_data",
      promptHint:
        "This query asks about the user's personal CPF account data (balance, contributions, payouts, history). " +
        "You cannot access personal account data for privacy and security reasons — this is a hard boundary, not a knowledge gap. " +
        "Explain this clearly and helpfully: tell the user they can log in at cpf.gov.sg/member to check their own data, " +
        "or connect to a CPF officer who has secure account access. " +
        "Do NOT attempt to guess or estimate their personal figures.",
      offerText:
        "For your personal CPF account details, a CPF officer can access your account securely. Tap below to connect.",
    };
  }

  // Check Category 2 — partially answerable (skip if user provided their own numbers)
  const isPartiallyAnswerable = !hasUserProvidedNumbers && CAT2_PATTERNS.some((p) => p.test(query));
  if (isPartiallyAnswerable) {
    return {
      category: 2,
      reason: "partial_public_answer",
      promptHint:
        "Answer the general/public aspect of this question fully using the retrieved CPF information. " +
        "After your answer, add one sentence acknowledging that the user's specific figures or eligibility " +
        "depend on their personal account details, which a CPF officer can confirm. " +
        "Keep this acknowledgment brief — the main value is your public answer.",
      offerText:
        "For your specific situation, a CPF officer can give you a personalised answer based on your account. Tap below to connect.",
    };
  }

  // Category 1 — bot handles fully, no officer offer from triage
  return {
    category: 1,
    reason: "public_knowledge",
    promptHint: null,
    offerText: null,
  };
}
