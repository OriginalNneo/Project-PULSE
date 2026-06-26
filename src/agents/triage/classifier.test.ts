import { describe, it, expect } from "vitest";

import { classifyQuery } from "./classifier.js";

// classifyQuery routes a query into:
//   Cat 1 — fully answerable from public knowledge (no officer button)
//   Cat 2 — public part answerable, officer offered for the personal specifics
//   Cat 3 — personal account data, hard security boundary (officer offered)

describe("Category 1 — public knowledge, bot answers fully", () => {
  for (const q of [
    "What is CPF LIFE?",
    "How do I withdraw my CPF at 55?",
    "Explain the difference between OA and SA",
    "What is the Full Retirement Sum this year?",
  ]) {
    it(`"${q}" → Cat 1, no button`, () => {
      const r = classifyQuery(q);
      expect(r.category).toBe(1);
      expect(r.offerText).toBeNull();
    });
  }

  it("shifts a payout estimate to Cat 1 when the user supplies their own figures", () => {
    const r = classifyQuery("If I have $200,000 in RA, how much CPF LIFE payout will I get?");
    expect(r.category).toBe(1); // USER_PROVIDED_NUMBER guard
  });
});

describe("Category 2 — partially answerable, officer offered for specifics", () => {
  for (const q of [
    "Am I eligible for MRSS?",
    "Should I top up my CPF?",
    "how much CPF LIFE payout will I get?",
    "Is my MediSave enough?",
  ]) {
    it(`"${q}" → Cat 2 with an officer offer`, () => {
      const r = classifyQuery(q);
      expect(r.category).toBe(2);
      expect(r.offerText).toBeTruthy();
      expect(r.promptHint).toBeTruthy();
    });
  }
});

describe("Category 3 — personal account data (security boundary)", () => {
  for (const q of [
    "What's my OA balance?",
    "check my CPF balance",
    "Did my employer contribute last month?",
    "How much can I withdraw?",
    "Show my contribution history",
  ]) {
    it(`"${q}" → Cat 3, never guesses personal figures`, () => {
      const r = classifyQuery(q);
      expect(r.category).toBe(3);
      expect(r.offerText).toBeTruthy();
      expect(r.promptHint).toMatch(/cannot access|personal/i);
    });
  }

  it("Cat 3 takes precedence over Cat 2 wording in the same query", () => {
    // 'what is my payout' is personal (Cat 3) even though 'payout' also looks Cat 2
    expect(classifyQuery("what is my exact payout").category).toBe(3);
  });
});

describe("KNOWN LIMITATION: classifier is English-only", () => {
  it.fails("a Chinese personal-balance question should be Cat 3 but is not", () => {
    // The CAT3/CAT2 patterns are English regexes; non-English personal queries
    // fall through to the Cat-1 default. Documents the gap (see SELF_TEST_REPORT).
    expect(classifyQuery("我的公积金余额是多少").category).toBe(3);
  });

  it("CHARACTERISATION: the Chinese query currently defaults to Cat 1", () => {
    expect(classifyQuery("我的公积金余额是多少").category).toBe(1);
  });
});
