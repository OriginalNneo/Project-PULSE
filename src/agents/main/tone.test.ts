import { describe, it, expect } from "vitest";

import { toneDirective } from "./tone.js";

// toneDirective(score, label, sustained?) → directive string injected into the
// query system prompt, or null for neutral. Tiers vary EMPATHY only — every
// non-null directive must preserve the answer ("keep all figures").

describe("toneDirective — one directive per emotion band", () => {
  it("rage → sincere apology + completeness guard", () => {
    const d = toneDirective(85, "rage");
    expect(d).toBeTypeOf("string");
    expect(d).toMatch(/sorry|apolog/i);
    expect(d).toMatch(/figures|facts/i); // never strip the answer
    expect(d).toContain("85/100");
  });

  it("angry → soften + keep exact figures", () => {
    const d = toneDirective(72, "angry");
    expect(d).toMatch(/upset|frustrat/i);
    expect(d).toMatch(/exact figures|full answer/i);
    expect(d).toContain("72/100");
  });

  it("frustrated → brief warm acknowledgement", () => {
    expect(toneDirective(58, "frustrated")).toMatch(/frustrat/i);
  });

  it("sad → gentle and reassuring", () => {
    expect(toneDirective(42, "sad")).toMatch(/gentle|down|kind/i);
  });

  it("neutral → no injection (null)", () => {
    expect(toneDirective(10, "neutral")).toBeNull();
  });

  it("unknown label → no injection (null)", () => {
    expect(toneDirective(99, "ecstatic")).toBeNull();
  });
});

describe("toneDirective — every empathetic directive preserves the full answer", () => {
  for (const label of ["rage", "angry", "frustrated", "sad"]) {
    it(`${label} keeps an explicit "don't shorten the content" instruction`, () => {
      const d = toneDirective(75, label)!;
      expect(d).toMatch(/never the content|keep the full answer|answer fully|all exact figures/i);
    });
  }
});

describe("toneDirective — sustained (multi-turn) acknowledgement", () => {
  it("appends the 'built up over several messages' line only when sustained", () => {
    const once = toneDirective(80, "angry", false)!;
    const sustained = toneDirective(80, "angry", true)!;
    expect(once).not.toMatch(/built up over several messages/i);
    expect(sustained).toMatch(/built up over several messages/i);
    expect(sustained.length).toBeGreaterThan(once.length);
  });
});

describe("toneDirective — score is rounded for display", () => {
  it("renders a fractional score as a whole number", () => {
    expect(toneDirective(84.6, "rage")).toContain("85/100");
    expect(toneDirective(71.2, "angry")).toContain("71/100");
  });
});
