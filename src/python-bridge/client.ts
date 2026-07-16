import { createServiceLogger } from "../shared/logger.js";
import { ExternalServiceError } from "../shared/errors.js";
import { hfJson, hfBinary, hfRawOut } from "../shared/hf/client.js";
import { chatComplete } from "../services/ai/llmClient.js";

const log = createServiceLogger("hf-bridge");

const STT_MODEL = process.env.HF_STT_MODEL ?? "openai/whisper-large-v3-turbo";
// Empty by default: HF de-listed SeamlessM4T-v2 from the free hf-inference provider
// (hard 400), so the default translate path is the LLM (GLM). Set HF_TRANSLATE_MODEL
// to a served model to re-enable the HF-first path (B6 — avoids a guaranteed-failing
// HF round-trip on every translation).
const TRANSLATE_MODEL = process.env.HF_TRANSLATE_MODEL ?? "";
const DETECT_MODEL = process.env.HF_DETECT_MODEL ?? "papluca/xlm-roberta-base-language-detection";
const EMOTION_MODEL = process.env.HF_EMOTION_MODEL ?? "j-hartmann/emotion-english-distilroberta-base";
const AUDIO_EMOTION_MODEL = process.env.HF_AUDIO_EMOTION_MODEL ?? "audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim";
const TTS_MODEL_PREFIX = process.env.HF_TTS_MODEL_PREFIX ?? "facebook/mms-tts-";

// Our internal lang code -> MMS-TTS model suffix
const TTS_LANG_SUFFIX: Record<string, string> = {
  en: "eng", zh: "zho", ms: "zsm", ta: "tam", hi: "hin", ml: "mal", pa: "pan",
};

export interface TranscribeResult {
  text: string;
  language: string;
  confidence: number;
}

export interface TranslateResult {
  translated_text: string;
  source_lang: string;
  target_lang: string;
}

export interface DetectResult {
  language: string;
  confidence: number;
}

export interface EmotionResult {
  label: string;
  score: number;
}

export interface AudioEmotionResult {
  valence: number;
  arousal: number;
  dominance: number;
}

// SeamlessM4T-v2 language codes (per merge spec). Note zh -> cmn_Hans (Seamless),
// not zho_Hans (NLLB) — that one code is the difference between the two schemes.
const SEAMLESS: Record<string, string> = {
  en: "eng_Latn",
  zh: "cmn_Hans",
  yue: "yue_Hant",
  ms: "zsm_Latn",
  ta: "tam_Taml",
  hi: "hin_Deva",
  ml: "mal_Mlym",
  pa: "pan_Guru",
};

