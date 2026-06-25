import { describe, it, expect } from "vitest";
import { effectiveEmotion } from "./emotionTrajectory.js";
import type { ScoredEmotion } from "./emotion.js";

const e = (emotion_score: number): ScoredEmotion => ({
  emotion_score,
  emotion_label: "x", // label is recomputed by effectiveEmotion; value here is irrelevant
});

describe("effectiveEmotion — trajectory folding", () => {
  it("cold start (no history) behaves exactly like the current message", () => {
    const calm = effectiveEmotion(e(20), []);
    expect(calm.emotion_score).toBe(20);
    expect(calm.emotion_label).toBe("neutral");
    expect(calm.sustained).toBe(false);

    const hot = effectiveEmotion(e(90), []);
    expect(hot.emotion_score).toBe(90);
    expect(hot.emotion_label).toBe("rage");
    expect(hot.sustained).toBe(false); // one hot turn is not "sustained"
  });

  it("honours a real current spike immediately, regardless of calm history", () => {
    // An angry person should NOT have to wait for the average to catch up.
    const r = effectiveEmotion(e(90), [10, 10, 10]);
    expect(r.emotion_score).toBe(90);
    expect(r.emotion_label).toBe("rage");
  });

  it("stays soothing when the caller cooled but was hot moments ago (falling trend)", () => {
    // Current message reads calmer, but the run-up was hot → keep soothing.
    const r = effectiveEmotion(e(30), [80, 70, 50]);
    expect(r.emotion_score).toBeGreaterThan(30); // trajectory raised it
    expect(r.emotion_label).not.toBe("neutral"); // not snapped back to brisk
  });

  it("never lowers soothing below what the current message warrants", () => {
    // Invariant: effective >= current, always (max with the trend average).
    for (const [cur, hist] of [
      [30, [80, 70, 50]],
      [90, [10, 10]],
      [55, [10, 20, 30]],
    ] as Array<[number, number[]]>) {
      expect(effectiveEmotion(e(cur), hist).emotion_score).toBeGreaterThanOrEqual(cur);
    }
  });

  it("decays a single stray spike in otherwise-calm history", () => {
    // One spike two turns ago must not keep the bot warm once things calmed.
    const r = effectiveEmotion(e(10), [10, 90, 10]);
    expect(r.emotion_score).toBeLessThan(35); // back to neutral band
    expect(r.emotion_label).toBe("neutral");
    expect(r.sustained).toBe(false);
  });

  it("flags sustained anger across multiple turns", () => {
    const r = effectiveEmotion(e(72), [70, 68]);
    expect(r.sustained).toBe(true);
    expect(r.emotion_label).toBe("angry");
  });

  it("does NOT flag sustained for a lone hot turn in the recent window", () => {
    const r = effectiveEmotion(e(10), [70, 10]);
    expect(r.sustained).toBe(false);
  });
});
