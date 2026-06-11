import { Router } from "express";
import type { Request, Response } from "express";
import { runTranscriberSubagent } from "../agents/transcriber/agent.js";
import { runQueryAgent } from "../agents/query/agent.js";
import { getUserPrefs, upsertUserPrefs, postToQueue, getQueue } from "../db/proxy-client.js";
import { sendWhatsAppMessage, verifyTwilioSignature } from "../adapters/twilio/client.js";
import { translateText } from "../python-bridge/client.js";
import { notifyNewQueueEntry } from "../dashboard/notify.js";
import { broadcast } from "./ws.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("webhook");
const router = Router();

// Twilio sends form-encoded bodies — express.urlencoded() must be mounted before this router
router.post("/whatsapp", (req: Request, res: Response) => {
  // Respond immediately with empty TwiML so Twilio doesn't time out
  res.set("Content-Type", "text/xml").send("<Response></Response>");

  // Process asynchronously after Twilio receives the 200
  void handleInbound(req).catch((err: unknown) => {
    log.error(err, "Inbound WhatsApp processing failed");
  });
});

async function handleInbound(req: Request): Promise<void> {
  const body = req.body as Record<string, string>;

  // Verify signature in production
  if (process.env.NODE_ENV === "production") {
    const signature = (req.headers["x-twilio-signature"] as string) ?? "";
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    if (!verifyTwilioSignature(signature, url, body)) {
      log.warn("Rejected request with invalid Twilio signature");
      return;
    }
  }

  const fromRaw = body["From"] ?? "";           // whatsapp:+6512345678
  const messageText = (body["Body"] ?? "").trim();
  const phoneNumber = fromRaw.replace("whatsapp:", "");

  if (!phoneNumber || !messageText) return;

  const userId = `wa:${phoneNumber}`;
  const sessionId = `wa:${phoneNumber}:${Date.now()}`;

  log.info({ userId }, "Inbound WhatsApp message");

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

  // If user already has an active queue entry, relay to officer
  const queue = await getQueue().catch(() => null);
  const activeEntry = queue?.find(
    (e) => e.userId === userId && (e.status === "waiting" || e.status === "assigned"),
  );

  if (activeEntry) {
    await relayUserMessageToOfficer(activeEntry.queueId, userId, messageText, prefs.preferred_lang);
    await sendWhatsAppMessage(phoneNumber, "Message received — an officer will reply shortly.").catch(() => null);
    return;
  }

  // Run transcriber (normalise + detect language)
  const transcriberResult = await runTranscriberSubagent(
    { mode: "text", text: messageText },
    { language: prefs.preferred_lang as "en" | "zh" | "ms" | "ta" },
  );

  const englishText = transcriberResult?.normalizedText || messageText;

  // Run query agent
  const queryResult = await runQueryAgent(
    [{ role: "user", content: englishText, timestamp: new Date().toISOString() }],
    {
      userId,
      tenantId: "cpf",
      vulnerabilityTier: "self-service",
      language: prefs.preferred_lang as "en" | "zh" | "ms" | "ta",
    },
  );

  if (queryResult.requiresHumanReview) {
    await escalateToQueue(userId, sessionId, messageText, queryResult.content, phoneNumber, prefs.preferred_lang);
  } else {
    let reply = queryResult.content;
    if (prefs.preferred_lang !== "en") {
      const t = await translateText(reply, "en", prefs.preferred_lang).catch(() => null);
      if (t) reply = t.translated_text;
    }
    await sendWhatsAppMessage(phoneNumber, reply).catch((err: unknown) => {
      log.error(err, "Failed to send WhatsApp reply");
    });
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
  userId: string,
  sessionId: string,
  userMessage: string,
  botSummary: string,
  phoneNumber: string,
  preferredLang: string,
): Promise<void> {
  const entry = await postToQueue({
    sessionId,
    userId,
    emotion_score: 50,
    emotion_label: "neutral",
    summary: botSummary,
    chat_history: [{ role: "user", content: userMessage, ts: new Date().toISOString() }],
    preferred_lang: preferredLang,
    dialect_hint: null,
  }).catch(() => null);

  if (entry) {
    notifyNewQueueEntry(entry.queueId, entry.emotion_label, entry.priority_score);
    log.info({ queueId: entry.queueId, userId }, "WhatsApp user escalated to queue");
  }

  let interim = "You're being connected to a CPF officer. Please hold on — they'll be with you shortly.";
  if (preferredLang !== "en") {
    const t = await translateText(interim, "en", preferredLang).catch(() => null);
    if (t) interim = t.translated_text;
  }
  await sendWhatsAppMessage(phoneNumber, interim).catch(() => null);
}

export { router as webhookRoutes };
