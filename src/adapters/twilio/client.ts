import { createHmac } from "crypto";
import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("twilio");

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
// Your Twilio sandbox/production number, e.g. whatsapp:+14155238886
const FROM_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER ?? "";

export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<void> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    log.warn("Twilio credentials not configured — message not sent");
    return;
  }

  const to = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;

  const params = new URLSearchParams({ To: to, From: FROM_NUMBER, Body: body });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error({ status: res.status, to, twilio: text }, "Twilio send failed");
    throw new Error(`Twilio returned ${res.status}`);
  }

  log.info({ to }, "WhatsApp message sent");
}

// Verify Twilio webhook signature (HMAC-SHA1 over url + sorted POST params)
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!AUTH_TOKEN) return false;

  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");

  const expected = createHmac("sha1", AUTH_TOKEN)
    .update(url + sorted)
    .digest("base64");

  return expected === signature;
}
