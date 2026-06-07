import type { Language } from "../../shared/types/index.js";
import { createServiceLogger } from "../../shared/logger.js";
import { getTranslationCache, writeTranslationCache } from "../../db/proxy-client.js";
import { translateText as pyTranslate } from "../../python-bridge/client.js";

const log = createServiceLogger("translate");

function cacheHash(text: string, source: Language, target: Language): string {
  return `${source}:${target}:${Buffer.from(text).toString("base64url")}`;
}

export async function translateText(
  text: string,
  source: Language,
  target: Language,
): Promise<string> {
  if (source === target) return text;

  const hash = cacheHash(text, source, target);

  const cached = await getTranslationCache(hash).catch(() => null);
  if (cached?.translated_text) {
    log.info({ source, target }, "Translation cache hit");
    return cached.translated_text;
  }

  const result = await pyTranslate(text, source, target);

  await writeTranslationCache({
    hash,
    translated_text: result.translated_text,
    model: "seamlessm4t",
    created_at: new Date().toISOString(),
  }).catch(() => log.debug("Failed to write translation cache"));

  return result.translated_text;
}
