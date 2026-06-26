# PULSE — Self-Test Report & Remediation Plan

_Generated 2026-06-26. Scope: full backend (`src/**`, ~12k LOC) + the live Telegram/officer/dashboard path. Method: 5 parallel subsystem audits (all findings cited `file:line`) + a runnable unit suite that empirically verifies the headline bugs._

**How to run the automated self-tests**

```bash
npm test          # vitest: 78 tests across 11 files — see Section A
npm run post      # runtime power-on self-test (restarts pm2 backend; see POST.md)
```

Legend: ✅ works / verified · 🐛 confirmed bug · ⚠️ stub or gap · 💀 dead code (unreachable) · 🔁 duplicate/contradiction

---

## Remediation status — updated 2026-06-26 (pass 1)

**Runtime-verified:** the full changed live path boots cleanly — `PORT=3099 tsx src/gateway/index.ts` → `/health/live` and `/health/ready` both HTTP 200, no load errors. (Not just `tsc`: this exercises `inbound.ts`/`dashboard.ts`/`agent.ts`/`client.ts` actually loading.)

**Fixed & verified (typecheck clean, `npm test` 107/107 green; B1/B3/B6 + 12 processInbound characterization tests):**
- **B1** — emotion label now gates distress (`emotion.ts`): joy/neutral/surprise → 0, only anger/sadness/fear/disgust score. No more false "rage" → false auto-escalation.
- **B2** — typed escalation ("yes" / guiding-flow officer escape) now routes through `escalateUser`, carrying full history + emotion + AI summary (also removed the duplicate bare `doEscalate`).
- **B3** — `isOfficerConfirmation` uses `/^yes\b/` (no more "yesterday" mis-escalation).
- **B4** — `/dashboard/resolve` now calls `endSession(…, "officer", {queueId})` → officer-side CSAT prompt actually fires and ties to the queue entry.
- **B5** — `sendReply` sends `finalText` (answer + offer) on no-button channels (WhatsApp keeps the escalation affordance).
- **B6** — `HF_TRANSLATE_MODEL` defaults empty → translation goes straight to GLM, skipping the always-failing SeamlessM4T HF call. **Also emptied the explicit `HF_TRANSLATE_MODEL=facebook/seamless-m4t-v2-large` in `.env`** — without that the runtime would have kept hitting the dead model regardless of the code default.
- **B7** — dead `config/integration.ts` deleted (the false "single source of truth"); the live LLM path is GLM via `LLM_*` env, the only remaining config source.
- **B8** — query agent flags an LLM failure (`requiresHumanReview=true`) so the raw retrieval scaffold is no longer cached/served as a polished answer; officer is offered.
- **Dead code removed:** the `services/proxy/` db-proxy microservice (7 files), the unused `/api/v1/officer/*` surface (3 files, unmounted), and the `pg`/`ioredis`/`kafkajs` deps (+ lockfile synced).
- **C1 (tier enum)** — corrected the stale hyphen fixtures that left 3 tests red. _Deeper contradiction still open:_ `SupportTierSchema` (hyphen) vs `VulnerabilityTier` (underscore), and the shadow `pulseTestHarness.ts` duplicating `adaptive-local/*`.

**Done (pass 2 — the split):**
- **`processInbound` split** — built a `vi.mock` characterization harness (`src/gateway/inbound.flow.test.ts`, 12 tests locking the branch matrix: commands, CSAT, officer-confirm, relay, normal query, high-distress escalation, voice/TTS), then extracted three helpers: `handleCommand`, `runStateIntercepts` (returns `{handled, prefs}` — the stale-offer clear mutates prefs and falls through), and `deliverAnswer`. **`processInbound` went 412 → 221 lines.** All 12 characterization tests stayed green through every extraction (behavior preserved), typecheck clean, boot smoke 200. The query pipeline (Phase 5) stays inline — its early-return + state mutation make it the one risky extraction, left for later.

**Open:**
- **B9** (persist conversation history), remaining duplicates (D2), remaining contradictions (C2–C9), mystery-name renames (D3), and the Phase-5 extraction.

---

## Section A — Automated unit self-test scorecard (`npm test` → 78/78 green)

These run with **zero network/DB** (pure functions) and are the regression net. Confirmed bugs are encoded as `it.fails` markers: they pass _today_ (proving the bug); when the bug is fixed they flip to failing, prompting removal of the marker.

