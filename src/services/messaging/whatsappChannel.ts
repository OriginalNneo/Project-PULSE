import { getIntegrationConfig } from "../../config/integration.js";
import { createServiceLogger } from "../../shared/logger.js";
import type { InboundHandler, InboundMessage, MessagingChannel, OutboundMessage, SendResult } from "./types.js";

const log = createServiceLogger("messaging.whatsapp");

/**
 * WhatsApp Cloud API channel — STUB for the live rollout.
 *
 * Implements the same MessagingChannel interface as Telegram so it is a
 * drop-in replacement: set MESSAGING_CHANNEL=whatsapp and fill the
 * WHATSAPP_* env vars, and escalations flow over WhatsApp instead — no other
 * code changes. The send() body sketches the real Graph API call; until the
 * Meta credentials and webhook verification are wired, isReady() is false and
 * the system logs intent instead of sending.
 */
export function createWhatsAppChannel(): MessagingChannel {
  function config() {
    return getIntegrationConfig().whatsapp;
  }

  return {
    kind: "whatsapp",
    // WhatsApp has no edit-message API, so no in-place "thinking" animation.
    canEdit: false,
    isReady(): boolean {
      const c = config();
      return Boolean(c.phoneNumberId && c.accessToken);
    },
    async send(message: OutboundMessage): Promise<SendResult> {
      const c = config();
      if (!c.phoneNumberId || !c.accessToken) {
        log.warn({ to: message.to }, "WhatsApp not configured — would have sent (stub)");
        return { ok: false, error: "WhatsApp not configured (stub)" };
      }
      try {
        const res = await fetch(`https://graph.facebook.com/v20.0/${c.phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${c.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: message.to,
            type: "text",
            text: { body: message.text },
          }),
        });
        if (!res.ok) {
          return { ok: false, error: `WhatsApp send failed (${res.status})` };
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error: (error as Error).message };
      }
    },
    async startReceiving(_handler: InboundHandler): Promise<void> {
      // WhatsApp is webhook-only; inbound arrives via handleWebhook(), not polling.
      log.info("WhatsApp channel ready (webhook mode) — stub until credentials are wired");
    },
    async stopReceiving(): Promise<void> {
      /* nothing to stop */
    },
    async handleWebhook(body: unknown): Promise<InboundMessage[]> {
      // Real shape: entry[].changes[].value.messages[]. Parsed defensively.
      const out: InboundMessage[] = [];
      try {
        const entries = (body as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ id: string; from: string; text?: { body?: string } }>; contacts?: Array<{ profile?: { name?: string } }> } }> }> }).entry ?? [];
        for (const entry of entries) {
          for (const change of entry.changes ?? []) {
            const value = change.value;
            const name = value?.contacts?.[0]?.profile?.name;
            for (const m of value?.messages ?? []) {
              if (m.text?.body) {
                out.push({
                  from: m.from,
                  fromName: name,
                  text: m.text.body,
                  messageId: m.id,
                  receivedAt: new Date().toISOString(),
                });
              }
            }
          }
        }
      } catch (error) {
        log.warn({ err: (error as Error).message }, "Failed to parse WhatsApp webhook");
      }
      return out;
    },
  };
}
