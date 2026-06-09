import { createServiceLogger } from "../../shared/logger.js";
import type { MessagingChannel } from "./types.js";

const log = createServiceLogger("messaging.thinking");

/**
 * "Bouncing balls" thinking animation for channels that can edit messages
 * (Telegram). A single ball hops across three positions, editing ONE message in
 * place every ~600ms while the AI reasons. When the answer is ready the same
 * message is edited to the final text — no extra bubbles.
 *
 * Frames (● = ball up, · = resting):
 *   ●  ·  ·   →   ·  ●  ·   →   ·  ·  ●   →   ·  ●  ·   →  (loops)
 */
const FRAMES = [
  "💭  ●  ·  ·",
  "💭  ·  ●  ·",
  "💭  ·  ·  ●",
  "💭  ·  ●  ·",
];
const FRAME_INTERVAL_MS = 600;

/**
 * Runs `work` while showing the bouncing-balls animation, then edits the bubble
 * to the result. Returns the final text that was delivered. If the channel
 * can't edit, it just sends a static "thinking" note, runs the work, and sends
 * the answer as a normal message.
 */
export async function withThinkingAnimation(
  channel: MessagingChannel,
  to: string,
  work: () => Promise<string>,
): Promise<void> {
  // Fallback for non-editing channels (e.g. WhatsApp): no in-place animation.
  if (!channel.canEdit || !channel.editMessage) {
    const answer = await work();
    await channel.send({ to, text: answer });
    return;
  }

  // 1. Send the first frame to anchor a message we can edit.
  const sent = await channel.send({ to, text: FRAMES[0]! });
  if (!sent.ok || !sent.messageId) {
    // Couldn't anchor — just run the work and send the answer plainly.
    const answer = await work();
    await channel.send({ to, text: answer });
    return;
  }
  const messageId = sent.messageId;

  // 2. Start the animation loop concurrently with the work.
  let animating = true;
  let frame = 0;
  const loop = (async () => {
    // Skip the first frame (already shown); advance from frame 1.
    while (animating) {
      await sleep(FRAME_INTERVAL_MS);
      if (!animating) break;
      frame = (frame + 1) % FRAMES.length;
      await channel.editMessage!(to, messageId, FRAMES[frame]!).catch(() => {});
    }
  })();

  // 3. Await the real work, then stop the animation and reveal the answer.
  let answer: string;
  try {
    answer = await work();
  } catch (error) {
    animating = false;
    await loop;
    log.warn({ err: (error as Error).message }, "Thinking work failed");
    await channel.editMessage!(to, messageId, "Sorry, something went wrong. Please try again.").catch(() => {});
    return;
  }

  animating = false;
  await loop;
  // Final edit: the bubble becomes the answer in place.
  const edited = await channel.editMessage!(to, messageId, answer);
  if (!edited.ok) {
    // If the edit failed (e.g. message too old), fall back to a fresh send.
    await channel.send({ to, text: answer });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
