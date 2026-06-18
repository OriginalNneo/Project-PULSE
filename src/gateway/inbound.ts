import type { Language } from "../shared/types/index.js";
import { runTranscriberSubagent } from "../agents/transcriber/agent.js";
import { runQueryAgent } from "../agents/query/agent.js";
import { getUserPrefs, upsertUserPrefs, postToQueue, getQueue, updateQueueEmotion } from "../db/proxy-client.js";
import { translateText, synthesizeSpeech, detectLanguage, detectEmotion, detectAudioEmotion } from "../python-bridge/client.js";
import { scoreEmotion, type ScoredEmotion } from "../agents/main/emotion.js";
import { notifyNewQueueEntry } from "../dashboard/notify.js";
import { formatReply, containsHtml } from "../shared/formatter.js";
import { analyzeEscalation } from "../agents/escalation/analyzer.js";
import { classifyQuery } from "../agents/triage/classifier.js";
import { broadcast } from "./ws.js";
import { pushEmotionEvent, getLatestEmotionForUser } from "./dashboard.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("inbound");

type Lang = Language;

// Languages we can translate into AND synthesize speech for.
const SUPPORTED_LANGS = new Set<Lang>(["en", "zh", "ms", "ta", "hi", "ml", "pa"]);

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
}

export interface InboundMessage {
  userKey: string;
  text?: string;
  audioBase64?: string;
  mimeType?: string;
}

// Words that mean "yes, connect me to an officer"
const OFFICER_AFFIRMATIONS = new Set([
  "yes", "ok", "okay", "sure", "please", "connect", "officer", "agent",
  "human", "staff", "yes please", "connect me", "speak to officer",
  "yes connect", "i want officer", "want officer",
]);

function isOfficerConfirmation(text: string): boolean {
  const t = text.toLowerCase().trim();
  return OFFICER_AFFIRMATIONS.has(t) || t.startsWith("yes") || t.includes("officer") || t.includes("connect me");
}

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
    .replace(/\n{2,}/g, ". ")             // paragraph breaks → pause
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, TTS_MAX_CHARS);
}

