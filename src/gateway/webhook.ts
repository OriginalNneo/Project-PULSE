import { Router } from "express";
import type { Request, Response } from "express";
import { sendWhatsAppMessage, verifyTwilioSignature } from "../adapters/twilio/client.js";
import { processInbound, type InboundChannel } from "./inbound.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("webhook");
const router = Router();

// Twilio sends form-encoded bodies — express.urlencoded() must be mounted before this router
router.post("/whatsapp", (req: Request, res: Response) => {
  // Respond immediately with empty TwiML so Twilio doesn't time out
  res.set("Content-Type", "text/xml").send("<Response></Response>");

  // Process asynchronously after Twilio receives the 200
  void handleInbound(req).catch((err: unknown) => {
    log.error(err, "Inbound WhatsApp processing failed");
  });
});

async function handleInbound(req: Request): Promise<void> {
  const body = req.body as Record<string, string>;

  // Verify signature in production
  if (process.env.NODE_ENV === "production") {
    const signature = (req.headers["x-twilio-signature"] as string) ?? "";
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    if (!verifyTwilioSignature(signature, url, body)) {
      log.warn("Rejected request with invalid Twilio signature");
      return;
    }
  }

  const phoneNumber = (body["From"] ?? "").replace("whatsapp:", "");   // whatsapp:+6512345678
  const messageText = (body["Body"] ?? "").trim();
  if (!phoneNumber || !messageText) return;

  const channel: InboundChannel = {
    prefix: "wa",
    send: (text) => sendWhatsAppMessage(phoneNumber, text),
  };
  await processInbound(channel, { userKey: phoneNumber, text: messageText });
}

export { router as webhookRoutes };
