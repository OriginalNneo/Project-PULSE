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
export function scoreEmotion(text: EmotionResult, audio?: AudioEmotionResult | null): ScoredEmotion {
  const textBase = text.score;
  const audioBoost = audio ? (1 - audio.valence) * audio.arousal * 0.3 : 0;
  const score = Math.min((textBase + audioBoost) * 100, 100);
  return { emotion_score: Math.round(score), emotion_label: labelFor(score) };
}

function labelFor(score: number): string {
  if (score > 80) return "rage";
  if (score > 65) return "angry";
  if (score > 50) return "frustrated";
  if (score > 35) return "sad";
  return "neutral";
}
