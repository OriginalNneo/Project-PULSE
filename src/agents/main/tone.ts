/**
 * Emotion-driven tone adaptation for bot replies.
 *
 * Maps the per-message sentiment (from `scoreEmotion`: neutral/sad/frustrated/
 * angry/rage + a 0–100 score) to a SELF-CONTAINED tone directive injected into
 * the query system prompt at generation time. soul.md carries the same policy as
 * reinforcement, but each directive stands alone (no cross-reference that could
 * silently break if soul.md drifts).
 *
 * Tiers vary EMPATHY + WORDING only — never how much is answered. The emotion
 * score is a single, noisy per-message signal from an English-trained model, so a
 * false "angry/rage" read must NOT strip a legitimate answer of its figures.
 *
 * NOTE: directives deliberately do NOT tell the LLM to offer a CPF officer — the
 * officer offer + button is owned by the escalation layer (`analyzeEscalation` +
 * the >70 override in inbound.ts), which decides when a tappable button actually
 * appears. Adding an in-text offer here would double up (>70) or leave a
 * buttonless dead-end offer at the 66–70 band edge.
 */

const COMPLETENESS = "Keep the full answer and all exact figures — soften the tone, never the content.";
const NO_LABEL = "Do NOT name or label the caller's emotion back to them; empathise implicitly.";

// Trajectory-aware acknowledgement: when the caller has been upset across several
// turns (not just spiking once), open by recognising the ongoing difficulty
// WITHOUT naming the emotion or restating their history back at them. Appended to
// the tier directive only when `sustained` is true.
const SUSTAINED =
  "This frustration has built up over several messages — open by acknowledging the ongoing " +
  "difficulty (e.g. \"I know this hasn't been easy — let's get it sorted\") before the facts. " +
  "Be extra concrete and reassuring.";

/**
 * Build the tone directive for this reply.
 *
 * @param score      Effective distress score 0–100 (already trajectory-folded by
 *                   emotionTrajectory.effectiveEmotion before it reaches here).
 * @param label      Effective emotion label for `score`.
 * @param sustained  True when the caller has been upset across multiple turns —
 *                   adds an "ongoing difficulty" acknowledgement on top of the tier.
 */
export function toneDirective(score: number, label: string, sustained = false): string | null {
  const s = Math.round(score);
  const tail = sustained ? ` ${SUSTAINED}` : "";
  switch (label) {
    case "rage":
      return (
        `The caller sounds very upset (emotion ${s}/100). Lead with ONE brief, sincere apology/empathy ` +
        `line (e.g. "I'm really sorry this has been so difficult — I'll help you sort it out"), then give ` +
        `the key facts and figures in plain, gentle words. Keep formality to a minimum. ` +
        `${COMPLETENESS} ${NO_LABEL}${tail}`
      );
    case "angry":
      return (
        `The caller sounds upset (emotion ${s}/100). Soften your tone: open with ONE short empathic sentence ` +
        `(e.g. "I'm sorry this has been so frustrating — let me help"), then give the full answer with the ` +
        `exact figures. Drop formal/bureaucratic phrasing; use plain everyday words and contractions. ` +
        `${COMPLETENESS} ${NO_LABEL}${tail}`
      );
    case "frustrated":
      return (
        `The caller seems frustrated (emotion ${s}/100). Start with one brief, warm acknowledgement, then ` +
        `answer fully in simple, reassuring words. Be proactive and clear. ${COMPLETENESS} ${NO_LABEL}${tail}`
      );
    case "sad":
      return (
        `The caller sounds down (emotion ${s}/100). Be gentle, patient and reassuring; use simple, kind ` +
        `wording and let them know you're here to help, then answer fully. ${COMPLETENESS} ${NO_LABEL}${tail}`
      );
    default:
      return null; // neutral (or unknown) — standard voice, no injection
  }
}
