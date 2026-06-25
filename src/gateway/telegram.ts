import { Router } from "express";
import type { Request, Response } from "express";
import {
  sendTelegramMessage,
  sendTelegramMessageReturningId,
  editTelegramMessage,
  deleteTelegramMessage,
  sendChatAction,
  sendTelegramAudio,
  answerCallbackQuery,
  getFileBase64,
  type TelegramUpdate,
  type InlineKeyboard,
} from "../adapters/telegram/client.js";
import { processInbound, escalateUser, recordGuidingAnswer, type InboundChannel, type ChannelButton } from "./inbound.js";
import { recordRating } from "../services/session/manager.js";
import { getUserPrefs, upsertUserPrefs } from "../db/proxy-client.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("telegram-gateway");

function makeChannel(chatId: number): InboundChannel {
  return {
    prefix: "tg",
    send: (text, html) => sendTelegramMessage(chatId, text, undefined, html),
    sendWithButtons: (text, buttons: ChannelButton[][], html) => {
      const inline_keyboard: InlineKeyboard = buttons.map((row) =>
        row.map((btn) => ({ text: btn.label, callback_data: btn.callbackId })),
      );
      return sendTelegramMessage(chatId, text, { inline_keyboard }, html);
    },
    sendVoice: (audioBase64, mimeType) => sendTelegramAudio(chatId, audioBase64, mimeType),
    // ── In-place editing (powers the "thinking" dot animation) ──
    sendForEdit: async (text, html) => {
      const id = await sendTelegramMessageReturningId(chatId, text, undefined, html);
      return id != null ? String(id) : null;
    },
    editMessage: (messageId, text, buttons, html) => {
      const replyMarkup = buttons
        ? { inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.label, callback_data: b.callbackId }))) }
        : undefined;
      return editTelegramMessage(chatId, Number(messageId), text, replyMarkup, html);
    },
    deleteMessage: (messageId) => deleteTelegramMessage(chatId, Number(messageId)),
    typing: () => sendChatAction(chatId, "typing"),
  };
}

