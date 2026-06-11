import type { EmotionResult } from "../../python-bridge/client.js";

// Negative/distress emotions raise queue priority; positive/neutral lower it.
// j-hartmann/emotion-english-distilroberta-base emits: anger, disgust, fear,
// joy, neutral, sadness, surprise.
const DISTRESS_WEIGHT: Record<string, number> = {
  anger: 1.0,
  fear: 1.0,
  sadness: 0.9,
  disgust: 0.8,
  surprise: 0.5,
  neutral: 0.4,
  joy: 0.1,
};

/**
 * Map a classifier result to a 0–100 distress score the CCU queue uses for
 * prioritisation. Higher = more distressed / more urgent.
 */
export function emotionToDistressScore(emotion: EmotionResult): number {
  const weight = DISTRESS_WEIGHT[emotion.label] ?? 0.5;
  // Blend the emotion's intrinsic urgency with the model's confidence.
  const score = weight * (0.6 + 0.4 * emotion.score) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}
