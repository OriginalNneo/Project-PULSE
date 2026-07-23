import type { Language, VulnerabilityTier } from "../shared/types/index.js";
import { runTranscriberSubagent } from "../agents/transcriber/agent.js";
import { getSpeechRate } from "../agents/accessibility/agent.js";
import {
  detectRepairSignal,
  impliedReadingWpm,
  isSupportOptIn,
  isSupportOptOut,
  isSupportConfirmation,
  isSupportDecline,
  raiseTier,
  READING_RATE_FLOOR_WPM,
  SLOW_STREAK_TO_OFFER,
} from "../agents/accessibility/support.js";
import { runQueryAgent } from "../agents/query/agent.js";
import { getUserPrefs, upsertUserPrefs, postToQueue, getQueue, updateQueueEmotion, updateQueueLang, updateQueuePriority, appendToQueueHistory, setQueueQuerySummary, type UserPrefs } from "../db/proxy-client.js";
import { callHermes } from "../services/ai/llmClient.js";
import { findGuidingSetForQuery } from "../data/knowledge/guiding.js";
import { synthesizeGuidedAnswer } from "../agents/query/guidedSynthesis.js";
import type { GuidingQuestion } from "../data/docstore/types.js";
import { translateText, synthesizeSpeech, detectLanguage, detectEmotion, detectAudioEmotion } from "../python-bridge/client.js";
import { scoreEmotion, type ScoredEmotion } from "../agents/main/emotion.js";
import { effectiveEmotion } from "../agents/main/emotionTrajectory.js";
import {
  touchSession,
  getActiveSession,
  endSession,
  recordRating,
  resetSession,
  getHistory,
  appendHistory,
  clearHistory,
  isClosingMessage,
} from "../services/session/manager.js";
import { notifyNewQueueEntry, notifyQueueUpdated } from "../dashboard/notify.js";
import { formatReply, containsHtml } from "../shared/formatter.js";
import { analyzeEscalation, hasFinancialUrgency } from "../agents/escalation/analyzer.js";
import { computePriorityScore } from "../dashboard/queue.js";
import { classifyQuery } from "../agents/triage/classifier.js";
import { broadcast } from "./ws.js";
import { pushEmotionEvent, getLatestEmotionForUser } from "./dashboard.js";
import { startThinking } from "./thinking.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("inbound");

// Per-user rolling conversation history now lives in services/session/manager.ts
// (getHistory/appendHistory/clearHistory) so that session reset — on officer close,
// customer-satisfied, or the 24h timeout — can clear it from one place. User turns
// still carry the per-message sentiment score for the officer dashboard timeline.

type Lang = Language;

// Languages we can translate into AND synthesize speech for.
const SUPPORTED_LANGS = new Set<Lang>(["en", "zh", "ms", "ta", "hi", "ml", "pa"]);

// Script ranges for the non-Latin supported languages.
const LANG_SCRIPT: Partial<Record<Lang, RegExp>> = {
  zh: /[㐀-䶿一-鿿]/,
  ta: /[஀-௿]/,
  hi: /[ऀ-ॿ]/,
  pa: /[਀-੿]/,
  ml: /[ഀ-ൿ]/,
};

// Decide this turn's language from the detector result. A claim of a non-Latin-script
// language must be backed by that script actually appearing in the message — the HF/LLM
// detectors sometimes label Singlish or short English as zh/hi, and because the switch
// is persisted to preferred_lang, one misfire used to lock the user into Chinese replies
// for every following English message.
function resolveTurnLang(current: Lang, detected: { lang: string; confident: boolean } | null, text: string): Lang {
  if (!detected || !SUPPORTED_LANGS.has(detected.lang as Lang)) return current;
  const script = LANG_SCRIPT[detected.lang as Lang];
  if (script && !script.test(text)) return current;
  return detected.lang as Lang;
}

export interface ChannelButton {
  label: string;
  callbackId: string;
}

export interface InboundChannel {
  prefix: string;
  /** Send a plain or HTML-formatted text message. html=true signals the channel to enable HTML rendering. */
  send: (text: string, html?: boolean) => Promise<void>;
  sendWithButtons?: (text: string, buttons: ChannelButton[][], html?: boolean) => Promise<void>;
  sendVoice?: (audioBase64: string, mimeType: string) => Promise<void>;
  // ── Optional in-place editing (Telegram) — powers the "thinking" animation ──
  /** Send a message and return its id so it can be edited later. Null if unsupported/failed. */
  sendForEdit?: (text: string, html?: boolean) => Promise<string | null>;
  /** Edit a previously sent message in place, optionally attaching buttons. Returns success. */
  editMessage?: (messageId: string, text: string, buttons?: ChannelButton[][], html?: boolean) => Promise<boolean>;
  /** Delete a previously sent message (clears a stale thinking bubble on fallback). */
  deleteMessage?: (messageId: string) => Promise<void>;
  /** Show a transient native "typing…" indicator. */
  typing?: () => Promise<void>;
}

export interface InboundMessage {
  userKey: string;
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  durationSec?: number; // voice-note length in seconds (used to flag too-short/unclear recordings)
}

// Words that mean "yes, connect me to an officer"
const OFFICER_AFFIRMATIONS = new Set([
  "yes", "ok", "okay", "sure", "please", "connect", "officer", "agent",
  "human", "staff", "yes please", "connect me", "speak to officer",
  "yes connect", "i want officer", "want officer",
]);

export function isOfficerConfirmation(text: string): boolean {
  const t = text.toLowerCase().trim();
  // /^yes\b/ matches "yes", "yes please", "yes connect me" but NOT "yesterday" (B3).
  return OFFICER_AFFIRMATIONS.has(t) || /^yes\b/.test(t) || t.includes("officer") || t.includes("connect me");
}

// Stricter than isOfficerConfirmation — used DURING the guiding-questions flow,
// where a bare "yes"/"ok" is a legitimate answer to a yes/no question and must
// NOT be misread as "connect me to an officer". Only explicit human/officer
// wording escapes the guiding flow.
function isExplicitOfficerRequest(text: string): boolean {
  const t = text.toLowerCase();
  // Whole-word-ish so a free-text answer like "my property agent" or "urgent"
  // doesn't trip escalation mid-flow.
  return /\bofficer/.test(t) || /\bagent/.test(t) || /\bhuman\b/.test(t)
    || t.includes("real person") || t.includes("speak to") || t.includes("connect me");
}

// Mid-flow "stop" words that cancel the guiding-questions flow.
const GUIDING_CANCEL = /^(cancel|stop|never ?mind|nvm|forget it|forget this|quit|exit)\b/i;

// Strips Telegram/Markdown formatting and truncates so MMS-TTS receives clean plain text.
// MMS-TTS reads markup characters aloud and chokes on very long inputs.
const TTS_MAX_CHARS = 500;
function stripMarkdownForTTS(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, "$1")       // *bold*
    .replace(/_([^_]+)_/g, "$1")          // _italic_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link](url) → link text
    .replace(/https?:\/\/\S+/g, "")       // bare URLs
    .replace(/[•\-–—]\s*/g, "")           // bullet chars
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu, "") // emojis (TTS reads their names aloud)
    .replace(/\n{2,}/g, ". ")             // paragraph breaks → pause
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, TTS_MAX_CHARS);
}

const OFFICER_BUTTON_LABEL = "Connect to CPF Officer";
const OFFICER_BUTTON: ChannelButton[][] = [
  [{ label: `🧑‍💼 ${OFFICER_BUTTON_LABEL}`, callbackId: "connect_officer" }],
];

// The officer button, with its label localised to the user's language (emoji stays outside
// the translated text). Uses the shared, cached localizeFixed.
async function officerButtonFor(lang: Lang): Promise<ChannelButton[][]> {
  if (lang === "en") return OFFICER_BUTTON;
  const label = await localizeFixed(OFFICER_BUTTON_LABEL, lang).catch(() => OFFICER_BUTTON_LABEL);
  return [[{ label: `🧑‍💼 ${label}`, callbackId: "connect_officer" }]];
}

// Stock captions Whisper invents for silence/noise — artefacts of its YouTube training
// data. Matched deterministically against the WHOLE transcript (a real question that merely
// contains one of these phrases is unaffected). Kept to unambiguous video-caption phrases;
// things a person might actually say ("thank you", "uh huh") are NOT listed — those are
// answered.
const STT_STOCK_HALLUCINATIONS = new Set([
  "thank you for watching",
  "thanks for watching",
  "please subscribe",
  "please like and subscribe",
  "subscribe to my channel",
  "see you in the next video",
  "字幕由amara.org社区提供",
  "字幕製作者",
  "ご視聴ありがとうございました",
  "구독과 좋아요 부탁드립니다",
]);

