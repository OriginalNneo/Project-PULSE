import { Router } from "express";
import type { Request, Response } from "express";
import {
  sendTelegramMessage,
  getFileBase64,
  type TelegramUpdate,
} from "../adapters/telegram/client.js";
import { processInbound, type InboundChannel } from "./inbound.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("telegram-gateway");

/**
 * Process a single Telegram update through the shared inbound pipeline.
 * Used by both the webhook route (production) and the long-poll runner (local dev).
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message ?? update.edited_message;
  if (!message || message.from?.is_bot) return;

  const chatId = message.chat.id;
  const channel: InboundChannel = {
    prefix: "tg",
    send: (text) => sendTelegramMessage(chatId, text),
  };

  // Voice note → download + base64 so the pipeline can transcribe it via HF Whisper
  if (message.voice) {
    const file = await getFileBase64(message.voice.file_id).catch((err: unknown) => {
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
router.post("/telegram", (req: Request, res: Response) => {
  res.sendStatus(200);
  void handleTelegramUpdate(req.body as TelegramUpdate).catch((err: unknown) => {
    log.error(err, "Inbound Telegram processing failed");
  });
});

export { router as telegramRoutes };
