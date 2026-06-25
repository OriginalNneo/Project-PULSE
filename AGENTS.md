# Project PULSE — Workspace Instructions for Hermes

## Project Overview
- **Name**: PULSE — People-centric Framework for Correspondence (PFC)
- **Purpose**: Transform Singapore government correspondence into adaptive, inclusive, accessible communications for vulnerable citizens
- **Location**: /nat/Project-PULSE/
- **Status**: Live Telegram CPF assistant — RAG answers grounded in MongoDB CPF knowledge, interactive guiding questions, government-standard concise formatting, native-language generation (+ GLM translation fallback), emotion-driven tone adaptation, CCU officer escalation, and CSAT rating + session lifecycle — running on top of the scaffolded multi-service architecture. (OpenClaw domain/language/dialect agent stubs, glossaries, external adapters, CI/CD still pending.)

## Architecture
- **Backend**: Node.js/Express (TypeScript), 9 microservices behind API Gateway
- **Frontend**: React/Next.js, 9 pages, WCAG 2.2 AA compliant
- **Database**: PostgreSQL 14+ (schema-per-service), Redis 7+, Kafka
- **Auth**: Singpass/Corppass, JWT in httpOnly cookies
- **AI**: OpenClaw multi-agent framework with Orchestrator → Domain → Language/Dialect → Accessibility → Guardian pipeline
- **Security**: 4-ring model (Edge → API Gateway → Services → Data)

## Service Catalogue
Correspondence | Vulnerability | Orchestration | Adaptation | Delivery | Notification | Proxy | Analytics | Auth | Billing

## Agent System
- 5 Domain Agents: Financial, Healthcare, Housing, Employment, Legal
- 4 Language Agents: English, Chinese, Malay, Tamil
- 12 Dialect Agents: Hokkien, Cantonese, Teochew, Hakka, Hainanese, Bazaar Melayu, Javanese, Singapore Tamil, Spoken Tamil, Malayalam, Punjabi, Hindi
- Accessibility Agent (readability, simplification, TTS)
- Guardian Agent (scam detection, PII scrubbing)

## Key Files
- `CONTEXT.md` — Full project reference
- `AGENT_ARCHITECTURE.md` — AI agent system spec
- `README.md` — Complete documentation
- `src/gateway/index.ts` — API Gateway entry point
- `src/agents/orchestrator/agent.ts` — Main orchestrator routing logic
- `src/agents/orchestrator/router.ts` — Intent classification + language detection

## Conventions
- TypeScript strict mode, path aliases (`@shared/*`, `@agents/*`)
- Zod validation on all endpoints
- Structured JSON logging (never log PII)
- API versioning: `/api/v1/...`, breaking changes = new version
- Idempotent event consumers
- Circuit breakers on all inter-service calls (2s timeout)

## What to Prioritize
When working on PULSE code:
1. Accessibility first — WCAG 2.2 AA, plain language, large text
2. Multi-language support — all 4 official languages + dialects
3. Security — no secrets in code, PII protection, scam resistance
4. Vulnerability awareness — self-service, guided, high-touch tiers

## Documentation Discipline
After **every** code change, keep the docs in sync — update all three:
- `CONTEXT.md` — consolidated project reference (behaviour, flows, endpoints)
- `AGENTS.md` — this file (conventions, architecture, agent instructions)
- `MEMORY.md` — assistant auto-memory index (`/root/.claude/projects/-nat-Project-PULSE/memory/`)

## Backend Startup (POST)
Whenever the backend is started or restarted, run the Power-On Self-Test:
```bash
npm run post        # → scripts/post.sh, protocol in POST.md
```
- **Do not declare the backend "up"/"working" until POST exits 0** (all critical checks pass).
- POST auto-clears stale duplicate dev sessions before starting, scans only *fresh* log output, verifies the frontend + backend↔frontend proxy + the `/dashboard/ws` WebSocket, and checks Telegram (`getMe` + that the webhook allows `callback_query` — auto-repairs it if not, since a webhook without `callback_query` silently breaks the escalation button).
- If POST reports a FAIL, fix it before continuing. See `POST.md` for the full protocol and the lessons each check encodes.