// Deterministic garbage check: punctuation-only output, a known silence caption, or one
// fragment stuttered over and over (Whisper's noise-loop failure mode).
function looksLikeSttHallucination(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[\s.,!?。，！？、]+$/gu, "");
  if (!/[\p{L}\p{N}]/u.test(t)) return true;
  if (STT_STOCK_HALLUCINATIONS.has(t)) return true;
  const words = t.split(/\s+/);
  return words.length >= 4 && new Set(words).size === 1;
}

// Failure scenario reply: STT failed or produced gibberish. One message for both —
// the user asked for the honest "service overloaded" wording rather than anything
// that blames their recording. Replies in the user’s language, with the "Connect to
// CPF Officer" button, and a spoken (TTS) version.
const VOICE_FAIL_MESSAGE =
  "Our voice service is a little overloaded right now — please type your question instead, or try the voice note again in a few minutes.";

async function sendUnclearVoiceReply(
  channel: InboundChannel,
  userId: string,
  lang: string,
  prefs: { support_tier?: VulnerabilityTier; preferred_dialect?: string },
): Promise<void> {
  // Remember the last voice note was unclear so an escalation right after has context.
  await upsertUserPrefs({ userId, pendingVoiceUnclear: true }).catch(() => null);
  let msg: string = VOICE_FAIL_MESSAGE;
  if (lang !== "en") {
    const t = await translateText(msg, "en", lang).catch(() => null);
    if (t) msg = t.translated_text;
  }
  if (channel.sendWithButtons) {
    await channel.sendWithButtons(msg, await officerButtonFor(lang as Lang), false).catch(() => null);
  } else {
    await channel.send(msg).catch(() => null);
  }
  if (channel.sendVoice) {
    // Speech rate follows the reading-support tier, same as normal replies — a high_touch
    // citizen hears the voice-fail message slowly too, not at full speed.
    const speechRate = getSpeechRate(prefs.support_tier ?? "self_service");
    const tts = await synthesizeSpeech(stripMarkdownForTTS(msg), lang as Lang, speechRate, prefs.preferred_dialect).catch(() => null);
    if (tts?.audioBase64) await channel.sendVoice(tts.audioBase64, tts.mimeType).catch(() => null);
  }
}

// Acknowledge a reading-support change, localised to the citizen's language. "on" confirms
// simpler/shorter replies (and how to revert); "off" confirms the return to full detail.
async function sendSupportAck(channel: InboundChannel, mode: "on" | "off", lang: Lang): Promise<void> {
  let msg = mode === "on"
    ? "👍 I'll keep my replies short and simple from now on. Reply *full* anytime to get the complete detail."
    : "👍 Back to full replies with complete detail. Reply *simple* anytime for shorter, simpler answers.";
  if (lang !== "en") {
    const t = await translateText(msg, "en", lang).catch(() => null);
    if (t) msg = t.translated_text;
  }
  await channel.send(msg).catch(() => null);
}

// Strip any residual hotline numbers or stale "reply *Officer*" text the LLM may emit.
function sanitizeReply(text: string): string {
  return text
    .replace(/1800[-\s]?227[-\s]?1188/g, "")
    .replace(/\breply \*?officer\*?\.?/gi, "")
    .replace(/[ \t]{2,}/g, " ")   // only collapse horizontal whitespace — preserve newlines
    .trim();
}

/**
 * Send the bot reply, optionally with the officer button.
 *
 * The escalation decision (from analyzeEscalation) determines:
 *   - shouldEscalate=false  → plain text, no button
 *   - shouldEscalate=true   → offerText appended to reply + button shown
 */
async function sendReply(
  channel: InboundChannel,
  text: string,
  escalation: { shouldEscalate: boolean; offerText: string | null },
  lang: Lang,
  editMessageId?: string | null,
): Promise<void> {
  const clean = sanitizeReply(text);
  // formatReply("html") always HTML-escapes — must always send with parse_mode HTML
  // so entities like &amp; render correctly rather than showing literally.

  // The offer prompt + button label are authored in English — localise both to the
  // user's language so the whole escalation handoff is in their starting language.
  const offerText = escalation.shouldEscalate && escalation.offerText
    ? await localizeFixed(escalation.offerText, lang)
    : null;
  const offerHtml = offerText
    ? offerText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : null;
  const finalText = offerHtml ? `${clean}\n\n${offerHtml}` : clean;
  const buttons = escalation.shouldEscalate ? await officerButtonFor(lang) : undefined;

  // Prefer editing the "thinking" bubble in place — the dot animation becomes the
  // answer with no extra message bubble. Fall back to a fresh send if the edit fails
  // (e.g. message too old) after clearing the stale bubble.
  if (editMessageId && channel.editMessage) {
    const ok = await channel.editMessage(editMessageId, finalText, buttons, true).catch(() => false);
    if (ok) return;
    await channel.deleteMessage?.(editMessageId).catch(() => {});
  }

  if (buttons && channel.sendWithButtons) {
    await channel.sendWithButtons(finalText, buttons, true);
  } else {
    // No button support (e.g. WhatsApp): still include the escalation offer text.
    // (B5: this used to send `clean`, dropping the "tap to connect" prompt entirely.)
    await channel.send(finalText, true);
  }
}

/**
 * Strip any TTS tool-call syntax the LLM emits — regardless of format —
 * and extract the spoken text so the pipeline can actually synthesise audio.
 *
 * Formats seen in the wild:
 *   **generate_tts**(text: "...", language: "en", voice: "warm-female")
 *   [generate_tts]\n• Text: "..."\n• Language: English\n• Output: ...
 *   Generating your audio now…   /  [Generating audio response now...] 🎙️
 */