| Feature under test | File | Tests | Result |
| :-- | :-- | :-- | :-- |
| Emotion scoring (text base, audio boost, clamp, thresholds) | `src/agents/main/emotion.test.ts` | 11 | ✅ math correct |
| → Emotion **label** correctness | same | 2× `it.fails` | 🐛 positive→"rage" (see B1) |
| Tone directives per band (rage/angry/frustrated/sad/neutral, sustained) | `src/agents/main/tone.test.ts` | 12 | ✅ |
| Emotion trajectory folding (raises-not-lowers, decay, sustained) | `src/agents/main/emotionTrajectory.test.ts` | 7 | ✅ (pre-existing) |
| Triage Cat 1/2/3 routing + iterations | `src/agents/triage/classifier.test.ts` | 17 | ✅ |
| → Triage non-English | same | 1× `it.fails` | 🐛 English-only (see B-gap) |
| Formatter (markdown strip, HTML escape, length cap, containsHtml) | `src/shared/formatter.test.ts` | 7 | ✅ |
| → Formatter markdown-link strip | same | 1× `it.fails` | ⚠️ links not stripped |
| Session manager (closing intent, expiry, rating window) | `src/services/session/manager.test.ts` | 7 | ✅ (pre-existing) |
| Contracts / friction / CSO alerts / UI-profile / Hermes boundary | `tests/*.test.ts` | 17 | ✅ (enum-drift fixed) |

**Fixed while building this report:** 3 tests (`ui-profile-resolution`, `cso-alert-projection`) were **already red** before any change — they fed the hyphenated tier values `"self-service"`/`"high-touch"` into helpers that expect the canonical underscore enum. Corrected the fixtures to `self_service`/`high_touch` (see contradiction C1).

---

## Section B — Confirmed bugs (the marked-down FAILs)

Ordered by impact. Each is verified against the actual source lines.

