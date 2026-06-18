import { createServiceLogger } from "../../shared/logger.js";
import { handleChatMessage } from "../chatbot/service.js";
import { findSessionByChannelUser } from "../chatbot/repository.js";
import { getMessagingChannel } from "./index.js";
import { withThinkingAnimation } from "./thinkingAnimator.js";
import type { InboundMessage } from "./types.js";

const log = createServiceLogger("messaging.inbound");

/**
 * Single inbound handler for the active messaging channel. A citizen message
 * from Telegram/WhatsApp is run through the chatbot pipeline; the chatbot's
 * reply (or escalation acknowledgement) is sent straight back on the same
 * channel. If the session is already with an officer, the chatbot service
 * records the turn and stays quiet so the officer owns the conversation.
 */
export async function handleInboundMessage(message: InboundMessage): Promise<void> {
  const channel = getMessagingChannel();
  const channelKind = channel.kind === "whatsapp" ? "whatsapp" : "telegram";

  log.info({ from: message.from, channel: channelKind }, "Inbound citizen message");

  const existing = await findSessionByChannelUser(channelKind, message.from);

  // Show a live "thinking" animation while the chatbot reasons (it can take a
  // while with a reasoning model). The animation edits one message in place and
  // then becomes the reply — so the citizen sees activity, not silence.
  await withThinkingAnimation(channel, message.from, async () => {
    const result = await handleChatMessage({
      sessionId: existing?.sessionId,
      channel: channelKind,
      channelUserId: message.from,
      displayName: message.fromName,
      message: message.text,
    });
    return result.reply || "…";
  });
}