function interceptTtsCall(reply: string): { cleanReply: string; ttsText: string | null } {
  let ttsText: string | null = null;

  // Format A: **generate_tts**( ... )
  const fmtA = /\*\*generate_tts\*\*\s*\([\s\S]*?\)/gi;
  const matchA = fmtA.exec(reply);
  if (matchA) {
    const textArg = /text\s*:\s*["']([^"']+)["']/i.exec(matchA[0]);
    ttsText = textArg?.[1] ?? null;
  }

  // Format B: [generate_tts] followed by bullet lines
  const fmtB = /\[generate[_\s]tts\][\s\S]*?(?=\n\n|\n[^•\-]|$)/gi;
  const matchB = !ttsText ? fmtB.exec(reply) : null;
  if (matchB) {
    const textBullet = /[•\-]\s*[Tt]ext\s*:\s*["']?([^"'\n]+)["']?/i.exec(matchB[0]);
    ttsText = textBullet?.[1]?.trim() ?? null;
  }

  let clean = reply
    // Strip format A
    .replace(/\*\*generate_tts\*\*\s*\([\s\S]*?\)\s*/gi, "")
    // Strip format B — [generate_tts] block including all bullet lines
    .replace(/\[generate[_\s]tts\][\s\S]*?(?=\n\n|\n[A-Z]|$)/gi, "")
    // Strip any remaining [generate_tts] tag
    .replace(/\[generate[_\s]tts\]/gi, "")
    // Strip "Generating your audio now…" and variants
    .replace(/Generating (your )?audio (now|response)[^\n]*/gi, "")
    // Strip "[Generating audio...] 🎙️" style lines
    .replace(/\[.*?(?:audio|tts|generating).*?\]\s*[🎙️]*/gi, "")
    // Strip orphaned bullet lines about TTS output
    .replace(/[•\-]\s*(Language|Output|Voice)\s*:[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { cleanReply: clean, ttsText };
}

const START_MESSAGE = `Welcome to PULSE — CPF Board Singapore's multilingual assistant.

I can answer questions about CPF in your language, including English, Mandarin, Malay, Tamil, Hindi, Malayalam, and Punjabi. I also understand Singlish and Chinese dialects.

<b>What you can ask:</b>
• CPF contribution rates and how they work
• MediSave, MediShield Life, and healthcare
• Housing — using CPF to buy a flat
• CPF LIFE and retirement payouts
• Withdrawal rules and eligibility

<b>Voice:</b> Send me a voice note and I'll reply in kind.

<b>Commands:</b>
/help — full command list
/voice on — enable voice replies for all messages
/voice off — disable voice replies
/dialect — set your Chinese dialect for audio replies

Just type your question to get started.`;

const HELP_MESSAGE = `<b>PULSE Commands</b>

<b>Voice replies</b>
/voice on — I'll send a voice note with every reply
/voice off — text only

<b>Dialect voice</b>
/dialect cantonese — Cantonese voice (Hong Kong neural)
/dialect hokkien — Hokkien (uses Cantonese voice, closest available)
/dialect teochew — Teochew (uses Cantonese voice)
/dialect hakka — Hakka (uses Cantonese voice)
/dialect hainanese — Hainanese (uses Cantonese voice)
/dialect off — reset to standard language voice

<b>Simpler replies</b>
Reply *simple* (or /support) for shorter, easier-to-read answers, spoken more slowly
Reply *full* to switch back to complete detail

<b>End chat</b>
/end — finish this chat and rate your experience (1–5 ⭐)

<b>Notes</b>
• Send a voice note — I'll transcribe and reply in your language
• Language is auto-detected from what you type
• For personal account details (balance, contributions, payouts), tap the officer button or ask to connect

<b>Supported languages</b>
English · Singlish · Mandarin · Malay · Tamil · Hindi · Malayalam · Punjabi`;

function isStartCommand(text: string): boolean {
  const t = text.toLowerCase().trim();
  return t === "/start" || t === "start";
}

function isHelpCommand(text: string): boolean {
  const t = text.toLowerCase().trim();
  return t === "/help" || t === "help";
}

// Explicit "I'm done" command. Only the slash form — a bare "end"/"done" could be a
// legitimate guiding-flow answer, so natural sign-offs are handled by isClosingMessage
// AFTER the guiding intercept instead.
function isEndCommand(text: string): boolean {
  return text.toLowerCase().trim() === "/end";
}

// Returns "on", "off", or null if the message is not a voice-toggle command.
function parseVoiceToggle(text: string): "on" | "off" | null {
  const t = text.toLowerCase().trim();
  if (t === "voice on" || t === "/voice on" || t === "/voice" || t === "tts on") return "on";
  if (t === "voice off" || t === "/voice off" || t === "tts off") return "off";
  return null;
}

// Dialect aliases → internal dialect code.
// Users can type "/dialect cantonese", "/dialect hokkien", etc.
const DIALECT_ALIASES: Record<string, string> = {
  cantonese: "zh-can", canton: "zh-can", canto: "zh-can",
  hokkien: "zh-hok", hokien: "zh-hok", fukkien: "zh-hok", fujian: "zh-hok", minnan: "zh-hok",
  teochew: "zh-teo", teochow: "zh-teo", chaozhou: "zh-teo",
  hakka: "zh-hak", kejia: "zh-hak",
  hainanese: "zh-hai", hainan: "zh-hai",
  bazaar: "ms-bms", "bazaar malay": "ms-bms", rojak: "ms-bms",
  "spoken tamil": "ta-spo", "singapore tamil": "ta-sin",
};

const DIALECT_LABELS: Record<string, string> = {
  "zh-can": "Cantonese", "zh-hok": "Hokkien", "zh-teo": "Teochew",
  "zh-hak": "Hakka",     "zh-hai": "Hainanese",
  "ms-bms": "Bazaar Malay", "ms-joh": "Malay", "ms-boy": "Malay", "ms-jav": "Malay",
  "ta-sin": "Singapore Tamil", "ta-spo": "Spoken Tamil",
};

/**
 * Parses a /dialect command. Returns:
 *   { code: string }  — a recognised dialect code to save
 *   { code: null }    — user wants to clear their dialect preference
 *   null              — not a dialect command at all
 */
function parseDialectCommand(text: string): { code: string | null } | null {
  const t = text.toLowerCase().trim();
  if (!t.startsWith("/dialect") && !t.startsWith("dialect ")) return null;
  const arg = t.replace(/^\/dialect\s*|^dialect\s*/i, "").trim();
  if (!arg || arg === "off" || arg === "none" || arg === "clear" || arg === "reset") {
    return { code: null };
  }
  const code = DIALECT_ALIASES[arg] ?? null;
  return { code };
}

async function maybeTranslate(text: string, lang: Lang): Promise<string> {
  if (lang === "en" || !text) return text;
  const t = await translateText(text, "en", lang).catch(() => null);
  return t?.translated_text ?? text;
}

// Translate a FIXED English UI string (button label, offer prompt, …) to the user's language,
// cached per (lang,text). These are a small bounded set, so caching keeps the GLM translate off
// the reply critical path after the first time per language.
const uiStringCache = new Map<string, string>();
async function localizeFixed(text: string, lang: Lang): Promise<string> {
  if (lang === "en" || !text) return text;
  const key = `${lang}::${text}`;
  let v = uiStringCache.get(key);
  if (v == null) {
    v = await maybeTranslate(text, lang);
    uiStringCache.set(key, v);
  }
  return v;
}

/**
 * Send one guiding question (≤2 sentences, asked immediately). Expected answers
 * render as inline buttons (callback `guide:<id>:<optIndex>`): `options` for choice
 * questions, `quickReplies` for open ones. Open questions also show an inline
 * example, and the user can always type a free answer. When `editMessageId` is
 * given the question is edited into that bubble (e.g. the "thinking" bubble for
 * Q1) with a fallback to a fresh send.
 */
async function sendGuidingQuestion(
  channel: InboundChannel,
  q: GuidingQuestion,
  lang: Lang,
  editMessageId?: string | null,
): Promise<void> {
  const buttonSource = q.type === "choice" ? q.options : q.quickReplies;
  const hasButtons = Boolean(buttonSource?.length && channel.sendWithButtons);

  // Compose the prompt (question + example + how-to-answer hint).
  const parts = [q.text];
  if (q.example && q.type !== "choice") parts.push(`(for example: ${q.example})`);
  parts.push(hasButtons ? "Tap an option below, or just type your answer." : "Just type your answer.");

  // Translate the prompt AND every button label CONCURRENTLY — a non-English
  // question would otherwise fire N+1 sequential LLM round-trips (slow for the
  // seniors this serves). maybeTranslate is a no-op for English. Indices are
  // preserved so the guide:<id>:<idx> callback still resolves the right option.
  const labelSources = hasButtons ? buttonSource! : [];
  const [text, ...labels] = await Promise.all([
    maybeTranslate(parts.join("\n"), lang),
    ...labelSources.map((s) => maybeTranslate(s ?? "", lang)),
  ]);

  const buttons: ChannelButton[][] = [];
  for (let i = 0; i < labelSources.length; i++) {
    if (labelSources[i] === undefined) continue;
    buttons.push([{ label: labels[i]!, callbackId: `guide:${q.id}:${i}` }]);
  }

  // Prefer editing an existing bubble (Q1 reclaims the thinking bubble); fall back
  // to a fresh send if the edit fails (mirrors sendReply's stale-bubble fallback).
  if (editMessageId && channel.editMessage) {
    const ok = await channel.editMessage(editMessageId, text, buttons.length ? buttons : undefined, false).catch(() => false);
    if (ok) return;
    await channel.deleteMessage?.(editMessageId).catch(() => null);
  }

  if (buttons.length && channel.sendWithButtons) {
    await channel.sendWithButtons(text, buttons, false).catch(() => null);
  } else {
    await channel.send(text, false).catch(() => null);
  }
}

/**
 * Translate (if needed) → HTML-format → send a bot reply, reusing the same
 * pieces as the normal answer path. Returns the plain (pre-format) text so the
 * caller can record it in conversation history.
 */
async function deliverBotReply(
  channel: InboundChannel,
  replyText: string,
  _lang: Lang,
  escalation: { shouldEscalate: boolean; offerText: string | null },
  editMessageId?: string | null,
): Promise<string> {
  // The LLM already generates in the user's language (native generation), so we do
  // NOT translate the reply here — that would double-translate. _lang is kept for
  // signature stability / future use.
  const plain = replyText;
  const reply = formatReply(replyText, "html");
  await sendReply(channel, reply, escalation, _lang, editMessageId).catch((err: unknown) => log.error(err, "deliverBotReply failed"));
  return plain;
}

/**
 * Record the user's answer to the current guiding question and advance the flow.
 * SELF-CONTAINED: fetches its own prefs/lang so it can be called from either the
 * typed path (processInbound) or the inline-button path (telegram.ts callback) —
 * the button path never goes through processInbound and has no shared locals.
 */
export async function recordGuidingAnswer(channel: InboundChannel, userId: string, answerText: string): Promise<void> {
  const prefs = await getUserPrefs(userId).catch(() => null);
  const pg = prefs?.pendingGuiding;
  if (!prefs || !pg) return; // not in guiding mode — nothing to record

  const lang = (prefs.preferred_lang || "en") as Lang;
  const currentQ = pg.questions[pg.index];
  if (!currentQ) {
    await upsertUserPrefs({ ...prefs, pendingGuiding: undefined }).catch(() => null);
    return;
  }

  const answers = [...pg.answers, { id: currentQ.id, question: currentQ.text, answer: answerText }];
  const nextIndex = pg.index + 1;

  // More questions remain → ask the next one.
  const nextQ = pg.questions[nextIndex];
  if (nextQ) {
    await upsertUserPrefs({ ...prefs, pendingGuiding: { ...pg, answers, index: nextIndex } }).catch(() => null);
    await sendGuidingQuestion(channel, nextQ, lang);
    return;
  }

  // All answered → synthesise the tailored answer. Clear guiding + arm the typed
  // officer-offer (the personal-account boundary still applies after personalising).
  await upsertUserPrefs({ ...prefs, pendingGuiding: undefined, pendingOfficerOffer: true }).catch(() => null);
  log.info({ userId, topicKey: pg.topicKey, answers: answers.length }, "Guiding flow complete — synthesising answer");

  const thinking = await startThinking(channel);
  const replyText = await synthesizeGuidedAnswer({
    originalQuery: pg.originalQuery,
    topicTitle: pg.title,
    qa: answers.map((a) => ({ question: a.question, answer: a.answer })),
    knowledge: pg.knowledge,
    synthesisHint: pg.synthesisHint,
    language: lang,
  });
  await thinking.stop();

  const escalation = {
    shouldEscalate: true,
    offerText: "For your specific situation, a CPF officer can give you a personalised answer based on your account. Tap below to connect.",
  };
  const plain = await deliverBotReply(channel, replyText, lang, escalation, thinking.messageId);

  // Record in the rolling history so an officer (if escalated next) sees context.
  const guidedSummary = `[Guided: ${pg.title}] ${pg.originalQuery} — ${answers.map((a) => `${a.question} → ${a.answer}`).join("; ")}`;
  appendHistory(
    userId,
    { role: "user", content: guidedSummary, ts: new Date().toISOString() },
    { role: "agent", content: plain, ts: new Date().toISOString() },
  );
}

/**
 * Slash/keyword commands: /start, /help, /end, voice on|off, /dialect …. Each command
 * fully handles the message; returns true when one fired (the caller then returns).
 */
async function handleCommand(
  channel: InboundChannel,
  userId: string,
  prefs: UserPrefs,
  lang: Lang,
  messageText: string,
): Promise<boolean> {
  if (isStartCommand(messageText)) {
    await channel.send(START_MESSAGE, true).catch(() => null);
    return true;
  }
  if (isHelpCommand(messageText)) {
    await channel.send(HELP_MESSAGE, true).catch(() => null);
    return true;
  }
  if (isEndCommand(messageText)) {
    if (getHistory(userId).length > 0) {
      await endSession(userId, "satisfied", { lang });
    } else {
      await resetSession(userId);
      await channel.send("Chat reset. Ask me anything about CPF whenever you're ready.").catch(() => null);
    }
    return true;
  }
  const voiceToggle = parseVoiceToggle(messageText);
  if (voiceToggle !== null) {
    const enabling = voiceToggle === "on";
    await upsertUserPrefs({ ...prefs, voice_enabled: enabling }).catch(() => null);
    const confirm = enabling
      ? "Voice replies enabled. I'll send a voice note along with every text response. Type *voice off* to disable."
      : "Voice replies disabled. I'll reply with text only. Type *voice on* to re-enable.";
    await channel.send(confirm).catch(() => null);
    return true;
  }
  // "/dialect cantonese" → save zh-can; "/dialect off" → clear. Chinese dialect voice
  // replies use zh-HK-HiuMaanNeural (Cantonese) as the closest Edge TTS voice.
  const dialectCmd = parseDialectCommand(messageText);
  if (dialectCmd !== null) {
    const newDialect = dialectCmd.code;
    await upsertUserPrefs({ ...prefs, preferred_dialect: newDialect ?? undefined }).catch(() => null);
    const confirm = newDialect
      ? `Dialect set to ${DIALECT_LABELS[newDialect] ?? newDialect}. Voice replies will use the matching voice. Type /dialect off to reset.`
      : "Dialect preference cleared. Voice replies will use the standard voice for your language.";
    await channel.send(confirm).catch(() => null);
    return true;
  }
  return false;
}

/**
 * State-driven intercepts that short-circuit the normal query pipeline: an awaiting
 * CSAT rating, an officer-offer confirmation, an active officer relay, a mid-flow
 * guiding-questions answer, and a satisfied closing sign-off. Returns whether the
 * message was handled (the caller then returns) plus the possibly-updated prefs — the
 * stale officer-offer clear mutates them and falls through to the normal query path.
 */
async function runStateIntercepts(
  channel: InboundChannel,
  userId: string,
  prefs: UserPrefs,
  lang: Lang,
  messageText: string,
): Promise<{ handled: boolean; prefs: UserPrefs }> {
  // CSAT rating intercept — a bare 1–5 while awaiting_rating is the rating; anything
  // else closes the rating window (rating skipped) and falls through as a new query.
  const ratingSession = getActiveSession(userId);
  if (ratingSession?.status === "awaiting_rating") {
    const m = messageText.trim().match(/^([1-5])$/);
    if (m) {
      const result = await recordRating(userId, ratingSession.sessionId, Number(m[1]));
      if (result.ok && result.thankYou) await channel.send(result.thankYou).catch(() => null);
      return { handled: true, prefs };
    }
    await resetSession(userId);
    touchSession(userId, channel.prefix); // begin a fresh session for this message
    // fall through — handle messageText as a normal new query
  }

  // Officer confirmation — reuse the rich button path (full history + emotion + AI summary).
  if (prefs.pendingOfficerOffer && isOfficerConfirmation(messageText)) {
    await upsertUserPrefs({ ...prefs, pendingOfficerOffer: false }).catch(() => null);
    await escalateUser(channel, userId);
    return { handled: true, prefs };
  }

  // Clear a stale officer-offer flag when the user sends a normal new question (falls through).
  if (prefs.pendingOfficerOffer && !isOfficerConfirmation(messageText)) {
    await upsertUserPrefs({ ...prefs, pendingOfficerOffer: false }).catch(() => null);
    prefs = { ...prefs, pendingOfficerOffer: false };
  }

  // Active queue relay — an escalated user's message goes straight to the officer dashboard.
  const queue = await getQueue().catch(() => null);
  const activeEntry = queue?.find(
    (e) => e.userId === userId && (e.status === "waiting" || e.status === "assigned"),
  );
  if (activeEntry) {
    await relayToOfficer(activeEntry.queueId, userId, messageText, lang);
    return { handled: true, prefs };
  }

  // Reading-support opt-in/opt-out + a pending "want simpler replies?" offer. Skipped while
  // mid-guiding, where a bare "simple"/"full" is a legitimate answer to a guiding question;
  // relay is handled above, so an escalated citizen's words still reach the officer.
  if (!prefs.pendingGuiding) {
    // Explicit opt-in — applied immediately (no offer needed), with an easy revert.
    if (isSupportOptIn(messageText)) {
      await upsertUserPrefs({ ...prefs, support_tier: "guided", pendingSupportOffer: false, supportOfferDeclined: false, slowReplyStreak: 0 }).catch(() => null);
      await sendSupportAck(channel, "on", lang);
      return { handled: true, prefs };
    }
    // Explicit opt-out — back to full detail.
    if (isSupportOptOut(messageText)) {
      await upsertUserPrefs({ ...prefs, support_tier: "self_service", pendingSupportOffer: false }).catch(() => null);
      await sendSupportAck(channel, "off", lang);
      return { handled: true, prefs };
    }
    // Reply to a pending offer: "yes"/"simple" accepts; "no" declines (and suppresses
    // re-offering); anything else just clears the offer and is answered as a new query.
    if (prefs.pendingSupportOffer) {
      if (isSupportConfirmation(messageText)) {
        await upsertUserPrefs({ ...prefs, support_tier: raiseTier((prefs.support_tier as VulnerabilityTier) ?? "self_service", "guided"), pendingSupportOffer: false, supportOfferDeclined: false, slowReplyStreak: 0 }).catch(() => null);
        await sendSupportAck(channel, "on", lang);
        return { handled: true, prefs };
      }
      const declined = isSupportDecline(messageText);
      await upsertUserPrefs({ ...prefs, pendingSupportOffer: false, supportOfferDeclined: declined || prefs.supportOfferDeclined }).catch(() => null);
      prefs = { ...prefs, pendingSupportOffer: false, supportOfferDeclined: declined || prefs.supportOfferDeclined };
      if (declined) return { handled: true, prefs }; // explicit "no" — acknowledge by simply not switching
      // otherwise fall through and answer the message normally
    }
  }

  // Guiding-questions answer intercept — escapes: explicit officer request escalates;
  // an explicit cancel exits; everything else is recorded as the current answer.
  if (prefs.pendingGuiding) {
    if (isExplicitOfficerRequest(messageText)) {
      await upsertUserPrefs({ ...prefs, pendingGuiding: undefined, pendingOfficerOffer: false }).catch(() => null);
      await escalateUser(channel, userId);
      return { handled: true, prefs };
    }
    if (GUIDING_CANCEL.test(messageText.trim())) {
      await upsertUserPrefs({ ...prefs, pendingGuiding: undefined }).catch(() => null);
      let m = "Okay, cancelled. Ask me anything about CPF whenever you're ready.";
      if (lang !== "en") {
        const t = await translateText(m, "en", lang).catch(() => null);
        if (t) m = t.translated_text;
      }
      await channel.send(m).catch(() => null);
      return { handled: true, prefs };
    }
    await recordGuidingAnswer(channel, userId, messageText);
    return { handled: true, prefs };
  }

  // Satisfied sign-off ("thanks", "bye") after a real exchange → end session + request rating.
  if (isClosingMessage(messageText) && getHistory(userId).length > 0) {
    log.info({ userId }, "Closing intent detected — ending session, requesting rating");
    await endSession(userId, "satisfied", { lang });
    return { handled: true, prefs };
  }

  return { handled: false, prefs };
}

/**
 * Final delivery stage: build the reply from the query result, append history, run the
 * escalation analysis (+ >70 distress override), send the reply (editing the thinking
 * bubble), and synthesize/send a TTS audio reply when voice is wanted. Terminal — the
 * turn state is finalized by the time this runs, so it's passed in as one context object.
 */
async function deliverAnswer(ctx: {
  channel: InboundChannel;
  userId: string;
  prefs: UserPrefs;
  lang: Lang;
  messageText: string;
  triage: ReturnType<typeof classifyQuery>;
  queryResult: Awaited<ReturnType<typeof runQueryAgent>>;
  voiceInput: boolean;
  thinking: Awaited<ReturnType<typeof startThinking>>;
  emotionPromise: Promise<ScoredEmotion>;
  showLangHint?: boolean;
}): Promise<void> {
  const { channel, userId, prefs, lang, messageText, triage, queryResult, voiceInput, thinking, emotionPromise, showLangHint } = ctx;

  let reply = queryResult.content || "I wasn't able to find an answer for that. Would you like me to connect you to a CPF officer?";
  if (showLangHint) {
    reply += "\n\n_(Not sure about the language? Just reply in any language and I'll adapt.)_";
  }

  // No translation here — the query agent already generates in the user's language
  // (native generation). Translating again would double-translate the native reply.

  // Intercept **generate_tts**(...) emitted by the LLM — strip it from display text and
  // capture what the LLM wanted to speak aloud. Keep the plain text for chat_history.
  const { cleanReply, ttsText: llmTtsText } = interceptTtsCall(reply);
  reply = cleanReply;
  const plainBotReply = reply;
  reply = formatReply(reply, "html"); // strip markdown, bold CPF terms with HTML tags

  // Emotion was scored + pushed to the ring buffer by the .then() at kickoff; await it here.
  const scored = await emotionPromise;

  // Append user + bot turns to rolling history (the full chat_history at escalation time).
  // The user turn carries this message's sentiment score for the officer dashboard timeline.
  appendHistory(
    userId,
    { role: "user", content: messageText, ts: new Date().toISOString(), emotion_score: scored.emotion_score, emotion_label: scored.emotion_label },
    { role: "agent", content: plainBotReply, ts: new Date().toISOString() },
  );

  // A normal answer means the last turn wasn't an unclear voice note — clear the flag.
  if (prefs.pendingVoiceUnclear) await upsertUserPrefs({ userId, pendingVoiceUnclear: false }).catch(() => null);

  // Escalation: 5-layer analyzer (triage fallback). High distress (>70) auto-offers the
  // officer button regardless of keyword layers — the user is clearly struggling.
  let escalation = analyzeEscalation(messageText, reply, queryResult.confidence, triage);
  if (!escalation.shouldEscalate && scored.emotion_score > 70) {
    escalation = {
      shouldEscalate: true,
      reason: "explicit_request",
      offerText: "I can hear this is stressful. A CPF officer can help you directly — tap below to connect.",
    };
  }
  // Store pendingOfficerOffer so a typed "Officer" reply also works.
  if (escalation.shouldEscalate) {
    await upsertUserPrefs({ ...prefs, pendingOfficerOffer: true }).catch(() => null);
    log.info({ userId, reason: escalation.reason }, "Escalation offered to user");
  }

  // Stop the thinking animation and edit that bubble into the final reply.
  await thinking.stop();
  await sendReply(channel, reply, escalation, lang, thinking.messageId)
    .catch((err: unknown) => log.error(err, "Failed to send reply"));

  // TTS: fire when voice input, voice_enabled pref, OR the LLM explicitly called generate_tts.
  const wantsVoice = voiceInput || prefs.voice_enabled === true || llmTtsText !== null;
  if (wantsVoice && channel.sendVoice) {
    log.info({ userId, lang, trigger: voiceInput ? "voice-input" : llmTtsText ? "llm-tts-call" : "pref" }, "Generating TTS audio reply");
    // Prefer the text the LLM extracted for TTS; fall back to the full plain reply.
    const speakText = llmTtsText
      ? stripMarkdownForTTS(llmTtsText)
      : stripMarkdownForTTS(formatReply(cleanReply, "plain"));
    const dialectCode = prefs.preferred_dialect;
    // Speech rate follows the reading-support tier (self_service 1.0, guided 0.85,
    // high_touch 0.7) so a citizen who asked for simpler replies also hears them slower.
    const speechRate = getSpeechRate((prefs.support_tier as VulnerabilityTier) ?? "self_service");
    const tts = await synthesizeSpeech(speakText, lang, speechRate, dialectCode).catch((err: unknown) => {
      log.error(err, "TTS synthesis failed — text reply already sent");
      return null;
    });
    if (tts?.audioBase64) {
      await channel.sendVoice(tts.audioBase64, tts.mimeType).catch((err: unknown) =>
        log.error(err, "Failed to send audio reply"),
      );
      log.info({ userId }, "Audio reply sent");
    } else {
      log.warn({ userId, lang }, "TTS returned no audio — user received text reply only");
    }
  }

  // ── Reading-support: record this reply for the reading-rate proxy, and offer simpler
  // replies if the citizen signalled they need them. The offer is opt-in (they reply
  // "simple"/"yes") and only fires when: not already adapted, not previously declined,
  // and we're NOT also escalating (an officer handoff shouldn't be muddled with an offer).
  const replyWords = plainBotReply.trim().split(/\s+/).filter(Boolean).length;
  const alreadyAdapted = ((prefs.support_tier as VulnerabilityTier) ?? "self_service") !== "self_service";
  const repair = detectRepairSignal(messageText);
  const slowStreak = (prefs.slowReplyStreak ?? 0) >= SLOW_STREAK_TO_OFFER;
  const shouldOffer =
    !escalation.shouldEscalate && !alreadyAdapted && !prefs.supportOfferDeclined &&
    !prefs.pendingSupportOffer && (repair || slowStreak);

  await upsertUserPrefs({
    userId,
    lastReplyMeta: { words: replyWords, ts: new Date().toISOString() },
    ...(shouldOffer ? { pendingSupportOffer: true, slowReplyStreak: 0 } : {}),
  }).catch(() => null);

  if (shouldOffer) {
    let offer = "Would you like me to keep replies shorter and simpler? Reply *simple* and I will — or *no* to keep the full detail.";
    if (lang !== "en") {
      const t = await translateText(offer, "en", lang).catch(() => null);
      if (t) offer = t.translated_text;
    }
    await channel.send(offer).catch(() => null);
    log.info({ userId, trigger: repair ? "repair-signal" : "slow-reading" }, "Offered simpler replies");
  }
}

export async function processInbound(channel: InboundChannel, msg: InboundMessage): Promise<void> {
  const userId = `${channel.prefix}:${msg.userKey}`;
  const sessionId = `${userId}:${Date.now()}`;

  // Fetch or create prefs early — needed to know preferred_lang before STT
  let prefs = await getUserPrefs(userId).catch(() => null);
  if (!prefs) {
    prefs = { userId, preferred_lang: "en", voice_enabled: false, speech_rate: 1.0, accessibility_mode: "standard" };
    await upsertUserPrefs(prefs).catch(() => null);
  }
  let lang = (prefs.preferred_lang || "en") as Lang;

  // ── STT: voice input → normalised text ──────────────────────────────────────
  // Voice goes through the transcriber subagent (Whisper STT + slang normalisation).
  // Text goes through the same subagent in text mode (slang normalisation only).
  let messageText = (msg.text ?? "").trim();
  let voiceInput = false;

  if (!messageText && msg.audioBase64) {
    voiceInput = true;
    log.info({ userId }, "Voice input — running STT via transcriber subagent");
    try {
      const sttResult = await runTranscriberSubagent(
        { mode: "voice", audioBase64: msg.audioBase64, mimeType: msg.mimeType ?? "audio/ogg" },
        { language: lang },
      );
      messageText = sttResult.normalizedText.trim() || sttResult.text.trim();
      log.info({ userId, messageText, confidence: sttResult.confidence }, "STT complete");
      if (sttResult.detectedDialect && sttResult.detectedDialect !== prefs.preferred_dialect) {
        prefs = { ...prefs, preferred_dialect: sttResult.detectedDialect };
        await upsertUserPrefs(prefs).catch(() => null);
        log.info({ userId, dialect: sttResult.detectedDialect }, "Dialect auto-detected from voice — pref updated");
      }
    } catch (err) {
      log.error(err, "STT failed");
      await sendUnclearVoiceReply(channel, userId, lang, prefs);
      return;
    }
    // Whisper's transcript is trusted — the ONLY reject is gibberish: an empty or
    // single-character transcript, or a deterministic Whisper silence-artefact
    // (stock caption / one fragment stuttered over and over). Everything else is
    // answered, whatever the language, length or duration.
    if (!messageText || messageText.length < 2 || looksLikeSttHallucination(messageText)) {
      log.info({ userId, messageText, durationSec: msg.durationSec }, "Voice transcript is gibberish — sending error + officer option");
      await sendUnclearVoiceReply(channel, userId, lang, prefs);
      return;
    }
  }

  if (!messageText) return;

  log.info({ userId, channel: channel.prefix, voiceInput }, "Inbound message");

  // Mark activity — starts a session on first contact, refreshes the 24h idle timer
  // thereafter. (An awaiting_rating session is left as-is; the rating intercept below
  // owns that transition.)
  touchSession(userId, channel.prefix);

  // ── Commands: /start, /help, /end, voice on|off, /dialect — each handles + returns ──
  if (await handleCommand(channel, userId, prefs, lang, messageText)) return;

  // ── State intercepts: CSAT rating, officer confirmation, active relay, guiding-flow
  // answer, satisfied sign-off — each short-circuits the query pipeline. The stale
  // officer-offer clear updates prefs and falls through, so thread prefs back out.
  const intercept = await runStateIntercepts(channel, userId, prefs, lang, messageText);
  prefs = intercept.prefs;
  if (intercept.handled) return;

  // ── Reading-rate proxy ───────────────────────────────────────────────────────
  // How long did the citizen take after our last reply before sending this one? A
  // sustained low implied rate (words shown ÷ seconds) is a soft signal they may benefit
  // from simpler, slower replies — used only to OFFER later (never to force), and only
  // once already-answered messages establish a streak. Skipped once at high_touch (max).
  if (prefs.lastReplyMeta && prefs.support_tier !== "high_touch") {
    const secs = (Date.now() - new Date(prefs.lastReplyMeta.ts).getTime()) / 1000;
    const wpm = impliedReadingWpm(prefs.lastReplyMeta.words, secs);
    let streak = prefs.slowReplyStreak ?? 0;
    if (wpm !== null) streak = wpm <= READING_RATE_FLOOR_WPM ? streak + 1 : 0;
    if (streak !== (prefs.slowReplyStreak ?? 0)) {
      prefs = { ...prefs, slowReplyStreak: streak };
      await upsertUserPrefs({ userId, slowReplyStreak: streak }).catch(() => null);
    }
  }

  // ── Emotion detection kicked off early — runs parallel with LLM pipeline ────
  // Emotion only needs the raw message text; starting it here means it runs
  // concurrently with language detection + LLM so it adds ~0ms to response time.
  // Emotion resolves in ~4s; push to ring buffer immediately so button presses
  // that arrive while the LLM is still running (can take 30–90s) see real emotion.
  const emotionPromise = Promise.all([
    detectEmotion(messageText).catch(() => ({ label: "neutral" as const, score: 0.1 })),
    voiceInput && msg.audioBase64
      ? detectAudioEmotion(msg.audioBase64, msg.mimeType ?? "audio/ogg").catch(() => null)
      : Promise.resolve(null),
  ]).then(([textEmotion, audioEmotion]) => {
    const scored = scoreEmotion(textEmotion, audioEmotion);
    const emotionPayload = {
      userId,
      channel: channel.prefix,
      emotion_label: scored.emotion_label,
      emotion_score: scored.emotion_score,
      message_preview: messageText.slice(0, 80),
      ts: new Date().toISOString(),
    };
    broadcast("emotion_update", emotionPayload);
    pushEmotionEvent(emotionPayload);
    log.info({ userId, emotion_label: scored.emotion_label, emotion_score: scored.emotion_score }, "Emotion scored");
    // Retroactively patch any active queue entry created before emotion resolved
    updateQueueEmotion(userId, scored, messageText.slice(0, 80))
      .then((queueId) => { if (queueId) broadcast("queue_updated", { queueId, userId }); })
      .catch(() => null);
    return scored;
  });

  // ── Normalise text + query ───────────────────────────────────────────────────
  // Text inputs still run through the transcriber in text mode for slang normalisation.
  // Show a "thinking" dot animation while the (often slow) LLM pipeline runs, so the
  // citizen knows the assistant is composing a reply. The same bubble is later edited
  // into the answer. Best-effort — never blocks or breaks the reply.
  const thinking = await startThinking(channel);
  let queryResult;
  let triage = classifyQuery(messageText); // preliminary pass; refined after normalisation below
  let langConfident = true; // updated inside the try block; true = HF succeeded, false = LLM fallback
  try {
    let queryText = messageText;
    if (!voiceInput) {
      const normalised = await runTranscriberSubagent(
        { mode: "text", text: messageText },
        { language: lang },
      );
      queryText = normalised.normalizedText || messageText;
      if (normalised.detectedDialect && normalised.detectedDialect !== prefs.preferred_dialect) {
        prefs = { ...prefs, preferred_dialect: normalised.detectedDialect };
        await upsertUserPrefs(prefs).catch(() => null);
        log.info({ userId, dialect: normalised.detectedDialect }, "Dialect auto-detected from text — pref updated");
      }
    }

    // Language detection runs in parallel with emotionPromise (both are async API calls).
    // Previously detectLanguage was awaited sequentially, adding ~1–2s before the LLM.
    const detectLangPromise: Promise<{ lang: string; confident: boolean } | null> = queryText.length >= 8
      ? detectLanguage(queryText).catch(() => null)
      : Promise.resolve(null);

    // Re-classify on normalised text (slang may have changed keyword signals).
    triage = classifyQuery(queryText);
    log.info({ userId, triageCategory: triage.category, triageReason: triage.reason }, "Triage classification");

    // ── Guiding-questions entry ────────────────────────────────────────────────
    // Broad (Cat-2) questions on a topic with a curated guiding set start the
    // interactive slot-filling flow instead of a one-shot answer. Resolve lang +
    // emotion together (both in-flight); high distress (>70) skips guiding so the
    // normal flow can escalate the struggling user.
    if (triage.category === 2 && !isExplicitOfficerRequest(queryText)) {
      const guiding = await findGuidingSetForQuery(queryText).catch(() => null);
      if (guiding) {
        const [detectedResult, scored] = await Promise.all([detectLangPromise, emotionPromise]);
        const turnLang = resolveTurnLang(lang, detectedResult, queryText);
        if (turnLang !== lang) {
          lang = turnLang;
          prefs = { ...prefs, preferred_lang: lang };
          await upsertUserPrefs(prefs).catch(() => null);
          log.info({ userId, detectedLang: lang }, "Language auto-detected — switching response language");
        }
        if (scored.emotion_score <= 70) {
          const { set, knowledge } = guiding;
          await upsertUserPrefs({
            ...prefs,
            pendingGuiding: {
              topicKey: set.topicKey,
              title: set.title,
              questions: set.questions,
              answers: [],
              index: 0,
              originalQuery: queryText,
              knowledge,
              synthesisHint: set.synthesisHint,
              lang,
            },
          }).catch(() => null);
          log.info({ userId, topicKey: set.topicKey, questions: set.questions.length }, "Entering guiding-questions flow");

          await thinking.stop();
          const firstQ = set.questions[0];
          if (firstQ) {
            await sendGuidingQuestion(channel, firstQ, lang, thinking.messageId);
          } else if (thinking.messageId) {
            await channel.deleteMessage?.(thinking.messageId).catch(() => null);
          }
          return;
        }
      }
    }

    // Resolve language + emotion together — both have been running since early in
    // the handler; awaiting here adds near-zero latency for either.
    const [detectedResult, turnEmotion] = await Promise.all([detectLangPromise, emotionPromise]);
    langConfident = detectedResult?.confident ?? true;
    const turnLang = resolveTurnLang(lang, detectedResult, queryText);
    if (turnLang !== lang) {
      lang = turnLang;
      prefs = { ...prefs, preferred_lang: lang };
      await upsertUserPrefs(prefs).catch(() => null);
      log.info({ userId, detectedLang: lang }, "Language auto-detected — switching response language");
    }

    // Trajectory layer: fold this turn together with the recent emotional trajectory
    // of the conversation into one "effective emotion" — if the caller has been
    // getting angrier, soothing is escalated (trajectory only ever RAISES warmth,
    // never lowers it below the current message). Feed ONLY scored user turns:
    // the guided-questions path stores unscored user turns, which must not be
    // averaged in as undefined. The current turn isn't in history yet (it's
    // appended after this call), so passing prior scores + the current one is correct.
    const priorScores = getHistory(userId)
      .filter((t) => t.role === "user" && typeof t.emotion_score === "number")
      .map((t) => t.emotion_score as number)
      .slice(-4);
    const eff = effectiveEmotion(
      { emotion_score: turnEmotion.emotion_score, emotion_label: turnEmotion.emotion_label },
      priorScores,
    );

    // Reading-support tier drives the reply's reading level (shorter/simpler for
    // guided/high_touch). Sourced from the citizen's persisted pref — set via explicit
    // opt-in or an accepted offer — instead of the old hardcoded "self_service", which
    // meant no messaging-channel citizen ever received the accessibility adaptation.
    const supportTier = (prefs.support_tier as VulnerabilityTier) ?? "self_service";
    queryResult = await runQueryAgent(
      [{ role: "user", content: queryText, timestamp: new Date().toISOString() }],
      {
        userId, tenantId: "cpf", vulnerabilityTier: supportTier, language: lang, triage,
        emotion: { score: eff.emotion_score, label: eff.emotion_label, sustained: eff.sustained },
      },
    );
  } catch (err) {
    log.error(err, "Query pipeline failed");
    await thinking.stop();
    await sendReply(channel, "I'm having trouble processing your request right now.", { shouldEscalate: true, offerText: "A CPF officer can assist you directly. Tap below to connect." }, lang, thinking.messageId)
      .catch(() => null);
    return;
  }

  // Soft language hint on the first turn when detection fell back to the LLM (lower
  // confidence). Appended as a parenthetical so the user knows they can switch languages.
  const showLangHint = !langConfident && getHistory(userId).length === 0 && lang !== "en";

  // ── Deliver: build reply, append history, escalation analysis, send + TTS ────
  await deliverAnswer({
    channel, userId, prefs, lang, messageText, triage, queryResult, voiceInput, thinking, emotionPromise, showLangHint,
  });
}

async function relayToOfficer(
  queueId: string,
  userId: string,
  messageText: string,
  userLang: string,
): Promise<void> {
  // Detect the language of THIS message rather than trusting the stored pref — the
  // pref can be stale/wrong (e.g. the web widget escalated with its EN default while
  // the citizen writes Chinese), which used to put untranslated text on the officer
  // dashboard AND left officer replies untranslated. A confident detection also
  // re-syncs the pref and the live case so the officer→citizen direction heals too.
  const detected = await detectLanguage(messageText).catch(() => null);
  if (detected?.confident && detected.lang !== userLang) {
    log.info({ userId, prefLang: userLang, detectedLang: detected.lang }, "Relay message language differs from pref — re-syncing case language");
    userLang = detected.lang;
    await upsertUserPrefs({ userId, preferred_lang: userLang }).catch(() => null);
    await updateQueueLang(queueId, userLang).catch(() => null);
  }

  let englishText = messageText;
  if (userLang !== "en") {
    const t = await translateText(messageText, userLang, "en").catch(() => null);
    if (t) englishText = t.translated_text;
  }

  // Score the sentiment of this relayed message so the officer sees the live emotional
  // trajectory while handling the case — not just the score captured at escalation time.
  const emo = await detectEmotion(messageText).catch(() => ({ label: "neutral" as const, score: 0.1 }));
  const scored = scoreEmotion(emo, null);

  const ts = new Date().toISOString();
  broadcast("user_message", {
    queueId, userId,
    message: englishText,
    original_message: messageText,
    original_lang: userLang,
    emotion_score: scored.emotion_score,
    emotion_label: scored.emotion_label,
    ts,
  });

  // Push the live emotion event to the dashboard ring buffer and patch the queue entry's
  // top-level emotion so the card reflects how the citizen feels right now.
  const emotionPayload = {
    userId,
    channel: userId.startsWith("tg:") ? "tg" : userId.startsWith("web:") ? "web" : "wa",
    emotion_label: scored.emotion_label,
    emotion_score: scored.emotion_score,
    message_preview: messageText.slice(0, 80),
    ts,
  };
  broadcast("emotion_update", emotionPayload);
  pushEmotionEvent(emotionPayload);
  updateQueueEmotion(userId, scored, messageText.slice(0, 80))
    .then((qid) => { if (qid) broadcast("queue_updated", { queueId: qid, userId }); })
    .catch(() => null);

  appendToQueueHistory(queueId, {
    role: "user",
    content: englishText,
    ts,
    emotion_score: scored.emotion_score,
    emotion_label: scored.emotion_label,
    // Keep the citizen's original words when we auto-translated, so the officer can flip the
    // bubble back to the original (the dashboard shows English by default, "Show original" to toggle).
    ...(userLang !== "en" && englishText !== messageText
      ? { original: messageText, original_lang: userLang }
      : {}),
  }).catch(() => null);
}

export async function escalateUser(
  channel: InboundChannel,
  userId: string,
  // Web channel holds its conversation in the browser, not the backend's per-user ring buffer.
  // When provided, this is used as the case chat_history/summary source instead of getHistory().
  seedHistory?: Array<{ role: string; content: string; ts?: string }>,
): Promise<void> {
  // Prevent duplicate queue entries — if user already has an active case, just confirm
  const existing = await getQueue().catch(() => null);
  const alreadyQueued = existing?.find(
    (e) => e.userId === userId && (e.status === "waiting" || e.status === "assigned"),
  );
  if (alreadyQueued) {
    await channel.send("✅ You're already in the queue. A CPF officer will be with you shortly.").catch(() => null);
    return;
  }

  const sessionId = `${userId}:${Date.now()}`;
  const prefs = await getUserPrefs(userId).catch(() => null);
  const lang = (prefs?.preferred_lang ?? "en") as Lang;

  // Use the most recent emotion from this conversation if available
  const latestEmotion = getLatestEmotionForUser(userId);
  const emotion: ScoredEmotion | null = latestEmotion
    ? { emotion_score: latestEmotion.emotion_score, emotion_label: latestEmotion.emotion_label as ScoredEmotion["emotion_label"] }
    : null;

  const summary = latestEmotion
    ? `"${latestEmotion.message_preview}" — emotion: ${latestEmotion.emotion_label} (${latestEmotion.emotion_score})`
    : "User requested CPF officer via button";

  // If they're escalating straight after an unclear voice note, the chat history is empty —
  // give the officer a meaningful summary instead of the generic button text.
  const presetSummary = prefs?.pendingVoiceUnclear
    ? "Unclear voice recording — the citizen's audio could not be understood; they need assistance."
    : undefined;

  await upsertUserPrefs({ ...(prefs ?? { userId, preferred_lang: "en", voice_enabled: false, speech_rate: 1.0, accessibility_mode: "standard" }), pendingOfficerOffer: false, pendingVoiceUnclear: false }).catch(() => null);
  const chatHistory = seedHistory && seedHistory.length
    ? seedHistory
        .filter((m) => m?.content?.trim())
        .map((m) => ({ role: m.role === "user" ? "user" : "agent", content: m.content, ts: m.ts ?? new Date().toISOString() }))
    : getHistory(userId);
  clearHistory(userId);
  await doEscalate(channel, userId, sessionId, summary, "", lang, emotion, chatHistory, presetSummary);
}

// Generate a single-sentence "User wants to…" summary of the conversation for the
// officer dashboard's opener. Falls back to the citizen's last message if the LLM
// is unavailable, so escalation never blocks on the summary.
const OFFICER_SUMMARY_PROMPT =
  'You are a silent summariser. Read the conversation and output ONE concise sentence (max 30 words) describing what the CPF member needs help with, written for a customer service officer. Begin with "User wants" or "User is". Do NOT answer the member, do NOT greet, do NOT give advice, do NOT add links or emotion labels — output only the summary sentence.';

// A message that's essentially just "connect me to an officer" — not a real query. Used so a
// provisional/fallback summary never surfaces a bare trigger word like "officer please".
function isBareTriggerPhrase(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[^\w\s]/g, "").trim();
  if (!t) return true;
  if (OFFICER_AFFIRMATIONS.has(t)) return true;
  const words = t.split(/\s+/);
  return words.length <= 3 && /\b(officer|human|agent|staff|connect|speak|talk|representative|person)\b/.test(t);
}

// Best NON-LLM summary to post immediately: the most recent substantive user message (skipping
// bare escalation triggers), else a clean default. Guarantees the card never reads "officer please".
function pickProvisionalSummary(
  chatHistory: Array<{ role: string; content: string }> | undefined,
  fallback?: string,
): string {
  const substantive = [...(chatHistory ?? [])]
    .reverse()
    .find((m) => m.role === "user" && m.content?.trim() && !isBareTriggerPhrase(m.content));
  const pick = substantive?.content?.trim()
    || (fallback && !isBareTriggerPhrase(fallback) ? fallback.trim() : "")
    || "User requested a CPF officer.";
  return pick.slice(0, 200);
}

async function summariseQueryForOfficer(
  chatHistory: Array<{ role: string; content: string }> | undefined,
  fallback: string,
  timeoutMs = 8000,
): Promise<string> {
  const fb = pickProvisionalSummary(chatHistory, fallback);
  const convo = (chatHistory ?? [])
    .filter((m) => m.content && m.content.trim())
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n")
    .slice(0, 2000);
  if (!convo.trim()) return fb;
  let to: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<string>((_, reject) => { to = setTimeout(() => reject(new Error("summary timeout")), timeoutMs); });
    // thinking:disabled makes glm-5-turbo answer in ~1-2s (no reasoning tokens) so the summary
    // is ready up front; includeSoul=false so it summarises instead of answering as PULSE.
    const out = await Promise.race([callHermes(OFFICER_SUMMARY_PROMPT, convo, [], 200, false, { thinking: { type: "disabled" } }), timeout]);
    return (out || "").trim() || fb;
  } catch (err) {
    log.warn({ err: String(err) }, "summariseQueryForOfficer failed — using fallback");
    return fb;
  } finally {
    clearTimeout(to);
  }
}

