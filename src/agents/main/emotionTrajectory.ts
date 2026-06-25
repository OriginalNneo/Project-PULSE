/**
 * Trajectory-aware tone adaptation — the "adaptability" layer on top of the
 * per-message emotion read (`scoreEmotion` → `toneDirective`).
 *
 * The per-message score is a single, noisy signal. This module folds the recent
 * emotional trajectory of the conversation into ONE "effective emotion" that is
 * then passed downstream as `ctx.emotion` — so `buildSystemPrompt`/`toneDirective`
 * and the response cache key (which already key on `emotion.label`) adapt to the
 * trend with no further plumbing.
 *
 * Core rule: trajectory only ever RAISES soothing, never lowers it below what the
 * current message warrants. A caller who is hot RIGHT NOW gets a soothing reply
 * immediately (no waiting for "confirmation"); a caller who has cooled but was hot
 * a moment ago stays soothed (the safe direction). This preserves the invariant
 * that a false-hot read can only make a reply WARMER, never shorter — it never
 * strips a legitimate answer of its figures.
 *
 * Noise robustness comes from recency-weighted averaging: the current turn
 * dominates, older turns decay, so a single stray spike in otherwise-calm history
 * decays away rather than keeping the bot warm forever. NOTE: this reduces
 * variance (false spikes) — it does NOT correct the English-trained model's
 * systematic under-read of zh/ms/ta.
 */

import { type ScoredEmotion, labelFor, ANGRY_THRESHOLD } from "./emotion.js";

export interface EffectiveEmotion extends ScoredEmotion {
  /**
   * The caller has been upset across MULTIPLE recent turns (not just spiking
   * once) — ≥2 of the last 3 user turns above the angry band. Lets the tone
   * layer add a "this has been frustrating across our chat" acknowledgement.
   */
  sustained: boolean;
}

// Exponential recency decay: the most recent turn has weight 1, the one before
// 0.6, then 0.36, … so the current message dominates and an old spike fades.
const DECAY = 0.6;

// How many of the most recent user turns count toward the "sustained" judgement.
const SUSTAINED_WINDOW = 3;
// …of which at least this many must be hot for the conversation to count as
// sustained anger.
const SUSTAINED_MIN_HOT = 2;

/**
 * Fold the current per-message emotion together with the scores of recent prior
 * user turns into one effective emotion.
 *
 * @param current        This turn's per-message ScoredEmotion (from scoreEmotion).
 * @param recentScores   Distress scores (0–100) of recent PRIOR user turns,
 *                       oldest-first. Callers MUST pass only turns that actually
 *                       carry a score (e.g. the guided-questions path stores
 *                       unscored user turns — filter those out, don't pass them).
 */
export function effectiveEmotion(current: ScoredEmotion, recentScores: number[] = []): EffectiveEmotion {
  // Series oldest→newest with the current turn last (so it gets the top weight).
  const series = [...recentScores, current.emotion_score];

  // Recency-weighted average — index 0 is oldest (smallest weight).
  let weightedSum = 0;
  let weightTotal = 0;
  const n = series.length;
  for (let i = 0; i < n; i++) {
    const weight = Math.pow(DECAY, n - 1 - i); // most recent → exponent 0 → weight 1
    weightedSum += series[i]! * weight;
    weightTotal += weight;
  }
  const trendAvg = weightTotal > 0 ? weightedSum / weightTotal : current.emotion_score;

  // Trajectory only raises soothing, never lowers it below the current message.
  const effScore = Math.round(Math.max(current.emotion_score, trendAvg));

  // Sustained: ≥SUSTAINED_MIN_HOT of the last SUSTAINED_WINDOW turns above the
  // angry band. With <2 hot turns available this is naturally false (cold start).
  const recentWindow = series.slice(-SUSTAINED_WINDOW);
  const hotTurns = recentWindow.filter((s) => s > ANGRY_THRESHOLD).length;
  const sustained = hotTurns >= SUSTAINED_MIN_HOT;

  return {
    emotion_score: effScore,
    emotion_label: labelFor(effScore),
    sustained,
  };
}
