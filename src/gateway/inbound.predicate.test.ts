import { describe, it, expect } from "vitest";

import { isOfficerConfirmation } from "./inbound.js";

// B3 regression: isOfficerConfirmation gates "yes"-style confirmations to the officer
// offer. It must accept genuine affirmations but NOT fire on words that merely START
// with "yes" (the old `startsWith("yes")` escalated "yesterday I checked my balance").

describe("isOfficerConfirmation — accepts genuine confirmations", () => {
  for (const t of [
    "yes",
    "Yes",
    "yes please",
    "YES, connect me",
    "ok",
    "sure",
    "I'd like an officer",
    "connect me to someone",
  ]) {
    it(`"${t}" → true`, () => expect(isOfficerConfirmation(t)).toBe(true));
  }
});

describe("isOfficerConfirmation — does NOT mis-fire (B3)", () => {
  for (const t of [
    "yesterday I checked my balance", // 'yes' has no word boundary before 't'
    "yessir, thank you", // 'yes' followed by a word char
    "what is the Full Retirement Sum?",
    "how do I withdraw at 55?",
    "no thanks",
  ]) {
    it(`"${t}" → false`, () => expect(isOfficerConfirmation(t)).toBe(false));
  }
});