async function doEscalate(
  channel: InboundChannel,
  userId: string,
  sessionId: string,
  userMessage: string,
  botSummary: string,
  preferredLang: string,
  emotion: ScoredEmotion | null,
  chatHistory?: Array<{ role: string; content: string; ts: string; emotion_score?: number; emotion_label?: string }>,
  presetQuerySummary?: string,
): Promise<void> {
  // Post the case immediately with a NON-LLM provisional summary, so escalation never blocks on
  // a slow model (the old inline 8s race is what surfaced "officer please" on a timeout). A
  // preset (e.g. unclear voice) is authoritative. The real AI summary is upgraded in the
  // background below and patched onto the dashboard live.
  const provisionalSummary = presetQuerySummary?.trim()
    || pickProvisionalSummary(chatHistory, botSummary || userMessage);

  // Pull the citizen's real channel name (captured on inbound) so the officer dashboard
  // shows it in place of a hardcoded placeholder. Optional — undefined → UI derives a label.
  const displayName = (await getUserPrefs(userId).catch(() => null))?.display_name;

  const entry = await postToQueue({
    sessionId, userId,
    display_name: displayName,
    emotion_score: emotion?.emotion_score ?? 50,
    emotion_label: emotion?.emotion_label ?? "neutral",
    summary: botSummary || userMessage,
    query_summary: provisionalSummary,
    chat_history: chatHistory?.length
      ? chatHistory
      : [{ role: "user", content: userMessage, ts: new Date().toISOString() }],
    preferred_lang: preferredLang,
    dialect_hint: null,
  }).catch((e: unknown) => { log.error({ userId, err: String(e) }, "postToQueue failed"); return null; });

  if (entry) {
    // Enrich the initial priority score with financial urgency + sustained emotion signals.
    // Both are derived from data already in memory — no extra API calls.
    const allUserText = [
      ...(chatHistory ?? []).filter((m) => m.role === "user").map((m) => m.content),
      userMessage,
    ].join(" ");
    const financialFlag = hasFinancialUrgency(allUserText);
    const priorScores = (chatHistory ?? [])
      .filter((m) => m.role === "user" && typeof m.emotion_score === "number")
      .map((m) => m.emotion_score as number);
    const eff = effectiveEmotion(
      { emotion_score: emotion?.emotion_score ?? 0, emotion_label: emotion?.emotion_label ?? "neutral" },
      priorScores,
    );
    const enrichedScore = computePriorityScore(emotion?.emotion_score ?? 50, 0, {
      financialFlag,
      sustained: eff.sustained,
    });
    if (enrichedScore !== entry.priority_score) {
      await updateQueuePriority(entry.queueId, enrichedScore).catch(() => null);
    }

    notifyNewQueueEntry(entry.queueId, entry.emotion_label, enrichedScore);
    log.info({ queueId: entry.queueId, userId, querySummary: provisionalSummary, financialFlag, sustained: eff.sustained, priorityScore: enrichedScore }, "User escalated to CCU queue");

    // Background summary upgrade — only when there's a real conversation to summarise and no
    // preset. Generous 25s budget (vs the old blocking 8s) since nothing waits on it; on success
    // patch + live-refresh the dashboard. Fire-and-forget: a slow/failed model just leaves the
    // provisional summary in place, so the worst case is a plain (not broken) summary.
    const hasConversation = (chatHistory ?? []).some((m) => m.role === "user" && m.content?.trim());
    if (!presetQuerySummary?.trim() && hasConversation) {
      void (async () => {
        const ai = (await summariseQueryForOfficer(chatHistory, provisionalSummary, 25000)).trim();
        if (ai && ai !== provisionalSummary) {
          await setQueueQuerySummary(entry.queueId, ai);
          notifyQueueUpdated(entry.queueId, enrichedScore);
          log.info({ queueId: entry.queueId, querySummary: ai }, "Officer summary upgraded (background)");
        }
      })().catch((err: unknown) => log.warn({ err: String(err), queueId: entry.queueId }, "background summary upgrade failed"));
    }
  } else {
    log.error({ userId }, "doEscalate — queue entry was not created");
  }

  let msg = "✅ You're now connected to a CCU officer. Please go ahead and type your message — the officer will reply to you right here in this chat.";
  if (preferredLang !== "en") {
    const t = await translateText(msg, "en", preferredLang).catch(() => null);
    if (t) msg = t.translated_text;
  }

  const confirmErr = await channel.send(msg).catch((e: unknown) => e);
  if (confirmErr instanceof Error) {
    log.error({ userId, err: confirmErr.message }, "doEscalate — failed to send confirmation message");
  }
}
