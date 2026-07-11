import { Router } from "express";
import type { Request, Response } from "express";
import { sendWhatsAppMessage, verifyMetaSignature } from "../adapters/meta/client.js";
import { processInbound, type InboundChannel } from "./inbound.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("webhook");
const router = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "";

// ── GET /webhook/whatsapp — Meta webhook verification handshake ──────────────
router.get("/whatsapp", (req: Request, res: Response) => {
  const mode      = req.query["hub.mode"] as string;
  const token     = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    log.info("Meta WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    log.warn({ mode, token }, "Meta webhook verification failed");
    res.sendStatus(403);
  }
});

// ── POST /webhook/whatsapp — incoming messages from Meta ─────────────────────
router.post("/whatsapp", (req: Request, res: Response) => {
  const sig     = (req.headers["x-hub-signature-256"] as string) ?? "";
  const rawBody = (req as any).rawBody as Buffer | undefined;

  if (!rawBody || !verifyMetaSignature(rawBody, sig)) {
    log.warn("Meta webhook rejected: invalid signature");
    res.sendStatus(401);
    return;
  }

  // Acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  void handleInbound(req.body).catch((err: unknown) => {
    log.error(err, "Inbound WhatsApp processing failed");
  });
});

async function handleInbound(payload: any): Promise<void> {
  const entry   = payload?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value   = changes?.value;

  // Ignore status updates (delivered, read receipts, etc.)
  if (!value?.messages?.length) return;

  const message     = value.messages[0];
  const phoneNumber = message.from as string;   // e.g. "6591234567"
  const messageText = (message.text?.body ?? "").trim();

  if (!phoneNumber || !messageText) return;

  const channel: InboundChannel = {
    prefix: "wa",
    send: (text) => sendWhatsAppMessage(phoneNumber, text),
  };

  await processInbound(channel, { userKey: phoneNumber, text: messageText });
}

export { router as webhookRoutes };
