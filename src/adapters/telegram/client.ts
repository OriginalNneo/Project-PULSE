import { createServiceLogger } from "../../shared/logger.js";
import { ExternalServiceError } from "../../shared/errors.js";

const log = createServiceLogger("telegram");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const API = `https://api.telegram.org/bot${TOKEN}`;
const FILE_API = `https://api.telegram.org/file/bot${TOKEN}`;

export function telegramConfigured(): boolean {
  return Boolean(TOKEN);
}

// ── Telegram Update shapes (only the fields we use) ───────────────────────────
export interface TelegramVoice {
  file_id: string;
  mime_type?: string;
  duration: number;
}
export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number; is_bot: boolean; first_name?: string };
  text?: string;
  voice?: TelegramVoice;
}
export interface TelegramCallbackQuery {
  id: string;
  from: { id: number; is_bot: boolean; first_name?: string };
  message?: TelegramMessage;
  data?: string;
}
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// Inline keyboard button (single action — tap sends callback data to the bot)
export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}
export type InlineKeyboard = InlineKeyboardButton[][];

async function apiCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const body = (await res.json().catch(() => ({}))) as { ok: boolean; result?: T; description?: string };
  if (!res.ok || !body.ok) {
    throw new ExternalServiceError("telegram", `${method} failed: ${res.status} ${body.description ?? ""}`);
  }
  return body.result as T;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: { inline_keyboard: InlineKeyboard },
  html = false,
): Promise<void> {
  if (!TOKEN) {
    log.warn("TELEGRAM_BOT_TOKEN not configured — message not sent");
    return;
  }
  const params: Record<string, unknown> = { chat_id: chatId, text };
  if (html) params.parse_mode = "HTML";
  if (replyMarkup) params.reply_markup = replyMarkup;
  await apiCall("sendMessage", params);
  log.info({ chatId, hasButtons: Boolean(replyMarkup), html }, "Telegram message sent");
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  if (!TOKEN) return;
  await apiCall("answerCallbackQuery", { callback_query_id: callbackQueryId, text: text ?? "" });
}

/** Send an audio reply as a Telegram voice note (inline waveform player).
 *  Edge TTS returns MP3 — Telegram's sendVoice accepts MP3 as well as OGG/Opus. */
export async function sendTelegramAudio(
  chatId: number | string,
  audioBase64: string,
  mimeType: string,
): Promise<void> {
  if (!TOKEN) {
    log.warn("TELEGRAM_BOT_TOKEN not configured — audio not sent");
    return;
  }
  const bytes = Buffer.from(audioBase64, "base64");
  const ext = mimeType.includes("mpeg") || mimeType.includes("mp3") ? "mp3" : "ogg";
  const form = new FormData();
  form.append("chat_id", String(chatId));
  // sendVoice shows the waveform player inline; sendAudio shows a music player.
  form.append("voice", new Blob([bytes], { type: mimeType }), `reply.${ext}`);
  const res = await fetch(`${API}/sendVoice`, { method: "POST", body: form });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // sendVoice requires OGG/Opus strictly in some Telegram versions — fall back to sendAudio
    log.warn({ status: res.status, errText }, "sendVoice failed — retrying as sendAudio");
    const form2 = new FormData();
    form2.append("chat_id", String(chatId));
    form2.append("audio", new Blob([bytes], { type: mimeType }), `reply.${ext}`);
    const res2 = await fetch(`${API}/sendAudio`, { method: "POST", body: form2 });
    if (!res2.ok) {
      const text2 = await res2.text().catch(() => "");
      throw new ExternalServiceError("telegram", `sendAudio failed: ${res2.status} ${text2.slice(0, 150)}`);
    }
  }
  log.info({ chatId }, "Telegram voice reply sent");
}

/** Download a Telegram file (e.g. a voice note) and return it base64-encoded.
 *  Pass the mime_type from the TelegramVoice object when available — it is more
 *  reliable than guessing from the file extension. */
export async function getFileBase64(
  fileId: string,
  mimeHint?: string,
): Promise<{ base64: string; mimeType: string }> {
  const file = await apiCall<{ file_path: string }>("getFile", { file_id: fileId });
  const res = await fetch(`${FILE_API}/${file.file_path}`);
  if (!res.ok) throw new ExternalServiceError("telegram", `file download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType =
    mimeHint ??
    (file.file_path.endsWith(".oga") || file.file_path.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg");
  return { base64: buf.toString("base64"), mimeType };
}

/** Long-poll for updates (used by the local dev poller). */
export function getUpdates(offset: number, timeoutSec = 25): Promise<TelegramUpdate[]> {
  return apiCall<TelegramUpdate[]>("getUpdates", { offset, timeout: timeoutSec, allowed_updates: ["message", "callback_query"] });
}

export async function setWebhook(url: string): Promise<void> {
  const params: Record<string, unknown> = { url, allowed_updates: ["message", "callback_query"] };
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) params.secret_token = secret;
  await apiCall("setWebhook", params);
  log.info({ url, hasSecret: Boolean(secret) }, "Telegram webhook set");
  // Register the command menu so users see suggestions when they type "/"
  await setMyCommands().catch((err: unknown) => log.warn(err, "setMyCommands failed (non-fatal)"));
}

export async function setMyCommands(): Promise<void> {
  if (!TOKEN) return;
  await apiCall("setMyCommands", {
    commands: [
      { command: "start",   description: "Welcome — what PULSE can do" },
      { command: "help",    description: "Full command reference" },
      { command: "voice",   description: "Toggle voice replies (voice on / voice off)" },
      { command: "dialect", description: "Set dialect voice (cantonese, hokkien, teochew…)" },
    ],
  });
  log.info("Telegram command menu registered");
}

export async function deleteWebhook(): Promise<void> {
  await apiCall("deleteWebhook", { drop_pending_updates: false });
  log.info("Telegram webhook deleted");
}
