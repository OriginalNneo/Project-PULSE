import { createServiceLogger } from "../shared/logger.js";
import { ExternalServiceError } from "../shared/errors.js";

const log = createServiceLogger("py-bridge");
const WHISPER_BASE = process.env.PYTHON_BRIDGE_URL ?? "http://py-bridge:5001";
const TRANSLATOR_BASE = process.env.TRANSLATOR_URL ?? "http://translator:5002";

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

export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<TranscribeResult> {
  log.info({ mimeType }, "Transcribing audio via Whisper");
  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const formData = new FormData();
  formData.append("audio", new Blob([bytes], { type: mimeType }), "audio");
  const res = await fetch(`${WHISPER_BASE}/transcribe`, { method: "POST", body: formData });
  if (!res.ok) throw new ExternalServiceError("py-bridge", `transcribe failed: ${res.status}`);
  return res.json() as Promise<TranscribeResult>;
}

// MMS-300m lives in py-bridge alongside Whisper (not in the translator container)
export async function transcribeDialect(
  audioBase64: string,
  mimeType: string,
  dialectCode: string,
): Promise<TranscribeResult> {
  log.info({ mimeType, dialectCode }, "Transcribing dialect audio via MMS-300m");
  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const formData = new FormData();
  formData.append("audio", new Blob([bytes], { type: mimeType }), "audio");
  formData.append("dialect", dialectCode);
  const res = await fetch(`${WHISPER_BASE}/transcribe-dialect`, { method: "POST", body: formData });
  if (!res.ok) throw new ExternalServiceError("py-bridge", `transcribe-dialect failed: ${res.status}`);
  return res.json() as Promise<TranscribeResult>;
}

export async function translateText(text: string, sourceLang: string, targetLang: string): Promise<TranslateResult> {
  log.info({ sourceLang, targetLang }, "Translating text via SeamlessM4T");
  const res = await fetch(`${TRANSLATOR_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }),
  });
  if (!res.ok) throw new ExternalServiceError("translator", `translate failed: ${res.status}`);
  return res.json() as Promise<TranslateResult>;
}

export async function detectLanguage(text: string): Promise<string> {
  log.info("Detecting language via fastText");
  const res = await fetch(`${TRANSLATOR_BASE}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new ExternalServiceError("translator", `detect failed: ${res.status}`);
  const data = (await res.json()) as DetectResult;
  return data.language;
}

export interface TTSResult {
  audioBase64: string;
  mimeType: string;
}

export async function synthesizeSpeech(
  text: string,
  language: string,
  speechRate: number,
): Promise<TTSResult> {
  log.info({ language, speechRate }, "Synthesizing speech via edge-tts");
  const res = await fetch(`${TRANSLATOR_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language, speech_rate: speechRate }),
  });
  if (!res.ok) throw new ExternalServiceError("translator", `tts failed: ${res.status}`);
  return res.json() as Promise<TTSResult>;
}
