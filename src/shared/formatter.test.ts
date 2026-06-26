import { describe, it, expect } from "vitest";

import { formatReply, containsHtml } from "./formatter.js";

// formatReply cleans raw LLM output for delivery:
//   "html"  → Telegram (markdown stripped, CPF terms bolded, HTML-escaped)
//   "plain" → TTS / plain channels (no tags at all)

describe("formatReply — markdown is stripped", () => {
  it("removes ** and __ markers in html mode", () => {
    const out = formatReply("**Full Retirement Sum** is __important__", "html");
    expect(out).not.toContain("**");
    expect(out).not.toContain("__");
  });

  // KNOWN GAP: formatter's stripMarkdown (formatter.ts) handles **bold**, _italic_,
  // `code`, headings — but NOT [text](url) links, so Telegram shows the raw markdown.
  // Note: stripMarkdownForTTS (inbound.ts:104) DOES strip links — the two strippers
  // have drifted. it.fails passes today (proving the gap); remove .fails once unified.
  it.fails("should strip markdown link syntax, keeping the link text", () => {
    const out = formatReply("See [the CPF site](https://cpf.gov.sg) for details", "plain");
    expect(out).not.toContain("](");
    expect(out).toContain("the CPF site");
  });
});

describe("formatReply — plain mode never emits HTML tags", () => {
  it("plain output has no <b> tags even when html mode would bold", () => {
    const html = formatReply("Your CPF LIFE payout is fixed", "html");
    const plain = formatReply("Your CPF LIFE payout is fixed", "plain");
    expect(plain).not.toMatch(/<[a-z]/i);
    // and the two modes genuinely differ once something is bolded
    if (containsHtml(html)) expect(html).not.toBe(plain);
  });
});

describe("formatReply — HTML special chars are escaped in html mode", () => {
  it("escapes <, >, & so they can't break Telegram HTML parsing", () => {
    const out = formatReply("Rule: 5 < 10 & savings > 0", "html");
    expect(out).toContain("&lt;");
    expect(out).toContain("&gt;");
    expect(out).toContain("&amp;");
    expect(out).not.toMatch(/[^&]< /); // no raw "< " left
  });

  it("plain mode leaves the raw characters (no escaping needed for TTS)", () => {
    const out = formatReply("5 < 10", "plain");
    expect(out).toContain("<");
    expect(out).not.toContain("&lt;");
  });
});

describe("formatReply — length is capped", () => {
  it("a very long answer is trimmed", () => {
    const long = "CPF LIFE is a national annuity. ".repeat(200); // ~6400 chars
    const out = formatReply(long, "plain");
    expect(out.length).toBeLessThan(long.length);
  });
});

describe("containsHtml", () => {
  it("detects tags / no tags", () => {
    expect(containsHtml("plain text only")).toBe(false);
    expect(containsHtml("has <b>bold</b>")).toBe(true);
  });
});
