/**
 * Telegram long-poll runner for LOCAL development.
 *
 * Lets you test the bot by DMing it directly — no public HTTPS webhook/tunnel
 * needed. In production use the /webhook/telegram route + setWebhook instead.
 *
 *   npm run dev:telegram
 *
 * Requires TELEGRAM_BOT_TOKEN in .env. Deletes any existing webhook first
 * (getUpdates and a webhook are mutually exclusive in the Telegram API).
 */
import "dotenv/config";
import { getUpdates, deleteWebhook, telegramConfigured } from "./client.js";
import { handleTelegramUpdate } from "../../gateway/telegram.js";
import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("telegram-poller");

async function main(): Promise<void> {
  if (!telegramConfigured()) {
    log.error("TELEGRAM_BOT_TOKEN is not set — cannot start poller");
    process.exit(1);
  }

  await deleteWebhook().catch(() => null);
  log.info("Telegram poller started — DM your bot to test");

  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const updates = await getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        await handleTelegramUpdate(update).catch((err: unknown) =>
          log.error(err, "Failed handling update"),
        );
      }
    } catch (err) {
      log.error(err, "getUpdates failed — backing off 3s");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

void main();
