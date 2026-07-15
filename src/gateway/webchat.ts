import { Router } from "express";
import type { Request, Response } from "express";
import { processInbound, escalateUser, type InboundChannel } from "./inbound.js";
import { pushToWeb, drainWeb } from "../adapters/web/bus.js";
import { upsertUserPrefs } from "../db/proxy-client.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("webchat");

type Lang = "en" | "zh" | "ms" | "ta";
const LANGS = new Set<Lang>(["en", "zh", "ms", "ta"]);
const asLang = (v: unknown): Lang => (typeof v === "string" && LANGS.has(v as Lang) ? (v as Lang) : "en");

/**
 * InboundChannel backed by the browser's short-poll bus. Anything the backend "sends"
 * to the citizen (escalation confirmation, bot answers, close notices) is pushed onto
 * the per-session bus and drained by GET /webchat/:sessionId/poll. Buttons/voice/edits
 * have no web equivalent — buttons collapse to their label text, the rest are no-ops.
 */
export function makeWebChannel(sessionId: string): InboundChannel {
  return {
    prefix: "web",
    send: async (text) => { pushToWeb(sessionId, { from: "system", text }); },
    sendWithButtons: async (text, buttons) => {
      const labels = buttons.flat().map((b) => b.label).join(" · ");
      pushToWeb(sessionId, { from: "system", text: labels ? `${text}\n\n${labels}` : text });
    },
    typing: async () => { /* no native typing indicator on web */ },
  };
}

const router = Router();

// POST /webchat/:sessionId/connect — citizen tapped "Talk to a CPF officer" in the portal
// chatbot. Body: { conversationHistory: [{role,content}], language }. Carries the widget
// conversation into the escalation so the officer dashboard opens with real context.
router.post("/:sessionId/connect", async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId!;
  const body = req.body as { conversationHistory?: Array<{ role?: string; content?: string }>; language?: string };
  const userId = `web:${sessionId}`;
  const lang = asLang(body.language);

  // Persist language + a friendly display name so officer replies are translated back
  // and the dashboard shows a real label instead of a derived one.
  await upsertUserPrefs({
    userId,
    preferred_lang: lang,
    display_name: "Text Us user",
    voice_enabled: false,
    speech_rate: 1.0,
    accessibility_mode: "standard",
  }).catch(() => null);

  const seedHistory = (body.conversationHistory ?? [])
    .filter((m) => m?.content?.trim())
    .map((m) => ({ role: m.role === "user" ? "user" : "agent", content: String(m.content) }));

  log.info({ userId, seeded: seedHistory.length, lang }, "Web chat connect → escalating to officer");
  await escalateUser(makeWebChannel(sessionId), userId, seedHistory).catch((err: unknown) => {
    log.error(err, "Web escalation failed");
  });

  res.json({ ok: true, userId });
});

// POST /webchat/:sessionId — a citizen message from the Text Us page. Runs the shared
// inbound pipeline; with an active case it relays straight to the assigned officer.
router.post("/:sessionId", async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId!;
  const text = (req.body as { text?: string })?.text?.trim();
  if (!text) { res.status(400).json({ error: "text required" }); return; }

  void processInbound(makeWebChannel(sessionId), { userKey: sessionId, text }).catch((err: unknown) => {
    log.error(err, "Web inbound processing failed");
  });

  res.json({ ok: true });
});

// GET /webchat/:sessionId/poll?since=<cursor> — short-poll for officer/system messages.
router.get("/:sessionId/poll", (req: Request, res: Response) => {
  const sessionId = req.params.sessionId!;
  const since = Number.parseInt(String(req.query.since ?? "0"), 10) || 0;
  const { messages, cursor } = drainWeb(sessionId, since);
  res.json({ messages, cursor });
});

export { router as webchatRoutes };
