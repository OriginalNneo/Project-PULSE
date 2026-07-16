import { describe, it, expect } from "vitest";

import { analyzeEscalation } from "./analyzer.js";

// The analyzer receives raw citizen text from every channel. English patterns were the
// only ones for a while, which silently dropped the officer button for the other six
// supported languages — these tests pin the i18n coverage.

describe("analyzeEscalation — explicit officer request, non-English", () => {
  const cases: Array<[string, string]> = [
    ["zh (simplified)", "我想和专员谈谈"],
    ["zh (customer service)", "帮我转人工客服"],
    ["zh (traditional)", "我要找職員幫忙"],
    ["ms", "boleh saya bercakap dengan pegawai"],
    ["ta", "நான் ஒரு அதிகாரியுடன் பேச விரும்புகிறேன்"],
    ["hi", "मुझे अधिकारी से बात करनी है"],
  ];
  for (const [label, text] of cases) {
    it(`escalates: ${label}`, () => {
      const d = analyzeEscalation(text, "reply", 0.9);
      expect(d.shouldEscalate).toBe(true);
      expect(d.reason).toBe("explicit_request");
    });
  }

  it("escalates when the REPLY promises a handoff in Chinese", () => {
    const d = analyzeEscalation("好的", "好的，我会将您转接给专员。", 0.9);
    expect(d.shouldEscalate).toBe(true);
  });

  it("does NOT escalate on 人工智能 (asking about AI)", () => {
    const d = analyzeEscalation("你是人工智能吗？", "我是PULSE助手。", 0.9);
    expect(d.shouldEscalate).toBe(false);
  });
});

describe("analyzeEscalation — personal data, non-English", () => {
  it("escalates on a Chinese balance query", () => {
    const d = analyzeEscalation("我的公积金余额是多少？", "reply", 0.9);
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe("personal_data");
  });

  it("escalates on a Malay balance query", () => {
    const d = analyzeEscalation("berapa baki cpf saya sekarang", "reply", 0.9);
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe("personal_data");
  });

  it("does NOT escalate on a general Chinese policy question", () => {
    const d = analyzeEscalation("公积金是什么？", "公积金是新加坡的社会保障储蓄计划。", 0.9);
    expect(d.shouldEscalate).toBe(false);
  });
});

describe("analyzeEscalation — English still works", () => {
  it("escalates on an explicit English request", () => {
    const d = analyzeEscalation("can I talk to an officer please", "reply", 0.9);
    expect(d.shouldEscalate).toBe(true);
    expect(d.reason).toBe("explicit_request");
  });

  it("does NOT escalate on a general English question", () => {
    const d = analyzeEscalation("what is cpf life?", "CPF LIFE is a national annuity scheme.", 0.9);
    expect(d.shouldEscalate).toBe(false);
  });
});
