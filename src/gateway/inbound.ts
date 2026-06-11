import { runTranscriberSubagent } from "../agents/transcriber/agent.js";
import { runQueryAgent } from "../agents/query/agent.js";
import { getUserPrefs, upsertUserPrefs, postToQueue, getQueue } from "../db/proxy-client.js";
import { translateText, detectEmotion, detectAudioEmotion, transcribeAudio, synthesizeSpeech } from "../python-bridge/client.js";
import { scoreEmotion, type ScoredEmotion } from "../agents/main/emotion.js";
import { notifyNewQueueEntry } from "../dashboard/notify.js";
import { broadcast } from "./ws.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("inbound");

type Lang = "en" | "zh" | "ms" | "ta";

/** A messaging channel the inbound pipeline can reply through (WhatsApp, Telegram, …). */
export interface InboundChannel {
  /** Short id used to namespace users + sessions, e.g. "wa" or "tg". */
  prefix: string;
  /** Send a plain-text reply back to this user. */
  send: (text: string) => Promise<void>;
  /** Optional: send an audio reply. Channels that can't (or don't) omit this. */
  sendVoice?: (audioBase64: string, mimeType: string) => Promise<void>;
}

export interface InboundMessage {
  /** Channel-native user id (phone number, Telegram chat id, …). */
  userKey: string;
  /** Text body, if any. */
  text?: string;
  /** Base64 voice note, if any — transcribed via HF Whisper before processing. */
  audioBase64?: string;
  mimeType?: string;
}

/**
 * Channel-agnostic inbound pipeline: transcribe → normalise → query → (translate
 * reply | escalate to CCU queue with emotion). Shared by every messaging channel.
 */
export async function processInbound(channel: InboundChannel, msg: InboundMessage): Promise<void> {
  const userId = `${channel.prefix}:${msg.userKey}`;
  const sessionId = `${userId}:${Date.now()}`;

  // Voice note → text via HF Whisper
  let messageText = (msg.text ?? "").trim();
  if (!messageText && msg.audioBase64) {
    const stt = await transcribeAudio(msg.audioBase64, msg.mimeType ?? "audio/ogg").catch(() => null);
    messageText = stt?.text?.trim() ?? "";
  }
  if (!messageText) return;

  log.info({ userId, channel: channel.prefix }, "Inbound message");

  // Fetch or create user prefs
  let prefs = await getUserPrefs(userId).catch(() => null);
  if (!prefs) {
    prefs = {
      userId,
      preferred_lang: "en",
      voice_enabled: false,
      speech_rate: 1.0,
      accessibility_mode: "standard",
    };
    await upsertUserPrefs(prefs).catch(() => null);
  }
  const lang = prefs.preferred_lang as Lang;

  // If the user already has an active queue entry, relay straight to the officer
  const queue = await getQueue().catch(() => null);
  const activeEntry = queue?.find(
    (e) => e.userId === userId && (e.status === "waiting" || e.status === "assigned"),
  );
  if (activeEntry) {
    await relayUserMessageToOfficer(activeEntry.queueId, userId, messageText, lang);
    await channel.send("Message received — an officer will reply shortly.").catch(() => null);
    return;
  }

  // Normalise + detect language
  const transcriberResult = await runTranscriberSubagent({ mode: "text", text: messageText }, { language: lang });
  const englishText = transcriberResult?.normalizedText || messageText;

  // CPF knowledge query
  const queryResult = await runQueryAgent(
    [{ role: "user", content: englishText, timestamp: new Date().toISOString() }],
    { userId, tenantId: "cpf", vulnerabilityTier: "self-service", language: lang },
  );

  if (queryResult.requiresHumanReview) {
    // Text emotion (English-only classifier) + audio emotion boost when a voice note was sent
    const textEmotion = await detectEmotion(englishText).catch(() => null);
    const audioEmotion = msg.audioBase64
      ? await detectAudioEmotion(msg.audioBase64, msg.mimeType ?? "audio/ogg").catch(() => null)
      : null;
    const scored = textEmotion ? scoreEmotion(textEmotion, audioEmotion) : null;
    await escalateToQueue(channel, userId, sessionId, messageText, queryResult.content, lang, scored);
    return;
  }

  let reply = queryResult.content;
  if (lang !== "en") {
    const t = await translateText(reply, "en", lang).catch(() => null);
    if (t) reply = t.translated_text;
  }
  // Text is always the primary reply
  await channel.send(reply).catch((err: unknown) => log.error(err, "Failed to send reply"));

  // Optional voice reply: only when the user sent a voice note or opted into voice,
  // and the channel supports audio. TTS failures never affect the text reply above.
  const wantsVoice = Boolean(msg.audioBase64) || prefs.voice_enabled === true;
  if (wantsVoice && channel.sendVoice) {
    const tts = await synthesizeSpeech(reply, lang, prefs.speech_rate ?? 1.0).catch((err: unknown) => {
      log.warn({ err }, "TTS failed — text-only reply stands");
      return null;
    });
    if (tts?.audioBase64) {
      await channel.sendVoice(tts.audioBase64, tts.mimeType).catch((err: unknown) =>
        log.error(err, "Failed to send voice reply"),
      );
    }
  }
}

async function relayUserMessageToOfficer(
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
    queueId,
    userId,
    message: englishText,
    original_message: messageText,
    original_lang: userLang,
    ts: new Date().toISOString(),
  });
}

async function escalateToQueue(
  channel: InboundChannel,
  userId: string,
  sessionId: string,
  userMessage: string,
  botSummary: string,
  preferredLang: string,
  emotion: ScoredEmotion | null,
): Promise<void> {
  const entry = await postToQueue({
    sessionId,
    userId,
    emotion_score: emotion?.emotion_score ?? 50,
    emotion_label: emotion?.emotion_label ?? "neutral",
    summary: botSummary,
    chat_history: [{ role: "user", content: userMessage, ts: new Date().toISOString() }],
    preferred_lang: preferredLang,
    dialect_hint: null,
  }).catch(() => null);

  if (entry) {
    notifyNewQueueEntry(entry.queueId, entry.emotion_label, entry.priority_score);
    log.info({ queueId: entry.queueId, userId }, "User escalated to CCU queue");
  }

  let interim = "You're being connected to a CPF officer. Please hold on — they'll be with you shortly.";
  if (preferredLang !== "en") {
    const t = await translateText(interim, "en", preferredLang).catch(() => null);
    if (t) interim = t.translated_text;
  }
  await channel.send(interim).catch(() => null);
}