### B1 — 🐛 HIGH · Emotion **label is discarded**, so positive messages read as "rage"
- **Where:** `src/agents/main/emotion.ts:17` (`scoreEmotion` uses only `text.score`, ignores `text.label`) + `src/python-bridge/client.ts:217` (`detectEmotion` returns the 7-way classifier's **top label + its confidence**).
- **Mechanism:** a happy "thank you so much!!" → `{label:"joy", score:0.95}` → `scoreEmotion` → `0.95*100 = 95` → `labelFor(95) = "rage"`.
- **Blast radius:** trips the `>70` auto-escalation override (`inbound.ts:911`) → unwanted officer button on a thankful user; and forces an apologetic tone (`tone.ts:46`).
- **Proof:** `emotion.test.ts` → "positive emotions misread as distress" (`it.fails`).
- **Fix:** in `scoreEmotion`, map non-distress labels (joy/neutral/surprise) to a 0 base, or invert: distress = `score` only when `label ∈ {anger, sadness, fear, disgust}`, else 0.

### B2 — 🐛 HIGH · Typed escalation drops all conversation context
- **Where:** `inbound.ts:667` (officer-confirmation path) and `inbound.ts:696` (guiding-flow officer escape) both call `doEscalate(channel, userId, sessionId, messageText, "", lang, null)` — **empty chat history, null emotion**.
- **Effect:** the officer queue card summary is the bare word (often "yes"); `chat_history` = `[{role:"user",content:"yes"}]`; emotion defaults 50/neutral; and because `hasConversation` is false the **background AI summary never runs** (`doEscalate:1153`). The **button** path (`escalateUser:1046`) correctly passes full history — so context survives only if the user _taps_, not _types_.
- **Fix:** both typed paths should pass `getHistory(userId)` + latest emotion, exactly like `escalateUser`.

### B3 — 🐛 MED · `isOfficerConfirmation` false-positives on `startsWith("yes")`
- **Where:** `inbound.ts:83` — `t.startsWith("yes")`.
- **Effect:** with `pendingOfficerOffer` set, "**yes**terday I checked my balance" → silent escalation instead of an answer.
- **Fix:** match a whole-word affirmation (`/^yes\b/` or the `OFFICER_AFFIRMATIONS` set), not a prefix.

### B4 — 🐛 MED · CSAT-on-officer-close never fires in the live product
- **Where:** the live "Resolve" button hits `/dashboard/resolve/:id` (`dashboard.ts:154`), which resolves + notifies + sends a close message but **never calls `endSession`**. The only path that triggers the rating prompt is `closeSession` (`officer/service.ts:288`), reachable only via `POST /api/v1/officer/.../close` — which the **frontend never calls** (`grep "api/v1/officer" frontend/src` → nothing).
- **Fix:** call `endSession(userId, "officer", {lang})` inside `/dashboard/resolve`.

### B5 — 🐛 MED · `sendReply` drops the officer-offer text on no-button channels
- **Where:** `inbound.ts:226-230` — the `else` branch sends `clean` (bare answer), not `finalText` (answer + localized "tap to connect" prompt).
- **Effect:** on WhatsApp (no `sendWithButtons`) an escalation reply loses **both** the button and the prompt — no escalation affordance at all.
- **Fix:** send `finalText` in the no-button branch.

### B6 — 🐛 MED · `TRANSLATE_MODEL` default is a known-dead HF model
- **Where:** `client.ts:9` defaults to `facebook/seamless-m4t-v2-large`, which the in-file comments (`client.ts:115-117`) say HF de-listed (hard 400). Every non-cached translation pays a **failed HF round-trip** before the GLM fallback.
- **Fix:** default `TRANSLATE_MODEL` to empty/GLM-first, skipping the dead HF call.

### B7 — 🐛 HIGH (architectural) · LLM provider config is disconnected & contradictory
- **Where:** `config/integration.ts` declares `AI_PROVIDER=zai`, model `glm-4.6` as the "single source of truth" — but `getIntegrationConfig()` is **never called** anywhere. `llmClient.ts:8-11` independently defaults to a **self-hosted Hermes** (`localhost:8000`, model `NousResearch/Hermes-3-Llama-3.1-8B`). Code comments say "GLM"/"z.ai" (`agent.ts:136`, `copilot/service.ts:164`). **Three different stated models; the real one is whatever `LLM_BASE_URL`/`LLM_MODEL` point to.**
- **Fix:** make `llmClient` read `getIntegrationConfig()` (or delete the dead config and document the real env contract). Reconcile defaults (timeout 30s vs 60s, model glm-4.6 vs Hermes).

### B8 — 🐛 MED · LLM-failure fallback silently serves raw retrieved knowledge as the answer
- **Where:** `agents/query/agent.ts:138-139` and `agents/query/guidedSynthesis.ts:51-57` — on `callHermes` failure they return the raw `[1] Title — summary / Facts: … / Source:` retrieval scaffold as if it were a composed answer, with no flag. (Copilot does this honestly: `source:"fallback"`, `model:null` — `copilot/service.ts:176`.)
- **Fix:** mirror copilot — mark degraded answers and/or send a "having trouble, try again" line.

### B9 — 🐛 MED · Bot conversation history is in-memory only; cross-session memory is dead
- **Where:** `session/manager.ts:44` (`conversationHistory` Map, max 30, lost on restart). `proxy-client.ts:480-487` — `saveConversationLog`/`getConversationLog`/`getSessionsByUser` are **no-op stubs** → `getPreviousSessionContext` (`query/summariser.ts`) **always returns null**. Only **escalated-case** turns persist (Mongo `ccu_queue.chat_history`).
- **Fix (if desired):** persist history (the real impl exists in the dead `services/proxy/routes/user.ts`).

### Other confirmed gaps
- ⚠️ **`speechRate` is dead** through the whole TTS chain — `client.ts:290` names the param `_speechRate` and never uses it; the tier→rate values (0.7/0.85/1.0) have zero audio effect.
- ⚠️ **Triage is English-only** — `classifier.ts` patterns are English regexes; a Chinese personal-balance question defaults to Cat-1 (`classifier.test.ts` `it.fails`).
- ⚠️ **Formatter doesn't strip `[text](url)` links** (`formatter.ts` `stripMarkdown`) while `stripMarkdownForTTS` (`inbound.ts:104`) does — drift.
- 🔒 **JWT fallback secret** — `shared/middleware/auth.ts:60` verifies against the literal `"secret"` when `JWT_PUBLIC_KEY` is unset.
- ⚠️ **`getCpfPage` permanent stub** (`proxy-client.ts:182`) always returns null → `cpf_search` no-result branch always hits the hardcoded "visit cpf.gov.sg" string.

---

## Section C — Contradictions (same thing, modeled/derived two ways)

- **C1 — Support tier enum drift.** Canonical `VulnerabilityTier` is **underscore** (`shared/types/language.ts:9`, `schemas.ts:11`: `self_service`/`guided`/`high_touch`) but `SupportTierSchema` (`shared/contracts/ai-payload.ts:11`) is **hyphen** (`self-service`/`high-touch`) — same concept, two spellings. _This broke 3 tests._ Also: `pulseTestHarness.ts` defines a **shadow** `resolveUiProfile`/`summarizeFriction`/`projectCsoAlerts` that duplicate the real `services/adaptive-local/{profiles,friction,csoAlerts}.ts` — and **the tests exercise the shadow copy, not production**.
- **C2 — `sessionId` has two meanings.** `inbound.ts:544` builds `${userId}:${Date.now()}` (→ queue); `manager.ts:108` mints `crypto.randomUUID()` (→ CSAT). The queue's `sessionId` and the CSAT `sessionId` never match.
- **C3 — User language derived 5+ ways.** `prefs.preferred_lang` (`inbound.ts:552`) → re-detected/overwritten (`783`) → `pendingGuiding.lang` stored but never read (`819` vs `493`) → queue `preferred_lang` → `escalateUser` re-reads prefs (`1027`). One in-flight language switch desyncs them.
- **C4 — Four overlapping "wants an officer" definitions:** `isOfficerConfirmation` (loose, `:81`), `isExplicitOfficerRequest` (strict, `:90`), `isBareTriggerPhrase` (`:1059`), analyzer `EXPLICIT_REQUESTS` (`analyzer.ts:59`) — different rules per branch.
- **C5 — Personal-data detection defined 3–4× with different regexes:** triage `CAT3_PATTERNS`, escalation `PERSONAL_DATA`, router `PERSONAL_DATA_KEYWORDS`, copilot `PERSONAL_HINTS` — the "is this personal?" answer varies by code path.
- **C6 — Emotion at escalation has two sources:** button path uses the `getLatestEmotionForUser` ring buffer (`inbound.ts:1030`); typed path passes `null` → 50/neutral default.
- **C7 — Two `priority_score` truths:** set to raw `emotion_score` on insert (`proxy-client.ts:326`), recomputed by `computePriorityScore` on the 30s timer (`dashboard/queue.ts:15`).
- **C8 — Env-default disagreements:** `LLM_MODEL` (glm-4.6 vs Hermes-Llama), `LLM_TIMEOUT_MS` (30s vs 60s) across `integration.ts` vs `llmClient.ts`; `RATE_LIMIT_ANONYMOUS/AUTHENTICATED` code defaults 10/100 vs `.env.example` 300/600 (~30×); `RATE_LIMIT_WINDOW_MS` declared but never read; `SQLITE_PATH` default `./data/pulse.db` vs `.env` `./data/pulse-customers.db`.
- **C9 — Three Mongo connection configs / two live pools to the same `pulse` DB:** `proxy-client.ts:212` (hardcoded `db("pulse")`) + `docstore/index.ts:33` (`MONGODB_DB`) + dead `connections.ts:8` (`MONGO_URI_USERS/TOOLS`).

---

## Section D — Refactor smells

### D1 — Long functions (split candidates)
| Function | File:line | ~Lines | Distinct jobs |
| :-- | :-- | :-- | :-- |
| **`processInbound`** | `gateway/inbound.ts:542` | **~412** | **~30** (prefs, STT, unclear-voice, /start//help//end//voice//dialect, CSAT intercept, officer-confirm, queue relay, guiding intercept, closing, emotion, normalise, lang-detect, triage, guiding entry, trajectory, query, TTS-intercept, history, escalation, send, TTS) |
| `runMainAgent` | `agents/main/agent.ts:75` | ~160 | 4 request-type branches → dispatch table |
| `answerQuestion` | `services/copilot/service.ts:94` | ~100 | interpret, search, terminology, member load, citations, prompt, LLM, fallback |
| `handleTelegramUpdate` | `gateway/telegram.ts:53` | ~108 | callback ack + 3 dispatches + displayName + voice download + text |
| `doEscalate` | `gateway/inbound.ts:1109` | ~70 | provisional summary, displayName, postToQueue, WS notify, AI summary, confirm |
| `getConversation` (💀 dead) | `services/officer/service.ts:149` | ~88 | role-map, card, profile resolve, identity override |
| `gateway/index.ts` inline endpoints | `gateway/index.ts:133-243` | ~110 | 6 agent endpoints with own zod schemas — belong in a router |

**Suggested `processInbound` split:** `handleCommands()` (start/help/end/voice/dialect), `interceptStateBranches()` (CSAT/officer-confirm/relay/guiding/closing), `buildAndScoreQuery()` (emotion/normalise/lang/triage/trajectory/query), `deliverAnswer()` (format/history/escalation/send/TTS). **Write characterization tests first** — the branch order is behavior-bearing (B3, relay-before-lang-detect).

### D2 — Duplicate / copy-paste logic
- **3 byte-identical slang resolvers** `resolve_singlish`/`resolve_malay`/`resolve_indian` — `transcriber/registry.ts:95-120`.
- **`maybeTranslate` defined twice** (identical bodies) — `inbound.ts:387` & `session/manager.ts:144`; plus inline copies at `inbound.ts:164,701,1169` & `dashboard.ts:166`.
- **"translate EN→user lang then dispatch by channel prefix" — 4 copies** — `dashboard.ts:88`, `dashboard.ts:165`, `officer/service.ts:247`, `manager.ts:152`.
- **Gov-concise system prompt twice, divergently** — `query/agent.ts:17` (8 rules) vs `copilot/service.ts:84` (Primary-6).
- **prefs default literal 3×** — `inbound.ts:549,1045,1170`.
- **Emotion payload build+broadcast block twice** — `inbound.ts:736` & `inbound.ts:986`.
- **Markdown strip twice (drifted)** — `formatter.ts stripMarkdown` vs `inbound.ts:104 stripMarkdownForTTS`.
- **HTML-escape triplet twice** — `inbound.ts:212` & `formatter.ts:213`.
- **Language-label maps triplicated** — `officer/service.ts:144`, `memberProfile.ts:42`, frontend.
- **`{_id:0}` projection + dual-write queue helper repeated 7×** — `proxy-client.ts:342-447`.
- **db-proxy `_id`-strip idiom + manual `req.body as {…}` validation** repeated across the (dead) `proxy/routes/*`.

### D3 — Mystery / weak variable names
`t` (overloaded: trimmed string vs `{translated_text}` object vs history turn — `inbound.ts:82,138,165,389,852`) · `out` (raw HF/LLM response, different shape each use — `client.ts:72,126,196,214`) · `m` (regex match vs message string — `inbound.ts:653,701`) · `to` (a `setTimeout` handle reading like the preposition — `inbound.ts:140`) · `eff` (`inbound.ts:855`) · `pg` (`inbound.ts:490`) · `data` (`llmClient.ts:90`, `correspondence/routes.ts:64`) · `doc`/`col`/`res`/`out`/`first`/`top` across the data layer.

---

## Section E — Full hierarchical test plan (run-through list)

Automated (Section A) covers the pure layer. Below is the **complete** feature checklist with sub-iterations; ⚙️ = automatable with mocks/test-DB, 🌐 = needs live HF/LLM/Atlas, 👤 = manual via Telegram.

**1. Voice → Text (STT)** — ⚙️unit: empty audio → unclear reply; <1.2s clip → unclear; slang resolves via DB (mock `getAllSlangFull`); ≥2 dialect hits → `detectedDialect`. 🌐: clear English; Singlish; Mandarin; noisy/garbled → `transcriptionLooksUnclear=true`.
**2. Text → Voice (TTS)** — ⚙️: voice selection per lang/dialect (`en-SG-LunaNeural`, `zh-hok→zh-HK-HiuMaanNeural`); `stripMarkdownForTTS` removes markup/emoji/URL ≤500 chars; **speechRate regression** (0.7 vs 1.0 → identical bytes, proves the dead-rate bug). 🌐: real audio per language; Edge-fail→HF MMS fallback.
**3. Translation** — ⚙️: same-lang short-circuit; empty text; both backends fail → original returned. 🌐: en→zh, zh→en, dialect; GLM fallback path (HF dead, B6).
**4. Language detect** — ⚙️: Tamil/CJK script → deterministic; HF out-of-set→LLM. 🌐: Latin Malay → `ms`.
**5. Emotion + tone** — ✅ done (Section A) incl. B1 markers.
**6. Triage** — ✅ done (Section A) incl. non-English marker.
**7. Query/RAG** — ⚙️ (mock `callHermes`): happy answer; LLM-fail→raw-knowledge (B8); personal-data short-circuit→hotline; cache key varies with emotion; guarded/unsafe→blocked. 🌐: real answer grounded in retrieval.
**8. Copilot** — ⚙️: unconfigured→`source:"fallback"`; LLM-throws→fallback; no-match→"couldn't find"; member context injected (seed SQLite). 🌐: real grounded answer.
**9. Inbound routing & commands** — 👤/⚙️: text Cat-1; voice clear/unclear; empty; /start, /help, /end (with & without history), /voice on→off, /dialect cantonese→off; CSAT intercept (bare 1–5) then new-query fall-through.
**10. Escalation** — ⚙️/👤: explicit "talk to officer"→button; **button tap**→full history+emotion (assert `chat_history.length == getHistory().length`); **typed "yes"**→**B2 regression** (currently bare); **"yesterday…"**→**B3 regression** (currently mis-escalates); already-queued→dedup; bare-trigger summary skips "officer please"; >70 distress auto-escalate.
**11. Officer relay** — ⚙️: citizen→officer translate+broadcast+`appendToQueueHistory`; officer→citizen via `/dashboard/send`; **resolve→B4 regression** (no CSAT prompt today).
**12. Sessions** — ✅ partly (manager.test). Add: closing-intent end→CSAT; 24h sweep clears history; rating dual-write to `ccu_queue`.
**13. Dashboard/WS** — ⚙️/🌐: escalation→`new_queue_entry` (read `event`, not `type`); `emotion_update` live; background summary upgrade→`queue_updated`; stats partly mock (`avg_wait_minutes===0`).
**14. Persistence** — ⚙️(temp DB): customer bundle round-trip; UNIQUE singpass; cases/events ASC; non-ASCII; restart durability. 🌐: knowledge seed/search (Mongo + file fallback); queue create→restart→`initQueue` restore; CSAT `ccu_queue.rating`. **Negative:** `getConversationLog`→`[]` (B9), prefs non-persist.
**15. Services/endpoints** — ⚙️/🌐: adaptive-local login→telemetry→friction→CSO alert; console CRUD + auth; correspondence stub returns empty; proxy stub returns empty; `/health/ready` toggles on `HUGGINGFACE_API_KEY`.

---

## Section F — Dead code / cleanup candidates (confirm before deleting)

- 💀 **`src/services/proxy/`** entire db-proxy microservice (port 4000) — never imported/started; superseded by `src/db/proxy-client.ts`. ~360 LOC.
- 💀 **`pg`, `ioredis`, `kafkajs`** — declared deps, zero usage in `src/`.
- 💀 **`config/integration.ts`** — `getIntegrationConfig()` never called (B7).
- 💀 **`/api/v1/officer/*`** (`officer/service.ts`, `routes.ts`, `memberProfile.ts`) — fully built, frontend never calls it (uses `/dashboard/*`).
- 💀 **accessibility `formatForTTS`/`getSpeechRate`** — only referenced by the non-live REST/subagent path.
- 💀 **`conversation_logs` stubs** (`proxy-client.ts:480-487`) + `getCpfPage` stub.
- 🔁 **shadow `pulseTestHarness.ts` helpers** duplicating `adaptive-local/*` (C1).

---

## Section G — Recommended remediation sequence

1. **Lock behavior** (done for the pure layer; next: characterization tests for `processInbound`'s branch order before splitting it).
2. **Fix bugs, highest impact first:** B1 (emotion label) → B2/B3 (escalation context + yes-prefix) → B4/B5 (CSAT-on-close, no-button offer) → B6/B7 (translate default, provider config) → B8/B9.
3. **De-duplicate** (low-risk, high-clarity): extract one shared `maybeTranslate` + channel-dispatch helper; collapse the 3 slang resolvers; unify prefs-default + personal-data detection + system prompt.
4. **Split long functions** (behind the new characterization tests), starting with `processInbound`.
5. **Resolve contradictions:** unify the tier enum (C1), the "wants officer" predicates (C4), env defaults (C8).
6. **Delete dead code** (Section F) once confirmed.
7. After every production change: `npm run post`, and update `CONTEXT.md` / `AGENTS.md` / `MEMORY.md` (doc-sync rule).