const OFFICER_BUTTON: ChannelButton[][] = [
  [{ label: "🧑‍💼 Connect to CPF Officer", callbackId: "connect_officer" }],
];

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
): Promise<void> {
  const clean = sanitizeReply(text);
  // formatReply("html") always HTML-escapes — must always send with parse_mode HTML
  // so entities like &amp; render correctly rather than showing literally.

  if (escalation.shouldEscalate && channel.sendWithButtons) {
    const offerHtml = escalation.offerText
      ? escalation.offerText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      : null;
    const withOffer = offerHtml ? `${clean}\n\n${offerHtml}` : clean;
    await channel.sendWithButtons(withOffer, OFFICER_BUTTON, true);
  } else {
    await channel.send(clean, true);
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
      await channel.send("Sorry, I couldn't understand your voice message. Please try again or type your question.").catch(() => null);
      return;
    }
    if (!messageText) {
      await channel.send("Sorry, I couldn't understand your voice message. Please try again or type your question.").catch(() => null);
      return;
    }
  }

  if (!messageText) return;

  log.info({ userId, channel: channel.prefix, voiceInput }, "Inbound message");

  // ── /start and /help ─────────────────────────────────────────────────────────
  if (isStartCommand(messageText)) {
    await channel.send(START_MESSAGE, true).catch(() => null);
    return;
  }
  if (isHelpCommand(messageText)) {
    await channel.send(HELP_MESSAGE, true).catch(() => null);
    return;
  }

  // ── Voice-toggle command ─────────────────────────────────────────────────────
  const voiceToggle = parseVoiceToggle(messageText);
  if (voiceToggle !== null) {
    const enabling = voiceToggle === "on";
    await upsertUserPrefs({ ...prefs, voice_enabled: enabling }).catch(() => null);
    const confirm = enabling
      ? "Voice replies enabled. I'll send a voice note along with every text response. Type *voice off* to disable."
      : "Voice replies disabled. I'll reply with text only. Type *voice on* to re-enable.";
    await channel.send(confirm).catch(() => null);
    return;
  }

  // ── Dialect command ──────────────────────────────────────────────────────────
  // "/dialect cantonese" → save zh-can; "/dialect off" → clear preference.
  // Voice replies for Chinese dialects use zh-HK-HiuMaanNeural (Cantonese) as
  // the closest Edge TTS voice for southern Chinese speakers.
  const dialectCmd = parseDialectCommand(messageText);
  if (dialectCmd !== null) {
    const newDialect = dialectCmd.code;
    await upsertUserPrefs({ ...prefs, preferred_dialect: newDialect ?? undefined }).catch(() => null);
    const confirm = newDialect
      ? `Dialect set to ${DIALECT_LABELS[newDialect] ?? newDialect}. Voice replies will use the matching voice. Type /dialect off to reset.`
      : "Dialect preference cleared. Voice replies will use the standard voice for your language.";
    await channel.send(confirm).catch(() => null);
    return;
  }

  // ── Officer confirmation path ────────────────────────────────────────────────
  if (prefs.pendingOfficerOffer && isOfficerConfirmation(messageText)) {
    await upsertUserPrefs({ ...prefs, pendingOfficerOffer: false }).catch(() => null);
    await doEscalate(channel, userId, sessionId, messageText, "", lang, null);
    return;
  }

  // Clear stale officer-offer flag when user sends a normal new question
  if (prefs.pendingOfficerOffer && !isOfficerConfirmation(messageText)) {
    await upsertUserPrefs({ ...prefs, pendingOfficerOffer: false }).catch(() => null);
    prefs = { ...prefs, pendingOfficerOffer: false };
  }

  // ── Active queue relay ───────────────────────────────────────────────────────
  const queue = await getQueue().catch(() => null);
  const activeEntry = queue?.find(
    (e) => e.userId === userId && (e.status === "waiting" || e.status === "assigned"),
  );
  if (activeEntry) {
    await relayToOfficer(activeEntry.queueId, userId, messageText, lang);
    await channel.send("Message received — an officer will reply shortly.").catch(() => null);
    return;
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
  let queryResult;
  let triage = classifyQuery(messageText); // preliminary pass; refined after normalisation below
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

    // Auto-detect the language of the normalised message.
    // Only run when the text is long enough for reliable detection (≥8 chars).
    // If the detected language differs from the stored pref, update lang + prefs
    // so both the translation step and TTS respond in the user's actual language.
    if (queryText.length >= 8) {
      const detected = await detectLanguage(queryText).catch(() => null);
      if (detected && SUPPORTED_LANGS.has(detected as Lang) && detected !== lang) {
        lang = detected as Lang;
        prefs = { ...prefs, preferred_lang: lang };
        await upsertUserPrefs(prefs).catch(() => null);
        log.info({ userId, detectedLang: lang }, "Language auto-detected — switching response language");
      }
    }

    // Re-classify on normalised text (slang may have changed keyword signals).
    triage = classifyQuery(queryText);
    log.info({ userId, triageCategory: triage.category, triageReason: triage.reason }, "Triage classification");

    queryResult = await runQueryAgent(
      [{ role: "user", content: queryText, timestamp: new Date().toISOString() }],
      { userId, tenantId: "cpf", vulnerabilityTier: "self-service", language: lang, triage },
    );
  } catch (err) {
    log.error(err, "Query pipeline failed");
    await sendReply(channel, "I'm having trouble processing your request right now.", { shouldEscalate: true, offerText: "A CPF officer can assist you directly. Tap below to connect." })
      .catch(() => null);
    return;
  }

  // ── Build reply ──────────────────────────────────────────────────────────────
  let reply = queryResult.content || "I wasn't able to find an answer for that. Would you like me to connect you to a CPF officer?";

  // Translate if user's language isn't English
  if (lang !== "en" && reply) {
    const t = await translateText(reply, "en", lang).catch(() => null);
    if (t) reply = t.translated_text;
  }

  // Intercept **generate_tts**(...) emitted by the LLM — strip it from display
  // text and capture what the LLM wanted to speak aloud.
  const { cleanReply, ttsText: llmTtsText } = interceptTtsCall(reply);
  reply = cleanReply;

  // Format: strip markdown, bold CPF terms with HTML tags
  reply = formatReply(reply, "html");

  // Await the emotion result (already scored and pushed to ring buffer by .then() above)
  const scored = await emotionPromise;

  // ── Escalation analysis ──────────────────────────────────────────────────────
  // Run the 5-layer escalation analyzer, with triage as fallback.
  // High distress (score > 70) auto-triggers the officer button regardless of
  // keyword layers — the user is clearly struggling and needs a human.
  let escalation = analyzeEscalation(messageText, reply, queryResult.confidence, triage);
  if (!escalation.shouldEscalate && scored.emotion_score > 70) {
    escalation = {
      shouldEscalate: true,
      reason: "explicit_request",
      offerText: "I can hear this is stressful. A CPF officer can help you directly — tap below to connect.",
    };
  }

  // If escalating, store pendingOfficerOffer so a typed "Officer" reply also works.
  if (escalation.shouldEscalate) {
    await upsertUserPrefs({ ...prefs, pendingOfficerOffer: true }).catch(() => null);
    log.info({ userId, reason: escalation.reason }, "Escalation offered to user");
  }

  await sendReply(channel, reply, escalation)
    .catch((err: unknown) => log.error(err, "Failed to send reply"));

  // ── TTS: generate and send audio reply ──────────────────────────────────────
  // Fire when: voice input, voice_enabled pref, OR LLM explicitly called generate_tts.
  const wantsVoice = voiceInput || prefs.voice_enabled === true || llmTtsText !== null;
  if (wantsVoice && channel.sendVoice) {
    log.info({ userId, lang, trigger: voiceInput ? "voice-input" : llmTtsText ? "llm-tts-call" : "pref" }, "Generating TTS audio reply");
    // Prefer the text the LLM extracted for TTS; fall back to the full plain reply.
    const speakText = llmTtsText
      ? stripMarkdownForTTS(llmTtsText)
      : stripMarkdownForTTS(formatReply(cleanReply, "plain"));
    const dialectCode = prefs.preferred_dialect;
    const tts = await synthesizeSpeech(speakText, lang, prefs.speech_rate ?? 1.0, dialectCode).catch((err: unknown) => {
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
}

async function relayToOfficer(
  queueId: string,
  userId: string,
  messageText: string,
  userLang: string,
): Promise<void> {
  let englishText = messageText;
  if (userLang !== "en") {
    const t = await translateText(messageText, userLang, "en").catch(() => null);
    if (t) englishText = t.translated_text;
  }
  broadcast("user_message", {
    queueId, userId,
    message: englishText,
    original_message: messageText,
    original_lang: userLang,
    ts: new Date().toISOString(),
  });
}

export async function escalateUser(channel: InboundChannel, userId: string): Promise<void> {
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

  await upsertUserPrefs({ ...(prefs ?? { userId, preferred_lang: "en", voice_enabled: false, speech_rate: 1.0, accessibility_mode: "standard" }), pendingOfficerOffer: false }).catch(() => null);
  await doEscalate(channel, userId, sessionId, summary, "", lang, emotion);
}

async function doEscalate(
  channel: InboundChannel,
  userId: string,
  sessionId: string,
  userMessage: string,
  botSummary: string,
  preferredLang: string,
  emotion: ScoredEmotion | null,
): Promise<void> {
  const entry = await postToQueue({
    sessionId, userId,
    emotion_score: emotion?.emotion_score ?? 50,
    emotion_label: emotion?.emotion_label ?? "neutral",
    summary: botSummary || userMessage,
    chat_history: [{ role: "user", content: userMessage, ts: new Date().toISOString() }],
    preferred_lang: preferredLang,
    dialect_hint: null,
  }).catch((e: unknown) => { log.error({ userId, err: String(e) }, "postToQueue failed"); return null; });

  if (entry) {
    notifyNewQueueEntry(entry.queueId, entry.emotion_label, entry.priority_score);
    log.info({ queueId: entry.queueId, userId }, "User escalated to CCU queue");
  } else {
    log.error({ userId }, "doEscalate — queue entry was not created");
  }

  let msg = "✅ You're now in the queue. A CPF officer will be with you shortly.\n\nYou may continue to type if you'd like to add more details — your officer will see everything when they take your case.";
  if (preferredLang !== "en") {
    const t = await translateText(msg, "en", preferredLang).catch(() => null);
    if (t) msg = t.translated_text;
  }

  const confirmErr = await channel.send(msg).catch((e: unknown) => e);
  if (confirmErr instanceof Error) {
    log.error({ userId, err: confirmErr.message }, "doEscalate — failed to send confirmation message");
  }
}
