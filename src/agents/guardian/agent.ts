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

  // Only flag specific fabricated numbers (dollar amounts, percentages) — not ages
  // or generic counts. GLM paraphrasing retrieved content is not a hallucination.
  const numberPattern = /\$[\d,]+|\b\d+(?:\.\d+)?%/g;
  const numbersInResponse = [...new Set(response.match(numberPattern) ?? [])];
  const ungroundedNumbers = numbersInResponse.filter((n) => !retrievedContent.includes(n));

  if (ungroundedNumbers.length > 3) {
    log.warn({ ungroundedNumbers }, "Hallucination guard: multiple fabricated figures in response");
    return { grounded: false, confidence: 0.35, ungroundedNumbers };
  }

  return { grounded: true, confidence: 0.9, ungroundedNumbers };
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
