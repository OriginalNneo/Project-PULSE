import type { InboundChannel } from "./inbound.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("thinking");

/**
 * "Thinking" indicator for the messaging bot, so the citizen knows the assistant
 * is working on a reply during the (often 30–90s) LLM/query pipeline wait.
 *
 * A 💭 dot hops left → right across three slots, editing ONE message bubble in
 * place every ~2s. When the answer is ready the caller edits that SAME bubble
 * into the final reply — no extra bubbles. On channels that can't edit (e.g.
 * WhatsApp) it degrades to the native "typing…" action only.
 *
 *   💭 ●　·　·   →   💭 ·　●　·   →   💭 ·　·　●   →  (loops)
 *
 * Design notes (this runs on the live hot path):
 * - Interval is ~2s — Telegram allows ~1 edit/sec per chat; 600ms would 429 and
 *   could starve the actual answer (which is also an edit to the same chat).
 * - Every Telegram call is best-effort (.catch) — an animation glitch must never
 *   drop or delay the real reply.
 * - The animation has an absolute max lifetime: even if stop() is never reached
 *   (an exception or a hung pipeline), the timers self-clear so a setInterval can
 *   never edit a message forever.
 */
const FRAMES = [
  "💭 ●　·　·",
  "💭 ·　●　·",
  "💭 ·　·　●",
];
const FRAME_INTERVAL_MS = 2000;
const TYPING_REFRESH_MS = 4000;
const MAX_LIFETIME_MS = 120_000; // safety net — never animate longer than this

export interface ThinkingHandle {
  /** Channel message id of the animated bubble to edit into the answer, or null. */
  messageId: string | null;
  /**
   * Stop all timers AND await the last dispatched frame edit to settle, so the
   * caller's final answer-edit is guaranteed to be the last write to the bubble
   * (otherwise a late in-flight frame can overwrite the answer → stuck on a dot).
   * Idempotent; always safe to call (incl. multiple times).
   */
  stop: () => Promise<void>;
}

export async function startThinking(channel: InboundChannel): Promise<ThinkingHandle> {
  const timers: NodeJS.Timeout[] = [];
  let stopped = false;
  // Tracks the most recently dispatched frame edit (never rejects — edits .catch).
  let inFlight: Promise<unknown> = Promise.resolve();
  const stop = async (): Promise<void> => {
    if (!stopped) {
      stopped = true;
      for (const t of timers) clearInterval(t);
      clearTimeout(safety);
    }
    await inFlight; // ensure no frame edit lands after the answer edit
  };
  // Absolute safety net: self-terminate even if stop() is never called.
  const safety = setTimeout(() => { void stop(); }, MAX_LIFETIME_MS);

  // Native typing indicator (rate-safe), shown regardless of edit support.
  // Best-effort: swallow failures so an animation glitch never bubbles up.
  if (channel.typing) {
    void channel.typing().catch(() => {});
    timers.push(setInterval(() => { if (!stopped) void channel.typing?.().catch(() => {}); }, TYPING_REFRESH_MS));
  }

  // Without in-place editing we can only offer the typing action.
  if (!channel.sendForEdit || !channel.editMessage) {
    return { messageId: null, stop };
  }

  let messageId: string | null = null;
  try {
    messageId = await channel.sendForEdit(FRAMES[0]!, false);
  } catch (err) {
    log.warn({ err: (err as Error).message }, "thinking anchor failed — continuing without dot animation");
  }
  if (!messageId) return { messageId: null, stop };

  let frame = 0;
  timers.push(setInterval(() => {
    if (stopped) return;
    frame = (frame + 1) % FRAMES.length;
    // Record the dispatched edit so stop() can await it (ordering guarantee).
    inFlight = channel.editMessage!(messageId!, FRAMES[frame]!, undefined, false).catch(() => {});
  }, FRAME_INTERVAL_MS));

  return { messageId, stop };
}