/**
 * Process a single Telegram update through the shared inbound pipeline.
 * Used by both the webhook route (production) and the long-poll runner (local dev).
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  // ── Inline button tap ──────────────────────────────────────────────────────
  if (update.callback_query) {
    const cq = update.callback_query;
    log.info({ fromId: cq.from.id, data: cq.data, hasCqMessage: Boolean(cq.message) }, "callback_query received");

    if (cq.from.is_bot) { log.info("callback_query from bot — ignored"); return; }

    const isOfficer = cq.data === "connect_officer";
    const isGuide = cq.data?.startsWith("guide:") ?? false;
    const isRate = cq.data?.startsWith("rate:") ?? false;

    // Instant toast via the callback ack — appears client-side before any chat message.
    // Stale query (>60s) will 400 but that's non-fatal; the action still completes.
    const ackText = isOfficer ? "⏳ Connecting you to a CPF officer…" : isRate ? "🙏 Thanks for your feedback!" : "✓ Got it";
    void answerCallbackQuery(cq.id, ackText).catch((e: unknown) => {
      if (e instanceof Error) log.warn({ err: e.message }, "answerCallbackQuery failed (non-fatal)");
    });

    if (isOfficer) {
      if (!cq.message) {
        log.warn({ fromId: cq.from.id }, "connect_officer callback_query has no message object — cannot get chatId");
        return;
      }
      const chatId = cq.message.chat.id;
      log.info({ chatId, userId: `tg:${chatId}` }, "connect_officer button pressed — starting escalation");
      const channel = makeChannel(chatId);
      await escalateUser(channel, `tg:${chatId}`);
      log.info({ chatId }, "escalateUser completed");
    } else if (isGuide) {
      // guide:<questionId>:<optIndex> — a guiding-question choice button.
      // Resolve the option's English text from the user's in-flight guiding set,
      // then route it through the same path as a typed answer.
      if (!cq.message) {
        log.warn({ fromId: cq.from.id }, "guide callback_query has no message object — cannot get chatId");
        return;
      }
      const chatId = cq.message.chat.id;
      const userId = `tg:${chatId}`;
      const [, qid, idxStr] = (cq.data ?? "").split(":");
      const prefs = await getUserPrefs(userId).catch(() => null);
      const q = prefs?.pendingGuiding?.questions.find((x) => x.id === qid);
      const optionText = (q?.options ?? q?.quickReplies)?.[Number(idxStr)];
      if (!optionText) {
        log.info({ userId, data: cq.data }, "guide callback — no matching pending option (stale button?)");
        return;
      }
      log.info({ userId, qid, optionText }, "Guiding choice button pressed");
      await recordGuidingAnswer(makeChannel(chatId), userId, optionText);
    } else if (isRate) {
      // rate:<sessionId>:<stars> — a CSAT star button at session end.
      if (!cq.message) {
        log.warn({ fromId: cq.from.id }, "rate callback_query has no message object — cannot get chatId");
        return;
      }
      const chatId = cq.message.chat.id;
      const userId = `tg:${chatId}`;
      const [, sid, starStr] = (cq.data ?? "").split(":");
      const stars = Number(starStr);
      const result = await recordRating(userId, sid ?? "", stars);
      if (result.ok) {
        // Strip the keyboard + confirm in place so the user can't re-rate.
        await editTelegramMessage(chatId, cq.message.message_id, result.thankYou ?? `Thank you for rating us ${stars}⭐!`).catch(() => null);
      }
      log.info({ userId, sid, stars, ok: result.ok }, "CSAT rating button pressed");
    } else {
      log.info({ data: cq.data }, "callback_query data not handled");
    }
    return;
  }

  // ── Regular message ────────────────────────────────────────────────────────
  const message = update.message ?? update.edited_message;
  if (!message || message.from?.is_bot) return;

  const chatId = message.chat.id;
  const channel = makeChannel(chatId);

  // Capture the citizen's real Telegram name so the officer dashboard can show it
  // (instead of a hardcoded placeholder) once they escalate. Merge into prefs so
  // language/voice settings are preserved. first_name → username → skip.
  const from = message.from;
  if (from) {
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(" ").trim() ||
      (from.username ? `@${from.username}` : "");
    if (displayName) {
      await upsertUserPrefs({ userId: `tg:${chatId}`, display_name: displayName }).catch(() => null);
    }
  }

  // Voice note → download + base64 so the pipeline can transcribe it via HF Whisper.
  // Pass the mime_type from the Telegram voice object (more reliable than file extension).
  if (message.voice) {
    const file = await getFileBase64(message.voice.file_id, message.voice.mime_type).catch((err: unknown) => {
      log.error(err, "Failed to fetch Telegram voice file");
      return null;
    });
    if (!file) {
      await channel.send("Sorry, I couldn't download that voice message. Please try again.").catch(() => null);
      return;
    }
    await processInbound(channel, { userKey: String(chatId), audioBase64: file.base64, mimeType: file.mimeType, durationSec: (message.voice as { duration?: number }).duration });
    return;
  }

  const text = (message.text ?? "").trim();
  if (!text) return;
  await processInbound(channel, { userKey: String(chatId), text });
}

const router = Router();

// Telegram webhook (production). Respond 200 immediately, process async.
// If TELEGRAM_WEBHOOK_SECRET is set, Telegram sends it in X-Telegram-Bot-Api-Secret-Token.
router.post("/telegram", (req: Request, res: Response) => {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const received = req.headers["x-telegram-bot-api-secret-token"];
    if (received !== secret) {
      log.warn({ ip: req.ip }, "Telegram webhook: invalid secret token — rejected");
      res.sendStatus(401);
      return;
    }
  }
  res.sendStatus(200);
  void handleTelegramUpdate(req.body as TelegramUpdate).catch((err: unknown) => {
    log.error(err, "Inbound Telegram processing failed");
  });
});

export { router as telegramRoutes };
