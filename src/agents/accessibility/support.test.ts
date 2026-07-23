import { describe, it, expect } from "vitest";
import {
  detectRepairSignal,
  isSupportOptIn,
  isSupportOptOut,
  isSupportConfirmation,
  isSupportDecline,
  impliedReadingWpm,
  raiseTier,
  READING_RATE_FLOOR_WPM,
} from "./support.js";
import { readingLevelDirective } from "../query/agent.js";

describe("reading-support detection", () => {
  describe("detectRepairSignal", () => {
    it("fires on English comprehension-repair phrases", () => {
      for (const t of [
        "sorry i don't understand",
        "can you say that again",
        "too complicated for me",
        "please explain in simple words",
        "slower please",
        "i cannot read that",
      ]) {
        expect(detectRepairSignal(t)).toBe(true);
      }
    });

    it("fires on zh / ms / ta repair phrases", () => {
      expect(detectRepairSignal("看不懂")).toBe(true);          // zh: don't understand
      expect(detectRepairSignal("saya tak faham")).toBe(true);  // ms: I don't understand
      expect(detectRepairSignal("புரியல")).toBe(true);          // ta: don't understand
    });

    it("does NOT fire on ordinary CPF questions that merely contain 'simple'/'easy'", () => {
      for (const t of [
        "what is CPF LIFE?",
        "is it easy to withdraw my CPF at 55?",
        "how do I make a simple nomination?",
        "when can I get my payout",
      ]) {
        expect(detectRepairSignal(t)).toBe(false);
      }
    });
  });

  describe("explicit opt-in / opt-out", () => {
    it("recognises opt-in triggers", () => {
      for (const t of ["simple", "slower", "/support", "simpler replies please", "keep it simple"]) {
        expect(isSupportOptIn(t)).toBe(true);
      }
      expect(isSupportOptIn("what is the simplest scheme")).toBe(false);
    });

    it("recognises opt-out triggers", () => {
      for (const t of ["full", "normal", "back to normal", "full detail"]) {
        expect(isSupportOptOut(t)).toBe(true);
      }
      expect(isSupportOptOut("tell me the full story of CPF")).toBe(false);
    });

    it("treats yes-ish replies and opt-in words as offer confirmations, and no-ish as declines", () => {
      expect(isSupportConfirmation("yes please")).toBe(true);
      expect(isSupportConfirmation("simple")).toBe(true);
      expect(isSupportDecline("no thanks")).toBe(true);
      expect(isSupportDecline("yes")).toBe(false);
    });
  });

  describe("impliedReadingWpm", () => {
    it("returns a rate for a usable sample", () => {
      // 30 words read over 60s → 30 wpm (below the floor)
      expect(impliedReadingWpm(30, 60)).toBeCloseTo(30, 5);
      expect(impliedReadingWpm(30, 60)!).toBeLessThanOrEqual(READING_RATE_FLOOR_WPM);
    });

    it("returns null for replies too short to be a reliable sample", () => {
      expect(impliedReadingWpm(5, 60)).toBeNull();
    });

    it("returns null when the gap is non-positive or long enough to be 'stepped away'", () => {
      expect(impliedReadingWpm(40, 0)).toBeNull();
      expect(impliedReadingWpm(40, 9 * 60)).toBeNull();
    });
  });

  describe("raiseTier", () => {
    it("only ever raises, never lowers", () => {
      expect(raiseTier("self_service", "guided")).toBe("guided");
      expect(raiseTier("guided", "high_touch")).toBe("high_touch");
      expect(raiseTier("high_touch", "guided")).toBe("high_touch"); // never lowered
      expect(raiseTier("guided", "self_service")).toBe("guided");   // never lowered
    });
  });
});

describe("readingLevelDirective (generation-level adaptation)", () => {
  it("is null for self_service (base prompt is the standard experience)", () => {
    expect(readingLevelDirective("self_service")).toBeNull();
  });

  it("is present and tighter than the base prompt for guided/high_touch", () => {
    const guided = readingLevelDirective("guided");
    const high = readingLevelDirective("high_touch");
    expect(guided).toBeTruthy();
    expect(high).toBeTruthy();
    // Tighter on TOTAL length + vocabulary — the axes BASE_SYSTEM_PROMPT does not already
    // max out (it already caps sentence length ~25 words / total ~120 words).
    expect(guided!.toLowerCase()).toContain("60 words");
    expect(guided!.toLowerCase()).toContain("everyday words");
    expect(high!.toLowerCase()).toContain("40 words");
    expect(high!.toLowerCase()).toContain("one idea");
  });
});