function toSeamless(lang: string): string {
  return SEAMLESS[lang] ?? lang;
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ── Speech-to-text (Whisper via HF) ───────────────────────────────────────────
// Whisper cold-starts on HF serverless routinely exceed the default 30s timeout, which
// used to abort the call and tell the citizen their (perfectly clear) audio couldn't be
// understood. STT gets its own generous budget; warm calls still return in ~1-2s.
const HF_STT_TIMEOUT_MS = parseInt(process.env.HF_STT_TIMEOUT_MS ?? "", 10) || 90000;

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<TranscribeResult> {
  log.info({ mimeType, model: STT_MODEL }, "Transcribing audio via HF");
  const out = (await hfBinary(STT_MODEL, base64ToBytes(audioBase64), mimeType, { timeoutMs: HF_STT_TIMEOUT_MS })) as { text?: string };
  const text = (out?.text ?? "").trim();
  if (!text) throw new ExternalServiceError("hf", "transcription returned empty text");
  return { text, language: "auto", confidence: 0.9 };
}

// HF serverless has no per-dialect STT adapter like local MMS — route dialects
// through the same Whisper model. Dialect hint is kept for logging/telemetry.
export async function transcribeDialect(
  audioBase64: string,
  mimeType: string,
  dialectCode: string,
): Promise<TranscribeResult> {
  log.info({ mimeType, dialectCode }, "Transcribing dialect audio via HF (Whisper fallback)");
  const result = await transcribeAudio(audioBase64, mimeType);
  return { ...result, language: dialectCode };
}

// Human-readable language names for the LLM translation fallback.
const LANG_NAMES: Record<string, string> = {
  en: "English", zh: "Chinese (Simplified)", ms: "Malay", ta: "Tamil",
  hi: "Hindi", ml: "Malayalam", pa: "Punjabi", yue: "Cantonese",
};

// LLM (GLM) translation — provider-independent fallback used when HF can't serve
// the translation model (HF dropped SeamlessM4T-v2 from the hf-inference provider).
async function llmTranslate(text: string, targetLang: string): Promise<string> {
  const name = LANG_NAMES[targetLang] ?? targetLang;
  const r = await chatComplete([
    {
      role: "system",
      content:
        `You are a professional translator. Translate the user's text into ${name}. ` +
        "Output ONLY the translation — no notes, no quotes, no romanisation. " +
        "Preserve numbers, currency, percentages, URLs and emoji exactly, and keep \"CPF\" " +
        "and official scheme names recognisable.",
    },
    { role: "user", content: text },
  ], { includeSoul: false, disableThinking: true });
  return (r.content ?? "").trim();
}

// ── Translation (HF SeamlessM4T-v2, with LLM fallback) ────────────────────────
// HF migrated to "Inference Providers" and de-listed SeamlessM4T-v2 from the free
// hf-inference provider (hard 400). We try HF first (still works if HF_TRANSLATE_MODEL
// points at a served model), then fall back to the LLM so translation stays up
// regardless of HF's model availability.
export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<TranslateResult> {
  if (sourceLang === targetLang || !text.trim()) {
    return { translated_text: text, source_lang: sourceLang, target_lang: targetLang };
  }

  // HF attempt is opt-in (HF_TRANSLATE_MODEL set to a served model). By default we go
  // straight to the LLM and skip the always-failing SeamlessM4T-v2 call (B6).
  if (TRANSLATE_MODEL) {
    try {
      log.info({ sourceLang, targetLang, model: TRANSLATE_MODEL }, "Translating text via HF");
      const out = await hfJson(TRANSLATE_MODEL, {
        inputs: text,
        parameters: { src_lang: toSeamless(sourceLang), tgt_lang: toSeamless(targetLang) },
      });
      // Parse defensively — Seamless serverless output shape varies across deployments.
      const first = Array.isArray(out) ? out[0] : out;
      const translated =
        (first as { translation_text?: string; generated_text?: string; text?: string })?.translation_text ??
        (first as { generated_text?: string })?.generated_text ??
        (first as { text?: string })?.text ??
        "";
      if (translated) {
        return { translated_text: translated, source_lang: sourceLang, target_lang: targetLang };
      }
      log.warn({ sourceLang, targetLang }, "HF translate returned empty — falling back to LLM");
    } catch (hfErr) {
      log.warn({ sourceLang, targetLang, err: (hfErr as Error).message }, "HF translate failed — falling back to LLM");
    }
  }

  const llm = await llmTranslate(text, targetLang).catch((e) => {
    log.error({ err: (e as Error).message }, "LLM translate failed");
    return "";
  });
  if (llm) {
    return { translated_text: llm, source_lang: sourceLang, target_lang: targetLang };
  }
  // Translation unavailable — throw so callers (which already .catch) degrade to the original text.
  throw new ExternalServiceError("translate", "translation failed (LLM unavailable)");
}

// ── Language detection (text-classification via HF) ───────────────────────────
// The 7 languages the assistant actually supports. The HF detector
// (papluca/xlm-roberta-base-language-detection) does NOT cover ms/ta/ml/pa and mislabels
// them (e.g. Malay → "ru"); when it returns a code outside this set we fall back to GLM.
const APP_LANGS = new Set(["en", "zh", "ms", "ta", "hi", "ml", "pa"]);

// LLM-based detection constrained to the supported set — reliable for the Latin/Indic
// languages the HF model can't distinguish. Returns "en" if the model is unavailable.
async function llmDetectLanguage(text: string): Promise<string> {
  try {
    const r = await chatComplete([
      { role: "system", content: "Identify the language of the user's message. Reply with EXACTLY one lowercase code from this list and nothing else: en (English), zh (Chinese), ms (Malay / Bahasa Melayu), ta (Tamil), hi (Hindi), ml (Malayalam), pa (Punjabi)." },
      { role: "user", content: text.slice(0, 500) },
    ], { includeSoul: false, disableThinking: true });
    const code = (r.content || "").trim().toLowerCase().match(/[a-z]{2}/)?.[0] ?? "";
    return APP_LANGS.has(code) ? code : "en";
  } catch {
    return "en";
  }
}

// Deterministic script → language for the non-Latin supported languages. Far more reliable
// than the HF/LLM classifiers for these — the HF model confuses Tamil with Hindi and can't
// see ms/ta/ml/pa at all. Returns null for Latin text (en vs ms), which still needs HF/LLM.
function scriptLanguage(text: string): string | null {
  if (/[஀-௿]/.test(text)) return "ta"; // Tamil
  if (/[ഀ-ൿ]/.test(text)) return "ml"; // Malayalam
  if (/[਀-੿]/.test(text)) return "pa"; // Gurmukhi (Punjabi)
  if (/[ऀ-ॿ]/.test(text)) return "hi"; // Devanagari (Hindi)
  if (/[㐀-䶿一-鿿]/.test(text)) return "zh"; // CJK (Chinese)
  return null;
}

// Malay keyword tokens that xlm-roberta reliably mislabels. Matching ≥2 as whole
// words is a strong Malay signal that we can treat as certain without calling HF.
const MALAY_KEYWORDS = [
  "saya", "awak", "boleh", "nak", "lah", "mah", "tidak", "ada",
  "ini", "itu", "dan", "dengan", "untuk", "dari", "ke", "di",
];

export async function detectLanguage(text: string): Promise<{ lang: string; confident: boolean }> {
  // 1) Script is deterministic for the non-Latin supported languages.
  const byScript = scriptLanguage(text);
  if (byScript) return { lang: byScript, confident: true };

  // 2) Malay keyword heuristics — runs before HF to catch common mislabellings.
  const lower = text.toLowerCase();
  let malayHits = 0;
  for (const kw of MALAY_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`).test(lower)) {
      malayHits++;
      if (malayHits >= 2) return { lang: "ms", confident: true };
    }
  }

  // 3) Short-text guard — HF is unreliable on very short strings, skip straight to LLM.
  if (text.trim().length < 8) {
    const result = await llmDetectLanguage(text);
    return { lang: result, confident: false };
  }

  // 4) Latin script (en vs ms): HF detector, then LLM fallback when HF returns a code we
  //    don't support (it mislabels Malay, e.g. → "ru").
  log.info({ model: DETECT_MODEL }, "Detecting language via HF");
  try {
    const out = (await hfJson(DETECT_MODEL, { inputs: text })) as Array<Array<{ label: string; score: number }>>;
    // text-classification returns [[{label, score}, ...]] sorted by score desc.
    const top = Array.isArray(out) && Array.isArray(out[0]) ? out[0][0] : undefined;
    const label = (top?.label ?? "").split(/[-_]/)[0] ?? "";
    if (APP_LANGS.has(label)) return { lang: label, confident: true };
    // HF returned a code we don't support (it can't tell ms/ta/ml/pa apart) → ask the LLM,
    // constrained to the supported set, which classifies these reliably.
    log.info({ hfLabel: label }, "HF language detect out-of-set — falling back to LLM");
    return { lang: await llmDetectLanguage(text), confident: false };
  } catch (err) {
    log.warn({ err: (err as Error).message }, "HF language detect failed — falling back to LLM");
    return { lang: await llmDetectLanguage(text), confident: false };
  }
}

// ── Emotion / sentiment classification (text-classification via HF) ───────────
export async function detectEmotion(text: string): Promise<EmotionResult> {
  log.info({ model: EMOTION_MODEL }, "Detecting emotion via HF");
  const out = (await hfJson(EMOTION_MODEL, { inputs: text })) as Array<Array<{ label: string; score: number }>>;
  const top = Array.isArray(out) && Array.isArray(out[0]) ? out[0][0] : undefined;
  if (!top) throw new ExternalServiceError("hf", "emotion detection returned no labels");
  return { label: top.label.toLowerCase(), score: top.score };
}

// Dimensional audio emotion (valence/arousal/dominance), 0–1 each. Used to boost
// the text emotion score when the user sent a voice note.
export async function detectAudioEmotion(audioBase64: string, mimeType: string): Promise<AudioEmotionResult> {
  log.info({ model: AUDIO_EMOTION_MODEL }, "Detecting audio emotion via HF");
  const out = (await hfBinary(AUDIO_EMOTION_MODEL, base64ToBytes(audioBase64), mimeType)) as
    | Array<{ label: string; score: number }>
    | { valence?: number; arousal?: number; dominance?: number };

  // Some deployments return [{label,score}] (labels: arousal/dominance/valence),
  // others a flat object. Handle both; default unknown dimensions to neutral 0.5.
  const dims: Record<string, number> = { valence: 0.5, arousal: 0.5, dominance: 0.5 };
  if (Array.isArray(out)) {
    for (const item of out) {
      const key = item.label?.toLowerCase();
      if (key && key in dims) dims[key] = item.score;
    }
  } else if (out && typeof out === "object") {
    if (typeof out.valence === "number") dims.valence = out.valence;
    if (typeof out.arousal === "number") dims.arousal = out.arousal;
    if (typeof out.dominance === "number") dims.dominance = out.dominance;
  }
  return { valence: dims.valence ?? 0.5, arousal: dims.arousal ?? 0.5, dominance: dims.dominance ?? 0.5 };
}

// ── Text-to-speech ────────────────────────────────────────────────────────────
export interface TTSResult {
  audioBase64: string;
  mimeType: string;
}

// Voice selection per language — Singapore English voices prioritised
const EDGE_TTS_VOICES: Record<string, string> = {
  en: "en-SG-LunaNeural",
  zh: "zh-CN-XiaoxiaoNeural",
  ms: "ms-MY-YasminNeural",
  ta: "ta-SG-VenbaNeural",
  hi: "hi-IN-SwaraNeural",
  ml: "ml-IN-SobhanaNeural",
  pa: "pa-IN-OjaswiniNeural",
};

// Dialect-specific voice overrides.
// Cantonese: Edge TTS has a real HK Cantonese neural voice that reads Chinese
// characters with correct Cantonese pronunciation.
// Southern Min (Hokkien/Teochew/Hainanese) and Hakka: MMS-TTS nan/hak models
// require romanised text (POJ/Tai-lo/Hakka romanisation), which the bot doesn't
// produce — zh-HK-HiuMaanNeural is the closest natural-sounding Chinese voice
// for southern-dialect speakers over standard Mandarin.
// Malay varieties and Tamil varieties map to their existing standard voices.
const DIALECT_TTS_VOICES: Record<string, string> = {
  "zh-can": "zh-HK-HiuMaanNeural",
  "zh-hok": "zh-HK-HiuMaanNeural",
  "zh-teo": "zh-HK-HiuMaanNeural",
  "zh-hak": "zh-HK-HiuMaanNeural",
  "zh-hai": "zh-HK-HiuMaanNeural",
  "ms-bms": "ms-MY-YasminNeural",
  "ms-joh": "ms-MY-YasminNeural",
  "ms-boy": "ms-MY-YasminNeural",
  "ms-jav": "ms-MY-YasminNeural",
  "ta-sin": "ta-SG-VenbaNeural",
  "ta-spo": "ta-SG-VenbaNeural",
};

// Text-to-speech via Microsoft Edge TTS (msedge-tts).
// Falls back to HF MMS-TTS if edge-tts fails.
// dialectCode (optional) overrides the language-level voice selection so dialect
// speakers hear a voice closer to their own variety.
export async function synthesizeSpeech(
  text: string,
  language: string,
  _speechRate: number,
  dialectCode?: string,
): Promise<TTSResult> {
  const voice = (dialectCode ? DIALECT_TTS_VOICES[dialectCode] : undefined)
    ?? EDGE_TTS_VOICES[language]
    ?? EDGE_TTS_VOICES["en"]!;
  log.info({ language, voice }, "Synthesizing speech via Edge TTS");

  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const { audioStream } = tts.toStream(text);
      audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      audioStream.on("end", resolve);
      audioStream.on("error", reject);
    });
    const audio = Buffer.concat(chunks);
    if (audio.length === 0) throw new Error("Edge TTS returned empty audio");
    log.info({ language, voice, bytes: audio.length }, "Edge TTS audio generated");
    return { audioBase64: audio.toString("base64"), mimeType: "audio/mpeg" };
  } catch (edgeErr) {
    log.warn({ edgeErr }, "Edge TTS failed — falling back to HF MMS-TTS");
    const suffix = TTS_LANG_SUFFIX[language] ?? "eng";
    const model = `${TTS_MODEL_PREFIX}${suffix}`;
    const { bytes, contentType } = await hfRawOut(model, { inputs: text });
    if (bytes.length === 0) throw new ExternalServiceError("hf", "TTS returned no audio");
    return { audioBase64: Buffer.from(bytes).toString("base64"), mimeType: contentType || "audio/flac" };
  }
}
