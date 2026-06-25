import type { Language, VulnerabilityTier } from "../../shared/types/index.js";
import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("accessibility");

const TIER_CONFIG: Record<VulnerabilityTier, { maxWords: number; speechRate: number }> = {
  "self_service": { maxWords: 50, speechRate: 1.0  },
  "guided":       { maxWords: 30, speechRate: 0.85 },
  "high_touch":   { maxWords: 20, speechRate: 0.7  },
};

export function simplifyText(content: string, tier: VulnerabilityTier): string {
  const { maxWords } = TIER_CONFIG[tier];
  const sentences = content.split(/(?<=[.!?])\s+/);
  return sentences
    .map((sentence) => {
      const words = sentence.split(/\s+/);
      return words.length > maxWords ? words.slice(0, maxWords).join(" ") + "..." : sentence;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getSpeechRate(tier: VulnerabilityTier): number {
  return TIER_CONFIG[tier].speechRate;
}

export function formatForTTS(content: string, language: Language, tier: VulnerabilityTier): string {
  log.info({ language, tier }, "Formatting for TTS");
  return simplifyText(content, tier);
}
