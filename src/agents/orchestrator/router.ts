import type { CorrespondenceCategory, Language, Dialect } from "../../shared/types/index.js";
import type { DetectedIntent, ConversationMessage } from "../shared/types.js";

const DOMAIN_KEYWORDS: Record<CorrespondenceCategory, string[]> = {
  tax: ["tax", "iras", "income tax", "gst", "cpf", "assessment", "taxable", "giro", "property tax", "所得税", "税", "消费税", "cpf", "公积金", "估税", "cukai", "hasil", "வரி", "வருமானம்"],
  health: ["hospital", "appointment", "medisave", "polyclinic", "screening", "doctor", "referral", "chas", "pioneer", "医院", "预约", "保健储蓄", "诊疗所", "hospital", "temujanji", "மருத்துவமனை", "நியமனம்"],
  housing: ["hdb", "flat", "rental", "conservancy", "town council", "sers", "lease", "bto", "resale", "组屋", "租赁", "维修", "市镇理事会", "pangsapuri", "sewa", "வீடு", "வாடகை"],
  employment: ["workpass", "employment pass", "s pass", "mom", "levy", "retrenchment", "salary claim", "tadm", "工作准证", "雇佣", "裁员", "pas kerja", "pekerjaan", "வேலை", "அனுமதி"],
  legal: ["fine", "summons", "court", "lta", "nea", "ura", "scdf", "penalty", "appeal", "罚款", "传票", "法庭", "denda", "mahkamah", "அபராதம்", "நீதிமன்றம்"],
};

const LANGUAGE_PATTERNS: Record<Language, RegExp[]> = {
  en: [/^[a-zA-Z0-9\s.,!?'"()-]+$/],
  zh: [/[\u4e00-\u9fff]/],
  ms: [/^(ada|saya|anda|ini|itu|untuk|dari|dengan|yang|tidak|boleh|apa|bagaimana|bila|di|ke|pada|pergi|mahu|nak|kenapa)/i],
  ta: [/[\u0b80-\u0bff]/],
};

const DIALECT_PATTERNS: Record<string, RegExp[]> = {
  "zh-hok": [/(啊|咧|hor|leh|meh|boh|siol|lah|lor|meh)/],
  "zh-can": [/(喇|啫|咩|喎|咯|嘅|嘞)/],
  "ms-bms": [/(kawan|makan|beli|jual|pigih|balik|hantar|ambik)/i],
  "ms-jav": [/(ndak|ora|kowe|dewe|kok|nggih)/i],
  "ta-sin": [/(டா|ங்க|ப்பா|ம்மா|டீ)/],
};

export function classifyIntent(messages: ConversationMessage[]): DetectedIntent {
  const userMessages = messages.filter((m) => m.role === "user");
  const lastMessage = userMessages[userMessages.length - 1];
  if (!lastMessage) {
    return { domain: "general", confidence: 0, keywords: [] };
  }

  const text = lastMessage.content.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += kw.length > 3 ? 2 : 1;
      }
    }
    scores[domain] = score;
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const [bestDomain, bestScore] = sorted[0] ?? ["unclear", 0];

  if (bestScore === 0) {
    return { domain: "unclear", confidence: 0.1, keywords: [] };
  }

  const matchedKeywords = DOMAIN_KEYWORDS[bestDomain as CorrespondenceCategory]
    ?.filter((kw) => text.includes(kw.toLowerCase())) ?? [];

  return {
    domain: bestDomain as CorrespondenceCategory,
    confidence: Math.min(bestScore / 5, 0.99),
    keywords: matchedKeywords,
  };
}

export function detectLanguage(messages: ConversationMessage[]): Language {
  const userMessages = messages.filter((m) => m.role === "user");
  const text = userMessages[userMessages.length - 1]?.content ?? "";

  if (/[\u0b80-\u0bff]/.test(text)) return "ta";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";

  const msWords = ["saya", "anda", "ini", "untuk", "dengan", "yang", "tidak", "boleh", "apa"];
  const msCount = msWords.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(text)).length;
  if (msCount >= 2) return "ms";

  return "en";
}

export function detectDialect(messages: ConversationMessage[], language: Language): Dialect | undefined {
  const userMessages = messages.filter((m) => m.role === "user");
  const text = userMessages[userMessages.length - 1]?.content ?? "";

  if (language === "zh") {
    for (const [code, patterns] of Object.entries(DIALECT_PATTERNS)) {
      if (!code.startsWith("zh-")) continue;
      if (patterns.some((p) => p.test(text))) {
        return code as Dialect;
      }
    }
  }

  if (language === "ms") {
    for (const [code, patterns] of Object.entries(DIALECT_PATTERNS)) {
      if (!code.startsWith("ms-")) continue;
      if (patterns.some((p) => p.test(text))) {
        return code as Dialect;
      }
    }
  }

  if (language === "ta") {
    for (const [code, patterns] of Object.entries(DIALECT_PATTERNS)) {
      if (!code.startsWith("ta-")) continue;
      if (patterns.some((p) => p.test(text))) {
        return code as Dialect;
      }
    }
  }

  return undefined;
}
