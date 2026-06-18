import { Router, type Request, type Response } from "express";
import { getIntegrationConfig } from "../../config/integration.js";
import { getMessagingChannel } from "./index.js";
import { handleInboundMessage } from "./inbound.js";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  const channel = getMessagingChannel();
  res.json({ status: "ok", service: "messaging", channel: channel.kind, ready: channel.isReady() });
});

/**
 * Webhook for production push delivery (Telegram webhook mode / WhatsApp Cloud
 * API). In dev, Telegram long-polls instead, so this is unused — but it keeps
 * both delivery models supported behind the same channel interface.
 *
 * GET is the WhatsApp webhook verification handshake (hub.challenge).
 */
router.get("/webhook", (req: Request, res: Response) => {
  const { whatsapp } = getIntegrationConfig();
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === whatsapp.verifyToken) {
    res.status(200).send(String(challenge ?? ""));
    return;
  }
  res.sendStatus(403);
});

router.post("/webhook", async (req: Request, res: Response) => {
  const channel = getMessagingChannel();
  // Ack immediately; process asynchronously so the provider doesn't retry.
  res.sendStatus(200);
  if (!channel.handleWebhook) return;
  try {
    const messages = await channel.handleWebhook(req.body);
    for (const message of messages) {
      await handleInboundMessage(message);
    }
  } catch {
    /* logged inside the handler */
  }
});

export { router as messagingRoutes };
