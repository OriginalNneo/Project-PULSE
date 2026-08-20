import { describe, it, expect } from "vitest";
import { isOutOfScope, refusalText, MIN_COVERAGE, MIN_TOP_SCORE } from "./scopeGuard.js";

describe("isOutOfScope", () => {
  it("lets a strong topical match through", () => {
    expect(isOutOfScope({ topScore: 18, coverage: 0.8 })).toBe(false);
  });

  it("refuses a question that barely grazed the knowledge base", () => {
    // "Which MRT station is the East-West interchange?" scraping one incidental body hit.
    expect(isOutOfScope({ topScore: 2, coverage: 0.16 })).toBe(true);
  });

  it("keeps a short question with a high score (low coverage alone must not refuse)", () => {
    // "CPF LIFE?" — few tokens, but what matched, matched hard.
    expect(isOutOfScope({ topScore: 12, coverage: 0.2 })).toBe(false);
  });

  it("keeps a long rambling question with good coverage but a weak score", () => {
    expect(isOutOfScope({ topScore: 3, coverage: 0.6 })).toBe(false);
  });

  it("does not refuse when there is no relevance evidence at all", () => {
    // Pipelines that do no knowledge search must keep their existing behaviour.
    expect(isOutOfScope(undefined)).toBe(false);
  });

  it("treats a total miss as out of scope", () => {
    expect(isOutOfScope({ topScore: 0, coverage: 0 })).toBe(true);
  });

  it("refuses only when BOTH signals are below their floors", () => {
    expect(isOutOfScope({ topScore: MIN_TOP_SCORE, coverage: 0 })).toBe(false);
    expect(isOutOfScope({ topScore: 0, coverage: MIN_COVERAGE })).toBe(false);
    expect(isOutOfScope({ topScore: MIN_TOP_SCORE - 1, coverage: MIN_COVERAGE - 0.01 })).toBe(true);
  });
});

describe("refusalText", () => {
  it("returns the citizen's own language", () => {
    expect(refusalText("zh")).toContain("公积金");
    expect(refusalText("ms")).toContain("CPF");
    expect(refusalText("ta")).toContain("CPF");
  });

  it("falls back to English for an unsupported language", () => {
    expect(refusalText("hi")).toBe(refusalText("en"));
  });

  it("is fixed text — never improvised, so it cannot drift language or leak a partial answer", () => {
    expect(refusalText("en")).toBe(refusalText("en"));
    expect(refusalText("en")).toMatch(/only help with CPF/i);
  });
});

describe("isOutOfScope — CPF vocabulary overrides weak retrieval", () => {
  it("does NOT refuse a CPF question retrieval simply failed to answer", () => {
    // "Can you explain what MediFund is?" — indexed but unreachable by search (§5.3).
    // Refusing would tell a citizen their genuine CPF question is off-topic.
    expect(isOutOfScope({ topScore: 2, coverage: 0.2 }, true)).toBe(false);
  });

  it("still refuses a non-CPF question with weak retrieval", () => {
    expect(isOutOfScope({ topScore: 2, coverage: 0.2 }, false)).toBe(true);
  });

  it("defaults to the pre-existing behaviour when domain is unknown", () => {
    expect(isOutOfScope({ topScore: 2, coverage: 0.2 })).toBe(true);
  });
});
