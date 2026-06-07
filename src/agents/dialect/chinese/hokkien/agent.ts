import type { LanguageAgentResponse } from "../../../shared/types.js";
import { normaliseHokkien } from "./normaliser.js";
import { createServiceLogger } from "../../../../shared/logger.js";

const log = createServiceLogger("hokkien-agent");

export async function processHokkienInput(
  text: string,
  domain: string,
): Promise<LanguageAgentResponse> {
  log.info({ domain }, "Processing Hokkien input");
  const normalised = await normaliseHokkien(text);
  return {
    translation: normalised,
    plainExplanation: `[Hokkien normalised: ${normalised}]`,
    dialectTerm: text,
    culturalNote: "Hokkien (Minnan) dialect spoken by many older Singaporean Chinese",
    parentLanguageEquivalent: normalised,
  };
}
