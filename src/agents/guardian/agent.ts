import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("guardian");

const PII_PATTERNS = [
  /\b[STFG]\d{7}[A-Z]\b/,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  /\b\+?65[\s-]?\d{4}[\s-]?\d{4}\b/,
];

const SCAM_PHRASES = [
  "send money",
  "transfer funds",
  "your account will be suspended",
  "verify your pin",
  "provide your otp",
  "click this link to claim",
];

export interface GuardianResult {
  safe: boolean;
  reason?: string;
  piiDetected: boolean;
  scamRisk: boolean;
}

export interface GroundingResult {
  grounded: boolean;
  confidence: number;
  ungroundedNumbers: string[];
}

// Checks that numbers and key facts in the LLM response exist in the retrieved source content.
// Ungrounded numbers (fabricated CPF percentages, dollar amounts) are the most dangerous hallucinations.
export function groundingCheck(response: string, retrievedContent: string): GroundingResult {
  if (!retrievedContent || retrievedContent.trim().length < 50) {
    return { grounded: true, confidence: 0.5, ungroundedNumbers: [] };
  }

  const numberPattern = /\b\d+(?:[.,]\d+)?(?:%|k|K)?\b/g;
  const numbersInResponse = [...new Set(response.match(numberPattern) ?? [])];
  const ungroundedNumbers = numbersInResponse.filter((n) => !retrievedContent.includes(n));

  if (ungroundedNumbers.length > 0) {
    log.warn({ ungroundedNumbers }, "Hallucination guard: ungrounded numbers in response");
    return { grounded: false, confidence: 0.35, ungroundedNumbers };
  }

  const stopWords = new Set(["the","a","an","is","are","was","were","you","your","can","will","to","for","of","in","and","or","at","on","it","this","that"]);
  const sig = (text: string) =>
    new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 4 && !stopWords.has(w)));

  const responseWords = sig(response);
  const contentWords = sig(retrievedContent);
  const overlap = [...responseWords].filter((w) => contentWords.has(w)).length;
  const overlapRatio = responseWords.size > 0 ? overlap / responseWords.size : 1;

  if (overlapRatio < 0.15 && retrievedContent.length > 200) {
    log.warn({ overlapRatio }, "Hallucination guard: low word overlap between response and retrieved content");
    return { grounded: false, confidence: 0.4, ungroundedNumbers: [] };
  }

  return { grounded: true, confidence: Math.min(0.5 + overlapRatio * 0.5, 1.0), ungroundedNumbers: [] };
}

export function validateOutput(content: string): GuardianResult {
  const lower = content.toLowerCase();

  const piiDetected = PII_PATTERNS.some((p) => p.test(content));
  if (piiDetected) {
    log.warn("PII detected in agent response");
    return { safe: false, reason: "pii_detected", piiDetected: true, scamRisk: false };
  }

  const scamRisk = SCAM_PHRASES.some((phrase) => lower.includes(phrase));
  if (scamRisk) {
    log.warn("Scam phrase detected in agent response");
    return { safe: false, reason: "scam_risk", piiDetected: false, scamRisk: true };
  }

  return { safe: true, piiDetected: false, scamRisk: false };
}
