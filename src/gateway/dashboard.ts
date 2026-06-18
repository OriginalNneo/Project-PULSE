import { Router } from "express";
import type { Request, Response } from "express";

// ── In-memory ring buffer for recent emotion events ───────────────────────────
// Holds the last 100 emotion readings so the dashboard has history on first load.
export interface EmotionEvent {
  userId: string;
  channel: string;
  emotion_label: string;
  emotion_score: number;
  message_preview: string;
  ts: string;
}

const EMOTION_RING_SIZE = 100;
const _emotionRing: EmotionEvent[] = [];

export function pushEmotionEvent(evt: EmotionEvent): void {
  _emotionRing.unshift(evt);
  if (_emotionRing.length > EMOTION_RING_SIZE) _emotionRing.length = EMOTION_RING_SIZE;
}

export function getEmotionFeed(): EmotionEvent[] {
  return [..._emotionRing];
}

/** Return the most recent emotion event for a specific userId, or null if none. */
export function getLatestEmotionForUser(userId: string): EmotionEvent | null {
  return _emotionRing.find((e) => e.userId === userId) ?? null;
}
import { getQueue, getQueueEntry, getQueueStats, resolveQueueEntry } from "../db/proxy-client.js";
import { setOfficerStatus, listOfficers, type OfficerStatus } from "../dashboard/officer.js";
import { notifyCaseResolved } from "../dashboard/notify.js";
import { broadcast } from "./ws.js";
import { sendWhatsAppMessage } from "../adapters/twilio/client.js";
import { translateText } from "../python-bridge/client.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("dashboard");
const router = Router();

// GET /dashboard/emotion-feed — last 100 emotion readings (ring buffer)
router.get("/emotion-feed", (_req: Request, res: Response) => {
  res.json(getEmotionFeed());
});

// GET /dashboard/queue — full queue sorted by priority + live stats
router.get("/queue", async (_req: Request, res: Response) => {
  const [queue, stats] = await Promise.all([
    getQueue().catch(() => []),
    getQueueStats().catch(() => ({ waiting: 0, avg_wait_minutes: 0 })),
  ]);
  res.json({ queue, stats });
});

// GET /dashboard/queue/:queueId — single case with full chat history
router.get("/queue/:queueId", async (req: Request, res: Response) => {
  const entry = await getQueueEntry(req.params.queueId!).catch(() => null);
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }
  res.json(entry);
});

// POST /dashboard/officer/status — officer sets themselves available/busy/break
router.post("/officer/status", async (req: Request, res: Response) => {
  const { officerId, status } = req.body as { officerId?: string; status?: string };
  if (!officerId || !status) { res.status(400).json({ error: "officerId and status required" }); return; }
  const validStatuses = ["available", "busy", "break"];
  if (!validStatuses.includes(status)) { res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` }); return; }
  const state = await setOfficerStatus(officerId, status as OfficerStatus);
  res.json(state);
});

// GET /dashboard/officers — all connected officers and their status
router.get("/officers", (_req: Request, res: Response) => {
  res.json(listOfficers());
});

// POST /dashboard/send/:queueId — officer sends a message back to the user (Telegram or WhatsApp)
// Body: { message: string, officerId: string }
router.post("/send/:queueId", async (req: Request, res: Response) => {
  const { message, officerId } = req.body as { message?: string; officerId?: string };
  if (!message || !officerId) { res.status(400).json({ error: "message and officerId required" }); return; }

  const entry = await getQueueEntry(req.params.queueId!).catch(() => null);
  if (!entry) { res.status(404).json({ error: "Queue entry not found" }); return; }

  // Translate officer's English message to user's language
  let outboundText = message;
  if (entry.preferred_lang !== "en") {
    const t = await translateText(message, "en", entry.preferred_lang).catch(() => null);
    if (t) outboundText = t.translated_text;
  }

  if (entry.userId.startsWith("tg:")) {
    // Telegram user — send via Bot API
    const chatId = parseInt(entry.userId.slice(3), 10);
    const { sendTelegramMessage } = await import("../adapters/telegram/client.js");
    await sendTelegramMessage(chatId, outboundText);
    log.info({ queueId: req.params.queueId, officerId, chatId }, "Officer message sent to Telegram user");
  } else if (entry.userId.startsWith("wa:")) {
    // WhatsApp user — send via Twilio
    const phoneNumber = entry.userId.slice(3);
    await sendWhatsAppMessage(phoneNumber, outboundText);
    log.info({ queueId: req.params.queueId, officerId, to: phoneNumber }, "Officer message sent to WhatsApp user");
  } else {
    res.status(400).json({ error: "Unsupported channel for this queue entry" });
    return;
  }

  // Echo the sent message to all dashboard clients so other tabs stay in sync
  broadcast("officer_message", {
    queueId: req.params.queueId,
    officerId,
    original_message: message,
    translated_message: outboundText,
    target_lang: entry.preferred_lang,
    ts: new Date().toISOString(),
  });

  res.json({ ok: true, translated_message: outboundText });
});

// PATCH /dashboard/resolve/:queueId — officer marks case as resolved
router.patch("/resolve/:queueId", async (req: Request, res: Response) => {
  const { officerId } = req.body as { officerId?: string };
  if (!officerId) { res.status(400).json({ error: "officerId required" }); return; }

  const entry = await resolveQueueEntry(req.params.queueId!).catch(() => null);
  if (!entry) { res.status(404).json({ error: "Not found" }); return; }

  notifyCaseResolved(req.params.queueId!);

  // Notify user on WhatsApp that their case is resolved
  const phoneNumber = entry.userId.startsWith("wa:") ? entry.userId.slice(3) : null;
  if (phoneNumber) {
    let closeMsg = "Your CPF query has been resolved. Thank you for contacting us. If you have more questions, feel free to message us again.";
    if (entry.preferred_lang !== "en") {
      const t = await translateText(closeMsg, "en", entry.preferred_lang).catch(() => null);
      if (t) closeMsg = t.translated_text;
    }
    await sendWhatsAppMessage(phoneNumber, closeMsg).catch(() => null);
  }

  res.json({ ok: true });
});

export { router as dashboardRoutes };
