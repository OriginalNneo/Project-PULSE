import { describe, it, expect } from "vitest";

import { scoreEmotion, labelFor, EMOTION_THRESHOLDS } from "./emotion.js";

// ─────────────────────────────────────────────────────────────────────────────
// labelFor — distress score → band label. Boundary-exact ("strictly above").
// ─────────────────────────────────────────────────────────────────────────────
describe("labelFor — score→label thresholds (strictly-above bands)", () => {
  it("maps clearly-inside-band scores", () => {
    expect(labelFor(95)).toBe("rage");
    expect(labelFor(70)).toBe("angry");
    expect(labelFor(55)).toBe("frustrated");
    expect(labelFor(40)).toBe("sad");
    expect(labelFor(10)).toBe("neutral");
    expect(labelFor(0)).toBe("neutral");
  });

  it("treats each threshold as exclusive (score == band number falls to the band below)", () => {
    expect(labelFor(EMOTION_THRESHOLDS.rage)).toBe("angry"); // 80 is NOT rage
    expect(labelFor(EMOTION_THRESHOLDS.rage + 1)).toBe("rage"); // 81 is
    expect(labelFor(EMOTION_THRESHOLDS.angry)).toBe("frustrated"); // 65 is NOT angry
    expect(labelFor(EMOTION_THRESHOLDS.angry + 1)).toBe("angry"); // 66 is
    expect(labelFor(EMOTION_THRESHOLDS.frustrated)).toBe("sad"); // 50 → sad
    expect(labelFor(EMOTION_THRESHOLDS.sad)).toBe("neutral"); // 35 → neutral
    expect(labelFor(EMOTION_THRESHOLDS.sad + 1)).toBe("sad"); // 36 → sad
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreEmotion — distress base (gated by label) + optional audio boost → 0–100.
//   text_base   = text.score  WHEN the label is a distress emotion, else 0
//   audio_boost = (1 - valence) * arousal * 0.3   (0 when no audio)
//   final       = min((text_base + audio_boost) * 100, 100)
// ─────────────────────────────────────────────────────────────────────────────
describe("scoreEmotion — distress text, no voice note", () => {
  it("scales a NEGATIVE emotion's confidence straight to 0–100", () => {
    expect(scoreEmotion({ label: "anger", score: 0.9 }, null).emotion_score).toBe(90);
    expect(scoreEmotion({ label: "sadness", score: 0.4 }, null).emotion_score).toBe(40);
    expect(scoreEmotion({ label: "fear", score: 0.2 }, null).emotion_score).toBe(20);
  });

  it("derives the label from the score band", () => {
    expect(scoreEmotion({ label: "anger", score: 0.9 }, null).emotion_label).toBe("rage");
    expect(scoreEmotion({ label: "sadness", score: 0.4 }, null).emotion_label).toBe("sad");
    expect(scoreEmotion({ label: "fear", score: 0.2 }, null).emotion_label).toBe("neutral");
  });

  it("treats undefined audio the same as null (no boost)", () => {
    expect(scoreEmotion({ label: "anger", score: 0.5 }).emotion_score).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B1 FIX — positive/neutral emotions are NOT distress. A confident "joy" must
// read as 0 (neutral), never trip the >70 auto-escalation or apologetic tone.
// ─────────────────────────────────────────────────────────────────────────────
describe("scoreEmotion — non-distress emotions score 0 (B1 fixed)", () => {
  it("a confident POSITIVE message scores as neutral, not rage", () => {
    const scored = scoreEmotion({ label: "joy", score: 0.95 }, null);
    expect(scored.emotion_score).toBe(0);
    expect(scored.emotion_label).toBe("neutral");
  });

  it("a confident 'surprise' is not treated as anger", () => {
    expect(scoreEmotion({ label: "surprise", score: 0.88 }, null).emotion_label).toBe("neutral");
  });

  it("'neutral' itself scores 0 regardless of confidence", () => {
    expect(scoreEmotion({ label: "neutral", score: 0.99 }, null).emotion_score).toBe(0);
  });

  it("every distress label still passes its confidence through", () => {
    for (const label of ["anger", "sadness", "fear", "disgust"]) {
      expect(scoreEmotion({ label, score: 0.8 }, null).emotion_score).toBe(80);
    }
  });
});

describe("scoreEmotion — with voice-note audio emotion boost", () => {
  it("adds (1-valence)*arousal*0.3 from a tense voice on top of distress text", () => {
    // text 0.40 + boost (1-0.1)*0.9*0.3 = 0.243  → 64.3 → 64 → 'frustrated'
    const scored = scoreEmotion(
      { label: "anger", score: 0.4 },
      { valence: 0.1, arousal: 0.9, dominance: 0.5 },
    );
    expect(scored.emotion_score).toBe(64);
    expect(scored.emotion_label).toBe("frustrated");
  });

  it("a calm voice (high valence / low arousal) adds almost nothing", () => {
    // boost (1-0.9)*0.1*0.3 = 0.003 → 30.3 → 30
    const scored = scoreEmotion(
      { label: "sadness", score: 0.3 },
      { valence: 0.9, arousal: 0.1, dominance: 0.5 },
    );
    expect(scored.emotion_score).toBe(30);
  });

  it("clamps the combined score to 100", () => {
    const scored = scoreEmotion(
      { label: "anger", score: 0.95 },
      { valence: 0, arousal: 1, dominance: 0.5 },
    );
    expect(scored.emotion_score).toBe(100); // (0.95 + 0.3)*100 = 125 → capped
    expect(scored.emotion_label).toBe("rage");
  });
});
