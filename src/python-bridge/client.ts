import { createServiceLogger } from "../shared/logger.js";
import { ExternalServiceError } from "../shared/errors.js";
import { hfJson, hfBinary, hfRawOut } from "../shared/hf/client.js";

const log = createServiceLogger("hf-bridge");

const STT_MODEL = process.env.HF_STT_MODEL ?? "openai/whisper-large-v3";
const TRANSLATE_MODEL = process.env.HF_TRANSLATE_MODEL ?? "facebook/seamless-m4t-v2-large";
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
  log.info({ sourceLang, targetLang, model: TRANSLATE_MODEL }, "Translating text via HF (SeamlessM4T-v2)");
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

// Text-to-speech via facebook/mms-tts-{lang}. MMS-TTS has no speech-rate control,
// so speechRate is accepted for signature compatibility but ignored.
export async function synthesizeSpeech(
  text: string,
  language: string,
  _speechRate: number,
): Promise<TTSResult> {
  const suffix = TTS_LANG_SUFFIX[language] ?? "eng";
  const model = `${TTS_MODEL_PREFIX}${suffix}`;
  log.info({ language, model }, "Synthesizing speech via HF MMS-TTS");
  const { bytes, contentType } = await hfRawOut(model, { inputs: text });
  if (bytes.length === 0) throw new ExternalServiceError("hf", "TTS returned no audio");
  return { audioBase64: Buffer.from(bytes).toString("base64"), mimeType: contentType || "audio/flac" };
}