## Telegram Guiding Questions
Broad (triage **Category 2**) Telegram questions on a topic that has a curated guiding set are answered interactively: the bot asks short questions **one at a time**, then synthesises a tailored answer from the user's replies. See CONTEXT.md → "Guiding Questions" for the full flow.
- **Curated, not generated.** Sets live in `data/cpf-guiding-questions.json` → seeded into the `cpf_guiding_questions` collection by `npm run db:seed`.
- **Topic key drift (gotcha).** The knowledge store's `sectionKey` vocabulary differs across environments (committed seed file uses `retirement-income`/`growing-savings`/`home-ownership`; the live Atlas uses `retirement`/`topups`/`housing`). Each guiding set therefore carries an `aliases` list so it matches **either** vocabulary. If you add a topic, set `topicKey` to the seed-file key and add the live-Atlas key to `aliases` — verify with `findGuidingSetForQuery`.
- **Trigger depends on triage.** Cat-2 regexes in `src/agents/triage/classifier.ts` are brittle on word order; when adding a guided topic, extend/verify `CAT2_PATTERNS` for its natural phrasings and trace each through `classifyQuery`.
- **State** (`pendingGuiding`) lives in the in-memory `UserPrefs` like `pendingOfficerOffer` — it does **not** survive a backend restart.
- Questions are **≤2 sentences, asked immediately** (no preamble; Q1 reclaims the 💭 bubble). Choice → buttons; open → inline `(for example: …)`. See CONTEXT.md → "Message formatting".

## Message formatting & language
Bot answers follow a government content standard (GOV.UK + Singapore SGDS): front-loaded, ≤25-word sentences, no walls of text, scannable bullets, plain words, one leading emoji. **Concision is enforced at GENERATION** in `BASE_SYSTEM_PROMPT` (`src/agents/query/agent.ts`) — that's the lever, not the formatter. `src/shared/formatter.ts` only does deterministic, **language-agnostic** cleanup (bullet cap, char-based `capLength` with CJK sentence boundaries, URL-preserving) — never word-count caps (they break on Chinese).
- **Native-language generation**: the LLM replies directly in the user's language; do NOT re-translate its reply (that double-translates). Only translate fixed English UI strings and officer-relay text.
- **`translateText` (`src/python-bridge/client.ts`)** is HF-first with an **LLM (GLM) fallback** — HF de-listed SeamlessM4T-v2, so translation runs on GLM until `HF_TRANSLATE_MODEL` points at a served model. Keep the translation feature + cache intact.
- **Emotion-driven tone**: `scoreEmotion` (neutral/sad/frustrated/angry/rage) feeds `toneDirective` (`src/agents/main/tone.ts`), injected into the query prompt by `buildSystemPrompt`; policy also in `soul.md`. Angrier → warmer/less-formal/empathy-first, but **soften the tone, never the content** (still give the full answer + figures) and **never name the caller's emotion**. The emotion tier is part of the query response-cache key. English-trained emotion model → most reliable for English/Singlish.
- **Trajectory tone (adaptability)**: `inbound.ts` folds the current turn + recent scored user turns into one **effective emotion** (`src/agents/main/emotionTrajectory.ts` `effectiveEmotion`) before `runQueryAgent`, so the bot adapts to the *trend* not just the latest message. Trajectory only **raises** soothing, never lowers below the current message (`max(current, recencyWeightedAvg(recent+current))`); a stray spike decays (current-dominant weighting); feed only **scored** turns (guided path stores unscored ones). A `sustained` flag (≥2 of last 3 turns above the angry band) adds an ongoing-difficulty acknowledgement and is keyed into the cache. Smoothing **reduces noise**, doesn't fix the zh/ms/ta under-read. Unit-tested in `emotionTrajectory.test.ts`. Escalation stays in `analyzeEscalation`, not here.
- **CSAT rating + session lifecycle**: `src/services/session/manager.ts` owns a per-user in-memory session (and the conversation history, moved here so reset is centralised). The bot asks for a **1–5 ⭐ rating** (`rate:<sessionId>:<n>` Telegram buttons; WhatsApp = "reply 1–5" text) when a session ENDS: officer closes (`closeSession` → `endSession(…,"officer",{queueId})`) or the customer is done (`isClosingMessage` sign-off **or** `/end`). `recordRating` (in `telegram.ts` callback / WA numeric reply) stores it, ties it to the case via `setQueueRating` (`rating` on `QueueEntry`, dashboard `rating_received` event), thanks the user, and **resets the chat**. A **24h inactivity sweep** (`startSessionTimeoutSweep` in `gateway/index.ts`) **silently** resets idle sessions (no rating ping). In-memory → restart drops 24h timers + bot-only ratings; escalated-case ratings survive on the Mongo queue. Closing detector is English/Singlish only; non-English ends via `/end` or timeout. Unit-tested in `manager.test.ts`.
