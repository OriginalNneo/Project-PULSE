import type { EmotionResult, AudioEmotionResult } from "../../python-bridge/client.js";

export interface ScoredEmotion {
  emotion_score: number; // 0–100
  emotion_label: string; // rage | angry | frustrated | sad | neutral
}

/**
 * Combine text emotion (and optional dimensional audio emotion) into a 0–100
 * distress score + label, per the merge spec.
 *
 *   text_base   = text emotion top-score (0–1)
 *   audio_boost = (1 - valence) * arousal * 0.3   (0 when no audio)
 *   final_score = min((text_base + audio_boost) * 100, 100)
 */
// The text classifier (j-hartmann/emotion-english-distilroberta-base) emits one of
// anger | disgust | fear | joy | neutral | sadness | surprise, and `score` is its
// CONFIDENCE in that label — NOT a distress magnitude. Only the negative emotions
// count as distress; a confident "joy"/"surprise" must read as 0, not a high score.
// (Without this gate, "thank you!!" → joy 0.95 → 95 → "rage" → false escalation.)
const DISTRESS_LABELS = new Set(["anger", "sadness", "fear", "disgust"]);

export function scoreEmotion(text: EmotionResult, audio?: AudioEmotionResult | null): ScoredEmotion {
  const textBase = DISTRESS_LABELS.has(text.label) ? text.score : 0;
  const audioBoost = audio ? (1 - audio.valence) * audio.arousal * 0.3 : 0;
  const score = Math.min((textBase + audioBoost) * 100, 100);
  return { emotion_score: Math.round(score), emotion_label: labelFor(score) };
}

// Distress-score → label thresholds (single source of truth, reused by the
// trajectory layer in emotionTrajectory.ts). A score strictly ABOVE a band's
// number takes that band's label.
export const EMOTION_THRESHOLDS = { rage: 80, angry: 65, frustrated: 50, sad: 35 } as const;

/** "above the angry band" — the line at which we treat a turn as a hot turn. */
export const ANGRY_THRESHOLD = EMOTION_THRESHOLDS.angry;

export function labelFor(score: number): string {
  if (score > EMOTION_THRESHOLDS.rage) return "rage";
  if (score > EMOTION_THRESHOLDS.angry) return "angry";
  if (score > EMOTION_THRESHOLDS.frustrated) return "frustrated";
  if (score > EMOTION_THRESHOLDS.sad) return "sad";
  return "neutral";
}
