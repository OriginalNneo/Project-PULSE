import { getIntegrationConfig } from "../../config/integration.js";
import { createServiceLogger } from "../../shared/logger.js";
import type { InboundHandler, InboundMessage, MessagingChannel, OutboundMessage, SendResult } from "./types.js";

const log = createServiceLogger("messaging.telegram");

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    chat: { id: number };
    text?: string;
  };
}

/**
 * Telegram Bot API channel — the concrete prototype transport. Uses long
 * polling (getUpdates) so it works on localhost with no public URL. Talks to
 * the HTTP API directly via fetch, so it needs no extra npm dependency.
 *
 * When we move to WhatsApp for live, nothing above this file changes — the
 * chatbot/escalation/officer code only sees the MessagingChannel interface.
 */
export function createTelegramChannel(): MessagingChannel {
  let polling = false;
  let offset = 0;

  function token(): string | undefined {
    return getIntegrationConfig().telegram.botToken;
  }

  async function api<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const t = token();
    if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
    const res = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description ?? res.status}`);
    return data.result as T;
  }

  function parse(update: TelegramUpdate): InboundMessage | null {
    const msg = update.message;
    if (!msg?.text || msg.from === undefined) return null;
    const name = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || msg.from.username;
    return {
      from: String(msg.chat.id),
      fromName: name,
      text: msg.text,
      messageId: String(msg.message_id),
      receivedAt: new Date().toISOString(),
    };
  }

  async function pollLoop(handler: InboundHandler): Promise<void> {
    while (polling) {
      try {
        const updates = await api<TelegramUpdate[]>("getUpdates", { offset, timeout: 25 });
        for (const update of updates) {
          offset = Math.max(offset, update.update_id + 1);
          const inbound = parse(update);
          if (inbound) {
            try {
              await handler(inbound);
            } catch (error) {
              log.error({ err: (error as Error).message }, "Inbound handler threw");
            }
          }
        }
      } catch (error) {
        log.warn({ err: (error as Error).message }, "Telegram poll error — backing off");
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  return {
    kind: "telegram",
    isReady(): boolean {
      return Boolean(token());
    },
    canEdit: true,
    async send(message: OutboundMessage): Promise<SendResult> {
      try {
        const result = await api<{ message_id: number }>("sendMessage", {
          chat_id: message.to,
          text: message.text,
        });
        return { ok: true, messageId: String(result.message_id) };
      } catch (error) {
        log.warn({ err: (error as Error).message }, "Telegram send failed");
        return { ok: false, error: (error as Error).message };
      }
    },
    async editMessage(to: string, messageId: string, text: string): Promise<SendResult> {
      try {
        await api("editMessageText", { chat_id: to, message_id: Number(messageId), text });
        return { ok: true, messageId };
      } catch (error) {
        // "message is not modified" is benign (same frame) — don't spam logs.
        const msg = (error as Error).message;
        if (!msg.includes("not modified")) {
          log.warn({ err: msg }, "Telegram edit failed");
        }
        return { ok: false, error: msg };
      }
    },
    async startReceiving(handler: InboundHandler): Promise<void> {
      if (polling) return;
      if (!token()) {
        log.warn("Telegram polling not started — TELEGRAM_BOT_TOKEN missing");
        return;
      }
      if (getIntegrationConfig().telegram.mode === "webhook") {
        log.info("Telegram is in webhook mode — not polling");
        return;
      }
      polling = true;
      log.info("Telegram long-polling started");
      void pollLoop(handler);
    },
    async stopReceiving(): Promise<void> {
      polling = false;
    },
    async handleWebhook(body: unknown): Promise<InboundMessage[]> {
      const inbound = parse(body as TelegramUpdate);
      return inbound ? [inbound] : [];
    },
  };
}
