import { createServiceLogger } from "../shared/logger.js";
import { ExternalServiceError } from "../shared/errors.js";
import { hfJson, hfBinary } from "../shared/hf/client.js";

const log = createServiceLogger("hf-bridge");

const STT_MODEL = process.env.HF_STT_MODEL ?? "openai/whisper-large-v3";
const TRANSLATE_MODEL = process.env.HF_TRANSLATE_MODEL ?? "facebook/nllb-200-distilled-600M";
const DETECT_MODEL = process.env.HF_DETECT_MODEL ?? "papluca/xlm-roberta-base-language-detection";
const EMOTION_MODEL = process.env.HF_EMOTION_MODEL ?? "j-hartmann/emotion-english-distilroberta-base";

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

// NLLB uses FLORES-200 codes (lang_Script). Map our internal codes onto them.
const FLORES: Record<string, string> = {
  en: "eng_Latn",
  zh: "zho_Hans",
  yue: "yue_Hant",
  ms: "zsm_Latn",
  ta: "tam_Taml",
  hi: "hin_Deva",
  ml: "mal_Mlym",
  pa: "pan_Guru",
};

function toFlores(lang: string): string {
  return FLORES[lang] ?? lang;
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ── Speech-to-text (Whisper via HF) ───────────────────────────────────────────
export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<TranscribeResult> {
  log.info({ mimeType, model: STT_MODEL }, "Transcribing audio via HF");
  const out = (await hfBinary(STT_MODEL, base64ToBytes(audioBase64), mimeType)) as { text?: string };
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

// ── Translation (NLLB-200 via HF) ─────────────────────────────────────────────
export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<TranslateResult> {
  if (sourceLang === targetLang) {
    return { translated_text: text, source_lang: sourceLang, target_lang: targetLang };
  }
  log.info({ sourceLang, targetLang, model: TRANSLATE_MODEL }, "Translating text via HF");
  const out = (await hfJson(TRANSLATE_MODEL, {
    inputs: text,
    parameters: { src_lang: toFlores(sourceLang), tgt_lang: toFlores(targetLang) },
  })) as Array<{ translation_text?: string }>;
  const translated = Array.isArray(out) ? out[0]?.translation_text ?? "" : "";
  if (!translated) throw new ExternalServiceError("hf", "translation returned empty text");
  return { translated_text: translated, source_lang: sourceLang, target_lang: targetLang };
}

// ── Language detection (text-classification via HF) ───────────────────────────
export async function detectLanguage(text: string): Promise<string> {
  log.info({ model: DETECT_MODEL }, "Detecting language via HF");
  const out = (await hfJson(DETECT_MODEL, { inputs: text })) as Array<Array<{ label: string; score: number }>>;
  // text-classification returns [[{label, score}, ...]] sorted by score desc.
  const top = Array.isArray(out) && Array.isArray(out[0]) ? out[0][0] : undefined;
  const label = top?.label ?? "en";
  // Detection models emit ISO codes (en, zh, ...) which already match our internal set.
  return label.split(/[-_]/)[0] ?? "en";
}

// ── Emotion / sentiment classification (text-classification via HF) ───────────
export async function detectEmotion(text: string): Promise<EmotionResult> {
  log.info({ model: EMOTION_MODEL }, "Detecting emotion via HF");
  const out = (await hfJson(EMOTION_MODEL, { inputs: text })) as Array<Array<{ label: string; score: number }>>;
  const top = Array.isArray(out) && Array.isArray(out[0]) ? out[0][0] : undefined;
  if (!top) throw new ExternalServiceError("hf", "emotion detection returned no labels");
  return { label: top.label.toLowerCase(), score: top.score };
}

// ── Text-to-speech ────────────────────────────────────────────────────────────
export interface TTSResult {
  audioBase64: string;
  mimeType: string;
}

// TTS is out of scope for the HF Inference API migration (edge-tts was Microsoft,
// not HF, and has no drop-in serverless equivalent). Stubbed: callers fall back to
// text replies. Revisit with an HF TTS model (e.g. facebook/mms-tts-*) if needed.
export async function synthesizeSpeech(
  text: string,
  language: string,
  _speechRate: number,
): Promise<TTSResult> {
  log.warn({ language }, "synthesizeSpeech is stubbed (HF TTS not wired) — returning no audio");
  void text;
  return { audioBase64: "", mimeType: "audio/mpeg" };
}
