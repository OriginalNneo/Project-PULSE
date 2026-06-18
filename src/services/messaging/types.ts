/**
 * Messaging channel abstraction — the swappable transport that carries
 * officer escalations out to the citizen and brings their replies back in.
 *
 * Telegram is the concrete channel today (prototype); WhatsApp is a stub that
 * implements the same interface for the live rollout. The active one is chosen
 * by MESSAGING_CHANNEL in the integration config, so the rest of the system
 * (chatbot, escalation, officer console) never names a vendor.
 */

export interface OutboundMessage {
  /** Channel-native recipient id (Telegram chat id / WhatsApp phone number). */
  to: string;
  text: string;
}

export interface InboundMessage {
  /** Channel-native sender id. */
  from: string;
  /** Best-effort display name from the channel. */
  fromName?: string;
  text: string;
  /** Channel-native message id, for de-duplication. */
  messageId: string;
  receivedAt: string;
}

export type InboundHandler = (message: InboundMessage) => Promise<void> | void;

export interface SendResult {
  ok: boolean;
  error?: string;
  /** Channel-native id of the sent message, when the channel supports editing. */
  messageId?: string;
}

export interface MessagingChannel {
  /** "telegram" | "whatsapp". */
  readonly kind: string;
  /** Whether credentials are present for live sends. */
  isReady(): boolean;
  /** Send a message to a citizen on this channel. */
  send(message: OutboundMessage): Promise<SendResult>;
  /**
   * Edit a previously sent message in place (used for live "thinking"
   * animations that resolve into the final answer). Channels that cannot edit
   * may no-op and return { ok: false }.
   */
  editMessage?(to: string, messageId: string, text: string): Promise<SendResult>;
  /** True if this channel supports editMessage (Telegram does, WhatsApp doesn't). */
  readonly canEdit?: boolean;
  /**
   * Start receiving inbound messages. For Telegram in dev this begins long
   * polling; for webhook-based channels it's a no-op (see handleWebhook).
   */
  startReceiving(handler: InboundHandler): Promise<void>;
  /** Stop receiving (clean shutdown). */
  stopReceiving(): Promise<void>;
  /**
   * Process a webhook payload (production push model). Returns parsed inbound
   * messages so the route can ack quickly. Optional — polling channels ignore.
   */
  handleWebhook?(body: unknown): Promise<InboundMessage[]>;
}
