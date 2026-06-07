import { createServiceLogger } from "../../../../shared/logger.js";
import { getSlang } from "../../../../db/proxy-client.js";

const log = createServiceLogger("hokkien-normaliser");

const BUILT_IN: Record<string, string> = {
  "lah":        "",
  "lor":        "",
  "leh":        "",
  "meh":        "",
  "sia":        "",
  "hor":        "",
  "wor":        "",
  "aiyo":       "oh no",
  "wah":        "wow",
  "sian":       "bored or tired",
  "shiok":      "great",
  "buay tahan": "cannot stand it",
  "paiseh":     "embarrassed",
  "kiasu":      "afraid to lose out",
  "blur":       "confused",
  "steady":     "cool or capable",
  "can or not": "is it possible",
  "where got":  "that is not true",
  "how can":    "that is not right",
  "last time":  "previously",
};

export async function normaliseHokkien(text: string): Promise<string> {
  let result = text;

  for (const [term, replacement] of Object.entries(BUILT_IN)) {
    const pattern = new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "gi");
    result = replacement === ""
      ? result.replace(pattern, "").trim()
      : result.replace(pattern, replacement);
  }

  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (word in BUILT_IN) continue;
    try {
      const slang = await getSlang(word);
      if (slang?.normalized_form) {
        result = result.replace(new RegExp(`\\b${word}\\b`, "gi"), slang.normalized_form);
      }
    } catch {
      log.debug({ word }, "Slang lookup failed");
    }
  }

  return result.replace(/\s+/g, " ").trim();
}
