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
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

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

export async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  if (!TOKEN) {
    log.warn("TELEGRAM_BOT_TOKEN not configured — message not sent");
    return;
  }
  await apiCall("sendMessage", { chat_id: chatId, text });
  log.info({ chatId }, "Telegram message sent");
}

/** Download a Telegram file (e.g. a voice note) and return it base64-encoded. */
export async function getFileBase64(fileId: string): Promise<{ base64: string; mimeType: string }> {
  const file = await apiCall<{ file_path: string }>("getFile", { file_id: fileId });
  const res = await fetch(`${FILE_API}/${file.file_path}`);
  if (!res.ok) throw new ExternalServiceError("telegram", `file download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = file.file_path.endsWith(".oga") || file.file_path.endsWith(".ogg") ? "audio/ogg" : "audio/mpeg";
  return { base64: buf.toString("base64"), mimeType };
}

/** Long-poll for updates (used by the local dev poller). */
export function getUpdates(offset: number, timeoutSec = 25): Promise<TelegramUpdate[]> {
  return apiCall<TelegramUpdate[]>("getUpdates", { offset, timeout: timeoutSec, allowed_updates: ["message"] });
}

export async function setWebhook(url: string): Promise<void> {
  await apiCall("setWebhook", { url, allowed_updates: ["message"] });
  log.info({ url }, "Telegram webhook set");
}

export async function deleteWebhook(): Promise<void> {
  await apiCall("deleteWebhook", { drop_pending_updates: false });
  log.info("Telegram webhook deleted");
}
