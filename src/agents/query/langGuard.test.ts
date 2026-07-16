import { describe, it, expect } from "vitest";

import { replyLanguageLooksWrong } from "./agent.js";

// Language-drift guard: GLM drifts into Chinese when the target language isn't pinned.
// A drifted reply must be caught (retried / never cached) — and a correct reply must
// never be flagged, or every answer would burn a retry round-trip.

describe("replyLanguageLooksWrong — English target", () => {
  it("accepts a normal English reply", () => {
    expect(replyLanguageLooksWrong("💰 You can withdraw up to $5,000 from age 55.", "en")).toBe(false);
  });

  it("tolerates the odd quoted CJK term", () => {
    expect(replyLanguageLooksWrong("CPF LIFE (公积金) pays you monthly.", "en")).toBe(false);
  });

  it("flags a reply that drifted into Chinese", () => {
    expect(replyLanguageLooksWrong("💰 您可以在55岁时提取部分公积金储蓄。", "en")).toBe(true);
  });

  it("flags a reply that drifted into Tamil", () => {
    expect(replyLanguageLooksWrong("நீங்கள் 55 வயதில் பணம் எடுக்கலாம்.", "en")).toBe(true);
  });
});

describe("replyLanguageLooksWrong — non-Latin targets", () => {
  it("accepts a Chinese reply for zh", () => {
    expect(replyLanguageLooksWrong("💰 您可以在55岁时提取部分公积金储蓄。", "zh")).toBe(false);
  });

  it("flags an English reply for zh", () => {
    expect(replyLanguageLooksWrong("You can withdraw up to $5,000 from age 55.", "zh")).toBe(true);
  });

  it("flags a Chinese reply for ta", () => {
    expect(replyLanguageLooksWrong("您可以在55岁时提取部分公积金储蓄。", "ta")).toBe(true);
  });
});

describe("replyLanguageLooksWrong — Malay target (Latin script)", () => {
  it("accepts a Malay reply", () => {
    expect(replyLanguageLooksWrong("Anda boleh mengeluarkan sehingga $5,000 pada umur 55 tahun.", "ms")).toBe(false);
  });

  it("flags a Chinese reply for ms", () => {
    expect(replyLanguageLooksWrong("您可以在55岁时提取部分公积金储蓄。", "ms")).toBe(true);
  });
});
