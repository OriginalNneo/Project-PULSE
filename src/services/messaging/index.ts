import { getIntegrationConfig } from "../../config/integration.js";
import { createServiceLogger } from "../../shared/logger.js";
import { createTelegramChannel } from "./telegramChannel.js";
import { createWhatsAppChannel } from "./whatsappChannel.js";
import type { InboundHandler, MessagingChannel } from "./types.js";

export type { MessagingChannel, InboundMessage, OutboundMessage } from "./types.js";

const log = createServiceLogger("messaging");

let active: MessagingChannel | null = null;

/**
 * Returns the active messaging channel (Telegram or WhatsApp) per
 * MESSAGING_CHANNEL. Cached so polling starts only once. If you change the
 * channel at runtime, call resetMessagingChannel() first.
 */
export function getMessagingChannel(): MessagingChannel {
  if (active) return active;
  const { messagingChannel } = getIntegrationConfig();
  active = messagingChannel === "whatsapp" ? createWhatsAppChannel() : createTelegramChannel();
  return active;
}

export async function resetMessagingChannel(): Promise<void> {
  if (active) {
    await active.stopReceiving();
    active = null;
  }
}

/**
 * Start the active channel receiving inbound citizen messages. Called once at
 * gateway startup. Inbound messages are fed into the chatbot pipeline, and if
 * the session is already with an officer they are appended to the conversation.
 */
export async function startMessaging(handler: InboundHandler): Promise<void> {
  const channel = getMessagingChannel();
  log.info({ channel: channel.kind, ready: channel.isReady() }, "Starting messaging channel");
  await channel.startReceiving(handler);
}
