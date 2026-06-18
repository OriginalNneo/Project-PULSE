import { Router } from "express";
import type { Request, Response } from "express";
import {
  sendTelegramMessage,
  sendTelegramAudio,
  answerCallbackQuery,
  getFileBase64,
  type TelegramUpdate,
  type InlineKeyboard,
} from "../adapters/telegram/client.js";
import { processInbound, escalateUser, type InboundChannel, type ChannelButton } from "./inbound.js";
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

    // Instant toast via the callback ack — appears client-side before any chat message.
    // Stale query (>60s) will 400 but that's non-fatal; escalation still completes.
    void answerCallbackQuery(cq.id, "⏳ Connecting you to a CPF officer…").catch((e: unknown) => {
      if (e instanceof Error) log.warn({ err: e.message }, "answerCallbackQuery failed (non-fatal)");
    });

    if (cq.data === "connect_officer") {
      if (!cq.message) {
        log.warn({ fromId: cq.from.id }, "connect_officer callback_query has no message object — cannot get chatId");
        return;
      }
      const chatId = cq.message.chat.id;
      log.info({ chatId, userId: `tg:${chatId}` }, "connect_officer button pressed — starting escalation");
      const channel = makeChannel(chatId);
      await escalateUser(channel, `tg:${chatId}`);
      log.info({ chatId }, "escalateUser completed");
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
    await processInbound(channel, { userKey: String(chatId), audioBase64: file.base64, mimeType: file.mimeType });
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
