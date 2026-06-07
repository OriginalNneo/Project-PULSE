import { Router } from "express";
import type { Request, Response } from "express";
import { getQueue, getQueueEntry, getQueueStats, resolveQueueEntry } from "../db/proxy-client.js";
import { setOfficerStatus, listOfficers, type OfficerStatus } from "../dashboard/officer.js";
import { notifyCaseResolved } from "../dashboard/notify.js";
import { broadcast } from "./ws.js";
import { sendWhatsAppMessage } from "../adapters/twilio/client.js";
import { translateText } from "../python-bridge/client.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("dashboard");
const router = Router();

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

// POST /dashboard/send/:queueId — officer sends a message to the WhatsApp user
// Body: { message: string, officerId: string }
router.post("/send/:queueId", async (req: Request, res: Response) => {
  const { message, officerId } = req.body as { message?: string; officerId?: string };
  if (!message || !officerId) { res.status(400).json({ error: "message and officerId required" }); return; }

  const entry = await getQueueEntry(req.params.queueId!).catch(() => null);
  if (!entry) { res.status(404).json({ error: "Queue entry not found" }); return; }
  if (entry.assigned_officer !== officerId) {
    res.status(403).json({ error: "Officer not assigned to this case" });
    return;
  }

  // Derive phone number from userId (format: wa:+6512345678)
  const phoneNumber = entry.userId.startsWith("wa:") ? entry.userId.slice(3) : null;
  if (!phoneNumber) { res.status(400).json({ error: "Queue entry is not a WhatsApp user" }); return; }

  // Translate officer's English message to user's language
  let outboundText = message;
  if (entry.preferred_lang !== "en") {
    const t = await translateText(message, "en", entry.preferred_lang).catch(() => null);
    if (t) outboundText = t.translated_text;
  }

  await sendWhatsAppMessage(phoneNumber, outboundText);

  // Echo the sent message to all dashboard clients so other tabs stay in sync
  broadcast("officer_message", {
    queueId: req.params.queueId,
    officerId,
    original_message: message,
    translated_message: outboundText,
    target_lang: entry.preferred_lang,
    ts: new Date().toISOString(),
  });

  log.info({ queueId: req.params.queueId, officerId, to: phoneNumber }, "Officer message sent to WhatsApp user");
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
    let closeMsg = "Your CPF query has been resolved. Thank you for contacting us. Call 1800-227-1188 if you need further help.";
    if (entry.preferred_lang !== "en") {
      const t = await translateText(closeMsg, "en", entry.preferred_lang).catch(() => null);
      if (t) closeMsg = t.translated_text;
    }
    await sendWhatsAppMessage(phoneNumber, closeMsg).catch(() => null);
  }

  res.json({ ok: true });
});

export { router as dashboardRoutes };
