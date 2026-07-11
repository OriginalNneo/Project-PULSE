import { createHmac, timingSafeEqual } from "crypto";
import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("meta-whatsapp");

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const APP_SECRET      = process.env.WHATSAPP_APP_SECRET ?? "";
const API_VERSION     = "v21.0";

export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<void> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    log.warn("Meta WhatsApp credentials not configured — message not sent");
    return;
  }

  // appsecret_proof = HMAC-SHA256(access_token, app_secret)
  const proof = createHmac("sha256", APP_SECRET).update(ACCESS_TOKEN).digest("hex");

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages?appsecret_proof=${proof}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone.replace(/^\+/, ""),
        type: "text",
        text: { body },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error({ status: res.status, to: toPhone, meta: text }, "Meta WhatsApp send failed");
    throw new Error(`Meta WhatsApp returned ${res.status}`);
  }

  log.info({ to: toPhone }, "WhatsApp message sent via Meta");
}

// Verify Meta webhook signature (X-Hub-Signature-256)
export function verifyMetaSignature(rawBody: Buffer, header: string): boolean {
  if (!APP_SECRET || !header) return false;
  const expected = "sha256=" + createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}
