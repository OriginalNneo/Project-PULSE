# POST — Power-On Self-Test (Backend)

A repeatable startup self-test for the PULSE backend. **Run it every time the backend is started or restarted.** It verifies the whole live path — backend, logs, frontend, backend↔frontend, the dashboard WebSocket, and Telegram — and auto-repairs the two failure modes that have actually bitten us (stale duplicate sessions, and a Telegram webhook missing `callback_query`).

```bash
npm run post
```

Exit `0` = all critical checks passed. Exit `1` = at least one **FAIL**. **WARN** never fails the run (optional/non-critical checks, e.g. public URL or an unset officer chat id).

Config is overridable via env: `POST_BACKEND` (`http://127.0.0.1:3000`), `POST_FRONTEND` (`http://127.0.0.1:3001`), `POST_PUBLIC` (`https://pulse.nathanielbuilds.cc`), `POST_PM2_BACKEND` (`pulse-backend`), `POST_ERRLOG`.

## Protocol

| Phase | Check | Fail/Warn |
| :-- | :-- | :-- |
| **0 — Stale-session guard** | Kill non-pm2 dev strays (`tsx watch …gateway`, `concurrently …dev:backend`, `next dev`) that would hold `:3000`/`:3001`. pm2 uses `npx tsx …index.ts` (no watch) + `next start`, so those are never touched. Captures error-log size for Phase 2. | — |
| **1 — Start & health** | `pm2 restart pulse-backend`; poll `GET /health/live` until `200` (≤30s). | FAIL if no 200 |
| **2 — Log integrity** | Scan **only the bytes appended since the restart** for `Error`/`ERR_`/`EADDRINUSE`/`Cannot find module`. Stale historical errors are ignored (the trap from 2026-06-18). | FAIL on fresh errors |
| **3 — Frontend** | `GET :3001/dashboard` == 200; `GET <public>/dashboard` == 200. (The officer console is the `/dashboard` page — there is no `/officer` route.) | FAIL local; WARN public |
| **4 — Backend ↔ Frontend** | Through the Next proxy: `GET :3001/api/v1/adaptive-local/health` returns valid JSON (`status: "ok"`). (Was `/api/v1/officer/dashboard` until the dead officer surface was deleted.) | FAIL |
| **5 — Dashboard live channel** | WebSocket `ws://127.0.0.1:3000/dashboard/ws` opens. | FAIL |
| **6 — Telegram** | `getMe` (token valid). `getWebhookInfo` **must list `callback_query`** — if missing, **auto re-register** the webhook with `["message","edited_message","callback_query"]`. If `TELEGRAM_OFFICER_CHAT_ID` set, send a self-test message and confirm `message_id`. | FAIL getMe / webhook repair; WARN send |
| **7 — Verdict** | PASS/WARN/FAIL tally; exit code. | — |
| **8 — Docs** | Reminder to update `CONTEXT.md` / `AGENTS.md` / `MEMORY.md` for any change. | — |

## Why these checks exist (lessons baked in)

- **Phase 0** — a failed manual `npm run dev` left a `tsx watch` holding `:3000`, causing EADDRINUSE on the pm2 process.
- **Phase 2** — a 3-hour-old `llmClient` crash sat in the error log and *looked* live; timestamp/byte-delta scoping avoids that false alarm.
- **Phase 6** — the escalation **"Connect to CPF Officer" button silently failed** because the webhook was registered with `allowed_updates: ["message"]` only, so Telegram dropped `callback_query` (button) updates. POST detects and repairs this.

## Notes
- A bot **cannot DM itself**; the Telegram functional proof is `getMe` + a confirmed outbound `sendMessage` to `TELEGRAM_OFFICER_CHAT_ID` (set it in `.env` to enable that check).
- Running POST **restarts the backend** (Phase 1) — expected, it's the "power-on" in power-on self-test.
