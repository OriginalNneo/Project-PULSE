# Project Context — PULSE Framework

> **Quick-reference document for anyone working on Project PULSE.** This file consolidates the project's purpose, architecture decisions, conventions, and current state into a single source of truth. For deep technical detail, refer to [README.md](./README.md) and [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md).

---

## Project Identity

| Field | Value |
| :--- | :--- |
| **Name** | PULSE — People-centric Framework for Correspondence (PFC) |
| **Type** | SaaS platform + AI multi-agent system |
| **Purpose** | Transform Singapore government correspondence into adaptive, inclusive, accessible communications for vulnerable citizens |
| **Status** | Live Telegram CPF assistant (RAG answers, guiding questions, gov-standard concise formatting, native-language generation, emotion-driven tone, CCU officer escalation, CSAT rating + session lifecycle) on top of the scaffolded multi-service architecture |
| **AI Framework** | OpenClaw (custom-built) |
| **Repository** | `project-pulse` |

---

## Problem Statement

Singapore's digital transformation has created systemic barriers for vulnerable citizens (seniors 65+, persons with disabilities, low digital literacy individuals) when navigating institutional correspondence (tax, healthcare, housing, employment, legal notices). Current systems treat everyone identically, leading to missed appointments, unpaid fines, lost benefits, and erosion of trust.

---

## The PULSE Acronym

| Letter | Pillar | One-Liner |
| :--- | :--- | :--- |
| **P** | People-Centric | Design for the human, not the demographic. Context-aware, adaptive communication. |
| **U** | Universal | Accessibility by default. WCAG 2.2 AA, plain language, multi-channel. |
| **L** | Linked | Seamless analog-to-digital bridges. Physical mail + digital + voice continuum. |
| **S** | Secure & Supportive | Empowering without exposing. Scam-resistant, high-touch verification. |
| **E** | Empathetic (implicit) | The framework keeps a finger on the "pulse" of the community. |

---

## Target Users

| User Type | Description | Primary Need |
| :--- | :--- | :--- |
| **Seniors (65+)** | ~1 in 4 Singaporeans by 2030 | Large text, voice assist, physical mail, simplified language |
| **Persons with Disabilities** | ~3.4% of resident population | Screen-reader support, cognitive-load reduction, keyboard navigation |
| **Low Digital Literacy** | Underserved across all ages | Guided walkthroughs, language support, human fallback |
| **Caregivers / Proxies** | Authorised family / coordinators | Delegated access portal, audit trail, assisted actions |

---

## Architecture Overview

### 4-Ring Security Model

```
Ring 1: Edge & Security Perimeter   (CDN, WAF, DDoS, TLS)
Ring 2: API Gateway                 (Auth, Rate Limiting, Routing)
Ring 3: Application Services        (Modular Core + Event Bus)
Ring 4: Data & Integration Layer    (PostgreSQL, Redis, Kafka, Adapters)
```

### Key Architecture Decisions

| Decision | Rationale |
| :--- | :--- |
| **Event-driven (Kafka)** | Services communicate asynchronously. Adding consumers doesn't affect producers. |
| **Schema-per-service in PostgreSQL** | No service queries another's schema. Data isolation enforced at DB level. |
| **Adapter pattern for externals** | Every external API (Singpass, SingPost, Twilio) wrapped in a swappable adapter implementing a common interface. |
| **JWT in httpOnly cookies** | No tokens in localStorage. Short-lived access tokens (15 min) + rotated refresh tokens (7 days). |
| **API versioning** (`/v1/`, `/v2/`) | Backward-compatible changes only. Breaking changes = new version. |
| **Feature flags (Unleash/LaunchDarkly)** | Decouple deployment from release. Ship new code OFF, enable per-tenant. |

### Service Catalogue

| Service | Owns | Key Events |
| :--- | :--- | :--- |
| **Correspondence** | Letters, templates, metadata | `correspondence.created`, `correspondence.viewed` |
| **Vulnerability** | User classification, support tiers | `vulnerability.tier.changed` |
| **Orchestration** | Channel routing, escalation | `routing.decision.made` |
| **Adaptation** | Language simplification, format generation | `adaptation.completed` |
| **Delivery** | Multi-channel dispatch, tracking | `delivery.dispatched`, `delivery.failed` |
| **Notification** | SMS, push, email reminders | `notification.sent` |
| **Proxy** | Delegated access, caregiver relationships | `proxy.action.taken` |
| **Analytics** | Engagement metrics, drop-off detection | `analytics.insight.generated` |
| **Auth** | Singpass integration, sessions, tokens | `auth.login`, `auth.logout` |
| **Billing** | Usage metering, invoicing | `billing.invoice.created` |

### Dependency Rule (Modularity)

```
Other Services → index.ts (public API only) → controller → service → repository → DB
```

Dependencies point **inward only**. Rewrite `repository.ts` (swap DB) → zero other services change. Add a new service → zero existing services change.

---

## AI Agent System (OpenClaw)

### Agent Hierarchy

```
Orchestrator (routes, never answers)
    │
    ├── Domain Agents (deep expertise, one domain each)
    │   ├── Financial    (tax, CPF, GST, benefits)
    │   ├── Healthcare   (appointments, Medisave, screenings)
    │   ├── Housing      (HDB, rental, maintenance, SERS)
    │   ├── Employment   (workpass, MOM, CPF contributions)
    │   └── Legal        (fines, court notices, regulatory)
    │
    ├── Language Agents (domain glossaries, not just translation)
    │   ├── English      (plain English simplification)
    │   ├── Chinese      (简体中文 + local context)
    │   ├── Malay        (Bahasa Melayu, formal register)
    │   └── Tamil        (தமிழ் + local terminology)
    │
    ├── Dialect Agents (first-class, not afterthoughts)
    │   ├── Hokkien      (福建话 — largest senior dialect)
    │   ├── Cantonese    (广东话)
    │   ├── Teochew      (潮州话)
    │   ├── Hakka        (客家话)
    │   ├── Hainanese    (海南话)
    │   ├── Bazaar Melayu
    │   ├── Javanese
    │   ├── Singapore Tamil (colloquial)
    │   └── Malayalam / Punjabi / Hindi
    │
    ├── Accessibility Agent (readability, simplification, TTS, layout)
    │
    └── Guardian Agent (scam detection, PII scrubbing, safety gate)
```

### Agent Communication Flow

```
User asks a question (in any language/dialect, any channel)
  → Orchestrator: classify intent + detect language/dialect + assess vulnerability
    → Domain Agent: answer using domain knowledge
      → Language/Dialect Agent: contextualise terms in user's language
        → Accessibility Agent: simplify to appropriate reading level
          → Guardian Agent: safety check (PII, scams, confidence)
            → Response delivered to user
```

### The Language-Domain Glossary System

Language agents maintain curated glossaries that map institutional terms to plain-language explanations — not generic dictionary translations, but domain-specific contextualisation.

Example: "assessable income" in Chinese → "评税入息" + "你一年内赚到的所有钱的总和" + example with numbers.

Example (dialect): "assessable income" in Hokkien → "应税收入" + "你一年赚有够额" + example with numbers + cultural note about how this term is understood in hawker-centre/night-market conversation.

### Adding New Agents

```
1. Create agent folder in src/agents/domain/<name>/
2. Define personality, knowledge base, prompts
3. Create language glossaries (4 official languages)
4. Create dialect glossaries (as many as needed — start with Hokkien)
5. Register with Orchestrator's dynamic agent registry
→ Live. Zero existing code changed.
```

---

## Technology Stack

| Category | Choice |
| :--- | :--- |
| **Frontend** | React / Next.js (SSR, WCAG-compliant) |
| **Backend** | Node.js / Express (TypeScript) |
| **Database** | PostgreSQL >= 14 (schema-per-service) |
| **Cache** | Redis >= 7 |
| **Message Queue** | Apache Kafka |
| **Voice / IVR** | Twilio / AWS Connect |
| **Physical Mail** | SingPost API |
| **Auth** | Singpass / Corppass |
| **Observability** | OpenTelemetry + Prometheus + Grafana + Sentry |
| **Feature Flags** | LaunchDarkly / Unleash |
| **CI/CD** | GitHub Actions |
| **Infra** | AWS / Azure Gov Cloud |
| **Containers** | Docker + Kubernetes |
| **AI Framework** | OpenClaw (custom) |

---

## Languages & Dialects Supported

### Official Languages

| Code | Language | Register |
| :--- | :--- | :--- |
| `en` | English | Plain English, simplified (Primary 4–6 reading level) |
| `zh` | Chinese (Simplified) | 简体中文, local colloquialisms where appropriate |
| `ms` | Malay | Bahasa Melayu, formal register |
| `ta` | Tamil | தமிழ், formal register, local terminology |

### Chinese Dialects

| Code | Dialect | Notes |
| :--- | :--- | :--- |
| `zh-hok` | Hokkien (福建话) | Most widely spoken dialect among Singapore seniors. Used in hawker centres, markets, neighbourhoods. |
| `zh-can` | Cantonese (广东话) | Significant population, especially among older generation. Common in media consumption (HK dramas). |
| `zh-teo` | Teochew (潮州话) | Concentrated in specific mature estates. Often mixed with Hokkien in practice. |
| `zh-hak` | Hakka (客家话) | Smaller community but important for inclusivity in mature HDB estates. |
| `zh-hai` | Hainanese (海南话) | Smallest Chinese dialect group in Singapore. |

### Malay Dialects / Varieties

| Code | Dialect | Notes |
| :--- | :--- | :--- |
| `ms-bms` | Bazaar Melayu | Colloquial Malay spoken informally across ethnic groups. Important for older generation. |
| `ms-joh` | Johor-Riau Malay | Regional variety common among Singapore Malays. |
| `ms-boy` | Boyanese (Bawean) | Spoken by subset of Javanese-descended community. |
| `ms-jav` | Javanese | Spoken by older generation of Javanese-descended Singaporeans. |

### Tamil & Indian Language Dialects / Varieties

| Code | Dialect | Notes |
| :--- | :--- | :--- |
| `ta-sin` | Singapore Tamil | Local Tamil variety with Malay/English loan words. Distinct from Indian Tamil. |
| `ta-spo` | Spoken Tamil (colloquial) | Informal register, more accessible for users who struggle with formal written Tamil. |
| `ml` | Malayalam | Significant Keralite community in Singapore. |
| `pa` | Punjabi | Sikh community. |
| `hi` | Hindi | Broader Indian community, newer migrants. |

### Why Dialects Matter

Many seniors aged 75+ are more comfortable in dialect than in Mandarin or formal Tamil. The Speak Mandarin Campaign (1979) shifted education to Mandarin, but the current elderly population was already out of school. For these users, a message in Hokkien or Bazaar Melayu is not a "translation" — it is the **primary language of comprehension**. PULSE treats dialects as first-class language agents, not afterthoughts.

---

## Vulnerability Tiers

| Tier | Behaviour | Trigger |
| :--- | :--- | :--- |
| **Self-service** | Standard UI, minimal assistance | Confident digital user, no signals |
| **Guided** | Simplified language, proactive prompts, larger UI | Some difficulty signals detected |
| **High-touch** | Voice assist, human fallback, minimal steps | Repeated failures, age 75+, declared disability |

---

## Key Conventions

| Convention | Rule |
| :--- | :--- |
| **Accessibility** | WCAG 2.2 AA minimum. All UI must pass automated + manual audit. |
| **Readability** | User-facing text: Primary 6 (guided), Primary 4 (high-touch). Flesch-Kincaid. |
| **No links in SMS/email** | Users type gov.sg URLs manually. Scam prevention. |
| **No secrets in code** | Environment variables only. `.env.example` committed, `.env` gitignored. |
| **Structured JSON logging** | traceId, service name, operation, duration. Never log PII or tokens. |
| **API versioning** | `/api/v1/...`. Breaking changes = new version. |
| **Event schema versioning** | `v1`, `v2` coexist. Consumers migrate independently. |
| **Idempotent event consumers** | Processing same event twice = same result. |
| **Circuit breakers** | All synchronous inter-service calls have 2s timeout + fallback. |
| **Health checks** | Every service: `/health/live` (running) + `/health/ready` (ready for traffic). |

---

## File Structure & What Each File Does

### Root Config Files

| File | Purpose |
| :--- | :--- |
| `package.json` | Node.js project config. Dependencies (Express, Zod, Kafka, Redis, pg, Pino). Scripts for dev/build/lint/test. |
| `tsconfig.json` | TypeScript config. Strict mode, ES2022 target, path aliases (`@shared/*`, `@agents/*`, etc.). |
| `.env.example` | Template for environment variables. Copy to `.env` and fill in secrets. |
| `.gitignore` | Excludes `node_modules/`, `dist/`, `.env`, `frontend/.next/`. |

### Documentation

| File | Purpose |
| :--- | :--- |
| `README.md` | Full project documentation — pillars, 4-ring architecture, service catalogue, agent system overview, user journeys, tech stack, getting started guide, contributing rules. |
| `AGENT_ARCHITECTURE.md` | Deep-dive AI agent spec — agent personalities, inter-agent communication protocol, language-domain glossary system, dialect agent design, safety guardrails, OpenClaw integration, knowledge base structure, future expansion. |
| `CONTEXT.md` | This file — consolidated quick reference for the entire project. |

### Backend — Gateway

| File | Purpose |
| :--- | :--- |
| `src/gateway/index.ts` | **API Gateway entry point.** Wires Express app with Helmet (security headers), CORS, cookie parser, JSON body parsing, request ID tracing, rate limiting. Mounts all service routes at `/api/v1/<service>` and agent routes at `/api/v1/agents`. Exposes `/health/live` and `/health/ready`. Starts the server on configured port. |

### Backend — Shared Utilities

| File | Purpose |
| :--- | :--- |
| `src/shared/types/language.ts` | Core type definitions: `Language`, `Dialect` (union of `ChineseDialect`, `MalayVariety`, `IndianVariety`), `VulnerabilityTier`, `CorrespondenceCategory`, `Urgency`, `DeliveryChannel`. These types are used across the entire codebase. |
| `src/shared/types/api.ts` | API-level types: `AuthenticatedRequest` (what's attached to every authenticated request), `ApiResponse<T>` (standard response wrapper), `PaginatedResponse<T>`. |
| `src/shared/types/domain.ts` | Domain model types: `Correspondence`, `VulnerabilityProfile`, `VulnerabilitySignal`, `ProxyRelationship`. |
| `src/shared/types/index.ts` | Re-exports all types from the three files above. Single import point for the rest of the codebase. |
| `src/shared/errors.ts` | Error hierarchy: `AppError` (base), `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, `RateLimitError`, `ExternalServiceError`. Each carries a machine-readable `code`, HTTP `statusCode`, and optional `metadata`. |
| `src/shared/logger.ts` | Pino-based structured JSON logger. `createServiceLogger(serviceName)` returns a child logger with the service name attached. Never logs PII. |
| `src/shared/middleware/auth.ts` | JWT authentication middleware. `requireAuth` extracts the access token from httpOnly cookie, verifies it, and attaches `req.auth` with userId, tenantId, roles, language, vulnerabilityTier. `requireRole(...roles)` checks role-based access. Dev mode accepts `"dev-token"`. |
| `src/shared/middleware/rateLimiter.ts` | In-memory rate limiter. Different limits per role (anonymous: 10/min, authenticated: 100/min, admin: 500/min, service: 1000/min). Sets `X-RateLimit-*` headers. Throws `RateLimitError` when exceeded. |
| `src/shared/middleware/errorHandler.ts` | Global error handler. Catches `AppError` instances and returns structured JSON error responses. Unhandled errors return generic 500 without leaking stack traces. |
| `src/shared/middleware/tracing.ts` | Generates/correlates `X-Request-Id` and `X-Trace-Id` / `X-Span-Id` headers for distributed tracing across services. |

### Backend — Service Routes (9 Services)

Each service follows the same pattern: Express Router with Zod-validated endpoints. All require authentication.

| File | Endpoints | Purpose |
| :--- | :--- | :--- |
| `src/services/correspondence/routes.ts` | `GET /` (list + filter by category/urgency), `GET /:id`, `POST /` (create), `POST /:id/view`, `POST /:id/action` | **The most complete route file** — serves as the template pattern for all other services. Full Zod validation, proper error handling, paginated list endpoint. |
| `src/services/vulnerability/routes.ts` | `GET /:userId/profile`, `PUT /:userId/tier` | Fetch and update user vulnerability tier classification. |
| `src/services/orchestration/routes.ts` | `GET /health`, `POST /route` | Channel routing decisions — takes correspondence metadata and returns which channels to use, priority, and estimated delivery. |
| `src/services/adaptation/routes.ts` | `GET /health`, `POST /adapt` | Language simplification and format adaptation — takes content + language + tier, returns adapted content with readability score. |
| `src/services/delivery/routes.ts` | `GET /health`, `POST /dispatch` | Multi-channel dispatch — takes correspondence ID + channels, queues dispatch and returns tracking IDs per channel. |
| `src/services/notification/routes.ts` | `GET /health`, `POST /send` | Send notifications via SMS, push, or email. |
| `src/services/proxy/routes.ts` | `GET /:principalUserId/proxies`, `POST /:principalUserId/proxies`, `GET /:principalUserId/correspondence` | Manage caregiver/proxy delegated access. Create relationships, list proxies, view principal's correspondence on their behalf. |
| `src/services/analytics/routes.ts` | `GET /health`, `GET /engagement` | Engagement metrics — view rates, action completion, time-to-action, drop-off points. |
| `src/services/billing/routes.ts` | `GET /health`, `GET /usage` | Usage metering per tenant — correspondence sent, voice minutes, physical mail count. |

### Backend — AI Agent System (OpenClaw)

| File | Purpose |
| :--- | :--- |
| `src/agents/shared/types.ts` | Agent-specific types: `AgentMessage` (inter-agent communication envelope), `RoutingContext` (what the Orchestrator passes to domain agents), `DetectedIntent` (domain + confidence + keywords), `AgentRegistration` (what agents register with the registry), `LanguageAgentRequest` / `LanguageAgentResponse` (language/dialect lookup contract), `AgentResponse` (final response to user). |
| `src/agents/orchestrator/registry.ts` | **Dynamic agent registry.** `AgentRegistry` class with methods: `register`, `unregister`, `findByDomain`, `findByLanguage`, `findByDialect`, `findByType`, `isHealthy`. On startup, registers all 5 domain agents, 4 language agents, 14 dialect agents, accessibility agent, and guardian agent. New agents register themselves here — zero existing code changes. |
| `src/agents/orchestrator/router.ts` | **Intent classification and language/dialect detection.** `classifyIntent(messages)` — scores user message against keyword lists per domain (tax, health, housing, employment, legal) including multilingual keywords (English, Chinese, Malay, Tamil). `detectLanguage(messages)` — detects which official language the user is writing in. `detectDialect(messages, language)` — detects if the user is writing in a specific dialect (Hokkien, Cantonese, Bazaar Melayu, Singapore Tamil, etc.). |
| `src/agents/orchestrator/agent.ts` | **The main Orchestrator agent.** `handleUserMessage(messages, context)` — the core routing pipeline: (1) detect language/dialect, (2) classify intent, (3) find domain agent in registry, (4) invoke domain agent, (5) if non-English, invoke language or dialect agent for glossary lookup, (6) invoke accessibility agent to simplify, (7) invoke guardian agent for safety check, (8) return response. Falls back to human agent if confidence < 30% or guardian blocks. |
| `src/agents/orchestrator/routes.ts` | **HTTP endpoints for the agent system.** `POST /api/v1/agents/chat` — takes user message + conversation history + optional language/dialect override, runs the full Orchestrator pipeline, returns agent response with confidence and human-review flags. `GET /api/v1/agents/registry` — lists all registered agents. `GET /api/v1/agents/registry/:name` — inspect a specific agent. |

### Backend — Agent Placeholders (To Be Implemented)

Each file below is a scaffold (`export {};`) ready for personality definitions, knowledge bases, and glossaries.

**Domain Agents:**

| File | Domain |
| :--- | :--- |
| `src/agents/domain/financial/agent.ts` | Tax, CPF, GST, IRAS notices, financial benefits |
| `src/agents/domain/healthcare/agent.ts` | Hospital appointments, Medisave, polyclinic, CHAS |
| `src/agents/domain/housing/agent.ts` | HDB, rental, maintenance, SERS, conservancy |
| `src/agents/domain/employment/agent.ts` | Workpass, MOM, CPF employer contributions, TADM |
| `src/agents/domain/legal/agent.ts` | Fines, court notices, LTA, NEA, appeals |

**Language Agents:**

| File | Language |
| :--- | :--- |
| `src/agents/language/english/agent.ts` | Plain English simplification |
| `src/agents/language/chinese/agent.ts` | 简体中文 with local context |
| `src/agents/language/malay/agent.ts` | Bahasa Melayu, formal register |
| `src/agents/language/tamil/agent.ts` | தமிழ், formal register |

**Dialect Agents:**

| File | Dialect |
| :--- | :--- |
| `src/agents/dialect/chinese/hokkien/agent.ts` | 福建话 — largest senior dialect |
| `src/agents/dialect/chinese/cantonese/agent.ts` | 广东话 |
| `src/agents/dialect/chinese/teochew/agent.ts` | 潮州话 |
| `src/agents/dialect/chinese/hakka/agent.ts` | 客家话 |
| `src/agents/dialect/chinese/hainanese/agent.ts` | 海南话 |
| `src/agents/dialect/malay/bazaar-melayu/agent.ts` | Colloquial Malay |
| `src/agents/dialect/malay/javanese/agent.ts` | Javanese-descended community |
| `src/agents/dialect/indian/singapore-tamil/agent.ts` | Local Tamil with loan words |
| `src/agents/dialect/indian/spoken-tamil/agent.ts` | Colloquial Tamil |
| `src/agents/dialect/indian/malayalam/agent.ts` | Keralite community |
| `src/agents/dialect/indian/punjabi/agent.ts` | Sikh community |
| `src/agents/dialect/indian/hindi/agent.ts` | Broader Indian community |

**Utility Agents:**

| File | Purpose |
| :--- | :--- |
| `src/agents/accessibility/agent.ts` | Readability scoring, simplification, text-to-speech prep, large-format layout |
| `src/agents/guardian/agent.ts` | PII scanning, scam detection, safety review, confidence check, human handoff trigger |

### Frontend — Next.js App Router

| File | Route | Purpose |
| :--- | :--- | :--- |
| `frontend/package.json` | — | Frontend dependencies (Next.js 14, React 18). Dev server on port 3001. |
| `frontend/tsconfig.json` | — | TypeScript config with `@/*` path alias mapping to `src/*`. |
| `frontend/next.config.js` | — | Proxies `/api/*` requests to the backend (`localhost:3000`). Single API surface. |
| `frontend/src/app/globals.css` | — | Global styles: CSS custom properties for font sizes, spacing, colours (all WCAG AA contrast). Skip-link for keyboard navigation. High-visibility focus indicators. Base font size 18px (larger than default for accessibility). |
| `frontend/src/app/layout.tsx` | — | **Root layout.** Skip-to-content link, accessible nav with `aria-label`, `<main id="main-content">` landmark, footer. Wraps all pages. |
| `frontend/src/app/page.tsx` | `/` | Home page. Welcome message + quick action links to correspondence, chat, and proxy. |
| `frontend/src/app/login/page.tsx` | `/login` | Singpass login page. Prominent sign-in button. Hotline number for users who need phone assistance. |
| `frontend/src/app/dashboard/page.tsx` | `/dashboard` | Dashboard. Sections for unread correspondence, pending actions, recent activity. Uses `aria-live` for dynamic content. |
| `frontend/src/app/correspondence/page.tsx` | `/correspondence` | Correspondence list. Search form, category filter nav (tax, health, housing, employment, legal). ARIA roles for search and navigation. |
| `frontend/src/app/correspondence/[id]/page.tsx` | `/correspondence/:id` | Correspondence detail. Breadcrumb nav, article content, action buttons: listen (TTS), ask PULSE, mark as read. Uses dynamic route param. |
| `frontend/src/app/chat/page.tsx` | `/chat` | **AI Chat interface.** Conversation log with `role="log"` and `aria-live`. Message input textarea. Language selector (4 official languages). Expandable dialect selector (Hokkien, Cantonese, Teochew, Hakka, Hainanese, Bazaar Melayu, Singapore Tamil). |
| `frontend/src/app/proxy/page.tsx` | `/proxy` | Proxy access management. List active proxy relationships. Form to grant new access with relationship type (family/caregiver/coordinator) and permissions (view, act, receive notifications). |
| `frontend/src/app/settings/page.tsx` | `/settings` | User preferences. Language & dialect selection (all official languages + all dialects in optgroups). Channel preference. Text size (normal/large/extra-large). High contrast toggle. Voice assist toggle. Notification toggles (SMS, email, push). |

---

## Current Project State

| Area | Status | Key Files |
| :--- | :--- | :--- |
| Architecture design | Complete | README.md, AGENT_ARCHITECTURE.md, CONTEXT.md |
| Backend gateway + routing | Scaffolded | `src/gateway/index.ts`, all `src/services/*/routes.ts` |
| Agent Orchestrator routing | Scaffolded | `src/agents/orchestrator/agent.ts`, `router.ts`, `registry.ts`, `routes.ts` |
| Agent domain placeholders | Scaffolded | `src/agents/domain/*/agent.ts` (5 files) |
| Agent language placeholders | Scaffolded | `src/agents/language/*/agent.ts` (4 files) |
| Agent dialect placeholders | Scaffolded | `src/agents/dialect/*/*/agent.ts` (12 files) |
| Frontend page routing | Scaffolded | `frontend/src/app/**/page.tsx` (9 pages) |
| Shared types & errors | Built | `src/shared/types/`, `src/shared/errors.ts`, `src/shared/logger.ts` |
| Middleware (auth, rate limit, tracing) | Built | `src/shared/middleware/` |
| Database schemas | Built (vertical slice) | `src/data/sqlite/schema.ts`, `src/data/docstore/` |
| Customer SQL store (SQLite) | Built — 150+ seeded personas | `src/data/customers/`, `src/scripts/personas.ts` |
| CPF knowledge store (MongoDB/file) | Built — live-fetched from cpf.gov.sg | `data/cpf-knowledge.json`, `src/data/knowledge/` |
| AI copilot (z.ai GLM, RAG) | Built | `src/services/ai/`, `src/services/copilot/` |
| Data & AI Console (frontend) | Built | `frontend/src/app/console/`, `frontend/src/lib/console/` |
| Adaptive-local service | Built | `src/services/adaptive-local/` (auth, friction, sessions, telemetry, CSO alerts, Hermes stub) |
| Shared contracts | Built | `src/shared/contracts/` (AI payload, escalation, friction, identity, telemetry, UI profile, validation) |
| Testing harness | Built | `src/testing/pulseTestHarness.ts`, `tests/` (contracts, CSO alerts, telemetry, Hermes boundary, UI profile) |
| Deploy kit | Built | `deploy/` (Caddyfile, ecosystem.config.cjs, setup-vps.sh), `DEPLOY.md` |
| **Live Telegram bot pipeline** | Built | `src/gateway/inbound.ts`, `src/gateway/telegram.ts`, `src/agents/query/`, `src/agents/triage/`, `src/agents/escalation/` |
| Integrated chatbot + CCU officer console | Built | `src/services/chatbot/`, `src/services/officer/`, `frontend/src/app/officer/` |
| HF bridge (STT / translate / detect / emotion / TTS) | Built — translation via GLM fallback (HF dropped SeamlessM4T) | `src/python-bridge/`, `src/shared/hf/` |
| Guiding questions (curated, interactive) | Built | `data/cpf-guiding-questions.json`, `src/data/knowledge/guiding.ts` |
| Message formatting (gov-standard, native-language) | Built | `src/shared/formatter.ts`, `src/agents/query/agent.ts`, `soul.md` |
| Emotion-driven tone adaptation (per-message + trajectory) | Built | `src/agents/main/tone.ts`, `src/agents/main/emotion.ts`, `src/agents/main/emotionTrajectory.ts`, `soul.md` |
| CSAT rating + session lifecycle (1–5 ⭐, 24h reset) | Built | `src/services/session/manager.ts`, `src/gateway/inbound.ts`, `src/gateway/telegram.ts`, `src/services/officer/service.ts` |
| Domain agent knowledge bases | Not started | `src/agents/domain/*/knowledge/` |
| Language glossaries | Not started | `src/agents/language/*/glossaries/` |
| Dialect glossaries | Not started | `src/agents/dialect/*/*/glossaries/` |
| External adapters (Singpass, Twilio, SingPost) | Not started | `src/adapters/` |
| CI/CD pipeline | Not started | `.github/workflows/` |
| Infrastructure as Code | Not started | `infra/` |

---

## Live Data Layer & AI Console (Vertical Slice)

A runnable DB → AI → UI slice was added on top of the scaffolding. It shows how the back end stores data, how new records are keyed in, how cases are brought up, and how the AI navigates the data in natural language.

### Two databases (per the architecture doc)

| Store | Tech | Holds | Code |
| :--- | :--- | :--- | :--- |
| **Customer / identity** | SQLite (`better-sqlite3`) | Members, CPF accounts (OA/SA/MA/RA), vulnerability markers, correspondence cases + case events | `src/data/sqlite/`, `src/data/customers/` |
| **CPF knowledge / documents** | MongoDB (Atlas) with **embedded file fallback** | CPF sections, ~31 knowledge documents, terminology — live-fetched from cpf.gov.sg | `src/data/docstore/`, `src/data/knowledge/` |

The document store is an adapter (`DocumentStore`): `DOC_STORE_BACKEND=mongo` uses Atlas (`MONGODB_URI`) and **auto-falls back to the file store** if the cluster is unreachable, so the stack always runs. SQLite = the "Azure SQL" equivalent; Mongo = the "Cosmos DB" equivalent.

### Seed data

`npm run db:seed` generates **~150 representative Singaporean members** (realistic ethnic name mix, ages skewed toward the seniors PULSE serves, dialects, employment, age-appropriate CPF balances, vulnerability markers, support tiers) and **189+ correspondence cases** with timelines. It also loads `data/cpf-knowledge.json` into the document store. Deterministic (seeded RNG) so reseeds are stable. `SEED_COUNT=200 npm run db:seed` to change the count.

### AI copilot (RAG)

- **LLM client** (`src/services/ai/llmClient.ts`): provider-agnostic, OpenAI-compatible. Defaults to **z.ai GLM** (`LLM_BASE_URL=https://api.z.ai/api/coding/paas/v4`, `LLM_MODEL=glm-4.6`). Key in `.env` as `LLM_API_KEY`.
- **Copilot service** (`src/services/copilot/service.ts`): natural-language question → searches the CPF knowledge store → optionally loads the selected member from SQLite → builds a grounded, data-minimised prompt → returns the answer, **citations** (linking to cpf.gov.sg), a **navigation trace** (the steps the AI took across both DBs), and the member context used. Falls back to a deterministic grounded answer if the LLM is unavailable. Never invents CPF figures; warns about scams; never asks for passwords/OTP.

### Frontend: `/console` (Data & AI Console)

`frontend/src/app/console/page.tsx` — browse/search/filter the customer DB, open a member to see CPF accounts + markers + cases (expandable timelines), **key in a new member** (system derives tier/markers/CPF account), browse the CPF knowledge DB, and chat with the AI copilot (with citations + the live navigation trace). Linked in the top nav as **Data & AI**.

### Backend endpoints

```text
GET   /api/v1/console/stats                 # dashboard counts (customers, cases, knowledge, AI status)
GET   /api/v1/console/customers?search&ageBracket&tier
GET   /api/v1/console/customers/:id
POST  /api/v1/console/customers             # key in a new member
GET   /api/v1/console/cases?status&category&priority&search
GET   /api/v1/console/cases/:id
POST  /api/v1/console/cases                 # open a case for a member
POST  /api/v1/console/cases/:id/events      # append to a case
PATCH /api/v1/console/cases/:id/status
GET   /api/v1/console/knowledge             # sections + documents + terminology
GET   /api/v1/console/knowledge/search?q=
POST  /api/v1/copilot/chat                  # { question, userId?, history? }
```

### How to run

```bash
npm install                 # installs better-sqlite3, mongodb, etc.
# put LLM_API_KEY (and optionally MONGODB_URI) in .env  — see .env.example
npm run db:seed             # creates SQLite schema, seeds 150 members + CPF knowledge
npm run dev                 # backend :3000 + frontend :3001  → open http://localhost:3001/console
```

New env vars (see `.env.example`): `SQLITE_PATH`, `DOC_STORE_BACKEND`, `DOC_STORE_PATH`, `MONGODB_URI`, `MONGODB_DB`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_TIMEOUT_MS`.

---

## Integrated Chatbot, Messaging Escalation & CCU Officer Console

The "Open Integrated ChatBot" node from the system diagram, built as three swappable, modular subsystems. Citizens chat on the CPF website, CPF app, or a messaging channel; SIMPLE requests are answered inline (grounded in MongoDB CPF knowledge); COMPLEX/private/unique requests escalate to a Customer Correspondence Unit (CCU) officer who replies from a local dashboard, delivered back over the citizen's channel.

### Swappable subsystems (config-driven, no code change to switch)

| Subsystem | Interface | Active now | Swap to | Flag |
| :--- | :--- | :--- | :--- | :--- |
| **AI provider** | `AiProvider` (`src/services/ai/providers/`) | **z.ai GLM** (real, MongoDB-grounded) | **Hermes.AI** (placeholder until VPS endpoint wired) | `AI_PROVIDER=zai\|hermes` |
| **Messaging channel** | `MessagingChannel` (`src/services/messaging/`) | **Telegram** (real, long-polling) | **WhatsApp** (Cloud API stub) | `MESSAGING_CHANNEL=telegram\|whatsapp` |

All config lives in one typed loader: `src/config/integration.ts` (reads `.env`).

### Flow

```
Citizen (web / app / Telegram)
  → POST /api/v1/chatbot/message  →  ChatbotService
      → retrieve CPF knowledge (MongoDB)  →  analyse (emotion / confidence / urgency / complexity)
      → SIMPLE   → AiProvider answers (z.ai GLM) — deterministic grounded fallback if no key
      → COMPLEX  → EscalationService → persist to MongoDB + notify officer channel
                     → CCU Officer Console (/officer) → officer reply → MessagingChannel → citizen
```

The chatbot's per-turn analysis (emotion, confidence %, urgency) drives the CPF Queries Dashboard cards. Conversation + AI context window persist in the document store (`chat_sessions`, `cso_escalations` collections), so the officer sees full context on pickup.

### New collections (document store)

`chat_sessions` — chatbot conversations + context window. `cso_escalations` — escalations surfaced to the CCU. `cpf_guiding_questions` — curated guiding-question sets (see "Guiding Questions" below).

### Message formatting & language layer

Bot answers follow a **government content standard** (GOV.UK content design + Singapore SGDS): front-load the answer, ≤25-word sentences, no "walls of text", scannable bullets, plain words, expand acronyms, reading age ~9. Enforced in two places:

- **Generation (the real concision mechanism):** `BASE_SYSTEM_PROMPT` (`src/agents/query/agent.ts`) tells the LLM to lead with one direct sentence, stay under ~120 words (lead + 2–4 short bullets), begin with **one** topic emoji (💰/🏠/🏥/📅/ℹ️) — minimal/professional, no decoration — quote exact figures, and end with the cpf.gov.sg link.
- **Deterministic formatter (`src/shared/formatter.ts`, language-agnostic):** `formatReply` keeps strip→structure→escape→bold, plus a **bullet cap (≤6)** and **`capLength` (~900 chars, applied BEFORE escape/bold)** that trims to the last complete sentence — Latin `.!?` **and CJK `。！？`** — preserving a trailing cpf.gov.sg URL. Backstops Telegram's 4096 limit; emojis pass through.

**Language: native generation.** The LLM generates **directly in the user's language** (rule 7 + the `Respond in: <lang>` hint; `detectLanguage` selects it). The two calls that re-translated the LLM's *own* reply were removed — translating a native reply would double-translate. The deterministic formatter is language-agnostic, so emojis + `$`/`%` bolding survive.

**`translateText` resilient (HF → LLM fallback).** HF migrated to "Inference Providers" and **de-listed SeamlessM4T-v2** from the free `hf-inference` provider (hard 400). `src/python-bridge/client.ts` `translateText` now tries HF first, then **falls back to the LLM (GLM)** — validated clean zh/ms/ta. This keeps officer↔citizen relay, guided-question text, and UI-string translation working. The translation feature + cache are otherwise untouched.

**Emotion-driven tone.** The same per-message sentiment (`scoreEmotion` → 0–100 + neutral/sad/frustrated/angry/rage) that drives the dashboard + escalation now also **adapts the query bot's tone**. `src/agents/main/tone.ts` `toneDirective(score,label,sustained)` returns a self-contained tier directive (null for neutral) that `buildSystemPrompt` injects into the query prompt; the policy also lives in `soul.md` ("Adapting your tone"). (The `sustained` flag is set by the trajectory layer below.) `inbound.ts` awaits the current-turn emotion just before `runQueryAgent` (it's pre-running, so ~0 added latency) and passes it in. Angrier callers get a **warmer, less-formal, empathy-first, de-escalating** reply that still **gives the full answer + figures** (tone softens, content doesn't — a false high-emotion read must not strip the answer) and never names the caller's emotion back to them. The emotion **tier is part of the response-cache key** (else a soothing reply would be served from a neutral cache entry). Caveat: `detectEmotion` is English-trained, so tone is most reliable for English/Singlish.

**Trajectory layer (adaptability).** On top of the per-message read, `inbound.ts` folds this turn together with the recent emotional trajectory of the conversation into one **effective emotion** (`src/agents/main/emotionTrajectory.ts` `effectiveEmotion`) before calling `runQueryAgent`, so the bot reacts to the *trend* ("getting angrier"), not just the latest message. Rule: trajectory only ever **raises** soothing, never lowers it below the current message — `effectiveScore = max(currentScore, recencyWeightedAvg(recent + current))`. So a real spike soothes immediately, a caller who cooled-but-was-just-hot stays soothed (safe direction), and a single stray spike in calm history decays away (recency-weighted, current dominates). The recent scores come only from **scored** user turns in the conversation history (the guided-questions path stores unscored turns — filtered out). A `sustained` flag (≥2 of last 3 user turns above the angry band) adds an "ongoing difficulty" acknowledgement via a `toneDirective` branch and is keyed into the response cache. Cold start (0–1 prior turns) ≈ current message, so turn 1 is unchanged. Pure-function behaviour (rising/falling/spike-in-calm/cold-start/sustained) is unit-tested in `emotionTrajectory.test.ts`. Trajectory smoothing **reduces noise** (false spikes); it does **not** correct the English model's systematic under-read of zh/ms/ta. Escalation stays in `analyzeEscalation` (a sustained-anger→officer rule is a possible follow-up, deliberately out of the tone layer).

**CSAT rating + session lifecycle.** A bot chat has no natural "end", so `src/services/session/manager.ts` gives it one. A per-user in-memory **session** record tracks `lastActivityAt` (refreshed each turn via `touchSession` in `inbound.ts`). The session ENDS and the bot sends a **1–5 ⭐ rating prompt** (Telegram inline keyboard `rate:<sessionId>:<n>`; WhatsApp = "reply 1–5" text, since Twilio has no buttons) when: (1) a CCU officer closes the case (`closeSession` → `endSession(userId,"officer",{queueId})`, which replaces the old plain close message), or (2) the customer signals they're done — a short, question-free sign-off (`isClosingMessage`, English/Singlish heuristic) **or** the `/end` command. The star tap is handled in `telegram.ts` (`recordRating`): it stores the rating, ties it to the escalated case via `setQueueRating` (so the officer dashboard shows CSAT — `rating` field on `QueueEntry`, Mongo-persisted), broadcasts `rating_received`, sends a thank-you, and **resets the chat**. **Reset** (`resetSession`) clears the conversation history + interaction flags so the next message starts fresh. The session model owns the conversation history (moved out of `inbound.ts` so officer-close/satisfied/timeout can all reset from one place). A **24h inactivity sweep** (`startSessionTimeoutSweep`, started in `gateway/index.ts`, every 30 min) **silently resets** idle sessions — no rating ping for someone who already left. Sessions + bot-only ratings are **in-memory** (lost on restart, which also drops live 24h timers); escalated-case ratings survive via the Mongo-backed queue. The closing-phrase detector is English/Singlish only — non-English users end via `/end` or the timeout. Pure logic (`isClosingMessage`, `isSessionExpired`, sweep, stale-tap rejection) unit-tested in `manager.test.ts`.

### Guiding Questions (interactive Telegram answers)

Broad questions need personalising before a useful answer is possible (e.g. "How much CPF LIFE payout will I get?" depends on the user's age, plan and target sum). Instead of a generic one-shot reply, the bot runs an **interactive slot-filling flow**: classify the topic → pull a curated guiding-question set from MongoDB → ask the questions **one at a time** → synthesise a tailored answer from the user's replies. The bot can't read the user's account, so it *asks*.

**When it triggers.** Only when the triage classifier (`classifyQuery`) returns **Category 2** (broad/personalised) AND the query's topic has a guiding set AND the user isn't asking for an officer AND emotion ≤ 70 (a distressed user routes to the normal escalation path instead). Specific factual questions (Cat-1, e.g. "what is the Full Retirement Sum?") and personal-account questions (Cat-3) are unaffected.

**Flow** (`src/gateway/inbound.ts`):
```
Cat-2 question
  → findGuidingSetForQuery(text)            # topic = searchKnowledge top-1 sectionKey → matching set
      → set prefs.pendingGuiding{questions, answers:[], index:0, knowledge captured once}
      → ask Question 1 immediately          # NO preamble; reclaims the 💭 thinking bubble into Q1
Each following message is intercepted (before the LLM):
  → recordGuidingAnswer() records it, advances index
      → more questions? send next one       # ≤2 sentences. choice→buttons (guide:<id>:<idx>);
                                             #   open→inline "(for example: …)"; "or type your answer"
      → all answered? synthesizeGuidedAnswer(knowledge + Q&A, lang) → tailored reply (user's language)
                       + officer button (Cat-2 boundary still applies) + clear pendingGuiding
```
Escape hatches mid-flow: an explicit officer/human request escalates; "cancel"/"stop" exits. A bare "yes"/"ok" is treated as an *answer* (not an officer request), via the stricter `isExplicitOfficerRequest`.

**Curated, keyed by topic.** Sets live in `data/cpf-guiding-questions.json` (fields: `topicKey`, `aliases`, `title`, `intro`, `questions[{id,text,type,options}]`, `synthesisHint`) → seeded into `cpf_guiding_questions` by `npm run db:seed`. The LLM ("Hermes" = `callHermes`, z.ai GLM) only classifies the topic and writes the final answer — no question generation, so no structured-output dependency.

**Section-key drift (important).** The knowledge store's `sectionKey` vocabulary differs across environments: the committed `data/cpf-knowledge.json` uses `retirement-income`/`growing-savings`/`home-ownership`, but the **live Atlas** currently holds a different dataset using `retirement`/`topups`/`housing`. Each guiding set carries an `aliases` list so it matches **whichever vocabulary is loaded** — `findGuidingSetForQuery` matches `topicKey` OR any alias. ⚠️ Do **not** run `npm run db:seed` from this dev checkout expecting the live Atlas knowledge to match the seed file — they have diverged; re-seeding replaces shared Atlas knowledge.

**Trigger coverage.** Cat-2 regexes in `src/agents/triage/classifier.ts` are brittle on word adjacency (e.g. "how much **CPF LIFE** payout" slipped past the old patterns). Looser patterns were added for the guided topics; when adding a topic, extend/verify `CAT2_PATTERNS` and trace phrasings through `classifyQuery`.

**State** (`pendingGuiding` on the in-memory `UserPrefs`) does not survive a backend restart — same trade-off as `pendingOfficerOffer`. Key files: `src/data/knowledge/guiding.ts` (retrieval), `src/agents/query/guidedSynthesis.ts` (synthesis), `src/gateway/inbound.ts` (state machine), `src/gateway/telegram.ts` (`guide:*` button routing).

### Backend endpoints

```text
# Integrated chatbot (web / app / messaging all enter here)
GET   /api/v1/chatbot/health                 # active AI provider + messaging channel + readiness
POST  /api/v1/chatbot/message                # { message, channel?, sessionId?, memberId?, ... }
GET   /api/v1/chatbot/session/:sessionId

# Messaging channel (Telegram polls automatically; webhook for prod/WhatsApp)
GET   /api/v1/messaging/health
GET   /api/v1/messaging/webhook              # WhatsApp verification handshake
POST  /api/v1/messaging/webhook              # inbound push (prod)

# CCU officer console (the local dashboard)
GET   /api/v1/officer/dashboard              # stats + open/inactive chats + incoming queries rail
GET   /api/v1/officer/conversation/:sessionId
POST  /api/v1/officer/conversation/:sessionId/reply    # { officer, message } → delivered to citizen
POST  /api/v1/officer/conversation/:sessionId/close
POST  /api/v1/officer/escalations/:escalationId/acknowledge
```

### Frontend: `/officer` (CPF Queries Dashboard)

`frontend/src/app/officer/page.tsx` — the CCU officer console: live stat cards (open chats, incoming, avg response, resolved today), Open Chats grid (emotion chip + confidence bar + urgency dot), Incoming Queries rail, Inactive Chats, and a conversation drawer with three panes — left **CHAT HISTORY** (citizen↔bot, with per-message sentiment chips), middle live officer↔citizen thread + reply box, right **member profile** ("Singpass record"). Replies are delivered back over Telegram/WhatsApp. **Open chats / incoming** count the live+mock queues; **resolved today** increments on each Resolve click this session; **avg response time** is the mean **accept→resolve** elapsed time over cases handled this session (stamped on `accept`, measured on `resolveCase` in `CpfDashboard.jsx`; both are client-session state, reset on reload, and update live).

**Live monitoring (WebSocket).** The dashboard subscribes to `/dashboard/ws` for instant updates; the 4s poll is the fallback. The backend broadcasts `{ event, payload, ts }` — clients MUST read `event` (not `type`). Events: `new_queue_entry`, `queue_updated`, `officer_assigned`, `case_resolved`, `user_message`, `officer_message`, `emotion_update`, `rating_received` (1–5 ⭐ CSAT submitted; payload `{ userId, sessionId, queueId, stars, reason, channel, ts }`). NOTE: the socket connects DIRECT to the backend `:3000` (it bypasses the Next `/api/*` proxy), so in production the reverse proxy must also forward `/dashboard/ws` or live push silently degrades to polling.

**Button → dashboard handover.** When the citizen taps **Connect to CPF Officer** in Telegram, `escalateUser` (`src/gateway/inbound.ts`) creates the queue entry and the case appears on the dashboard immediately. From then on the bot stops answering: every further Telegram message hits the active-queue relay branch and is forwarded to the officer (auto-translated to English), and the officer's replies from the dashboard are translated back and sent to Telegram — same chat session, human instead of bot. Opening a case auto-`acknowledge`s it (`waiting → assigned`), moving it from the Incoming rail to Open Chats. The auto-acknowledgement "Message received — an officer will reply shortly" is sent ONLY while the case is still `waiting` (un-picked-up); once an officer is engaged (`assigned`), the citizen's messages relay **silently** so the bot doesn't interrupt the live officer conversation.

**Officer summary (provisional → background AI upgrade).** The case posts **immediately** with a NON-LLM provisional summary so escalation never blocks on a slow model. `pickProvisionalSummary` (`inbound.ts`) takes the most recent *substantive* user message — `isBareTriggerPhrase` skips bare escalation triggers ("officer please", "yes", "connect me") — else a clean "User requested a CPF officer." default. Then a **fire-and-forget** background task runs the GLM summariser (`summariseQueryForOfficer`, now a 25s budget vs the old blocking 8s) and, on success, patches the case via `setQueueQuerySummary` + `notifyQueueUpdated` → the dashboard live-refreshes on the `queue_updated` event. Net: the summary appears in two stages (plain instantly, polished a few seconds later) and a slow/failed GLM call silently keeps the good provisional instead of surfacing a raw trigger word. Background-only when there's real conversation + no preset (voice-unclear presets are authoritative). Root cause of the old "officer please" summary: the inline 8s `Promise.race` timed out under GPU contention and fell back to the citizen's last message — which was the escalation phrase.

**Citizen name on the dashboard.** Telegram users carry a real name, so the officer dashboard shows it instead of a placeholder. Every inbound Telegram message captures the sender's name (`from.first_name` + `last_name`, else `@username`) into the user's prefs as `display_name` (merged via `upsertUserPrefs`, so language/voice settings are preserved — `src/gateway/telegram.ts`). At escalation, `doEscalate` (`src/gateway/inbound.ts`) reads it back from prefs and stamps `display_name` onto the `QueueEntry` (Mongo-persisted by `postToQueue`, served by `GET /dashboard/queue`). The frontend `buildPerson` (`CpfDashboard.jsx`) renders `entry.display_name`, falling back to a derived label (`Telegram user 1234`) when the channel gave no name — this replaces the previously hardcoded "Nathaniel Neo". The financial/identity fields (NRIC, balances, age) still come from a deterministically hash-picked mock profile (`MOCK_PROFILES`); only the **name** is now real. The chat ID needs no change — `entry.userId` is already `tg:<chatId>`, the real Telegram chat that officer replies route back to (`dashboard.ts`).

**Telegram webhook requirement.** The escalation button is an inline button → its press is a `callback_query` update. The webhook MUST be registered with `allowed_updates` including `callback_query` (`["message","edited_message","callback_query"]`) or button presses are silently dropped and nobody can escalate. `npm run post` (POST.md) verifies and auto-repairs this.

**Seeding member data.** `npm run db:seed` generates ~150 random members; `npm run db:seed:named` (`src/scripts/seed-named.ts`) inserts a fixed set of hand-specified members with explicit OA/SA/MA balances (additive + idempotent). Both write to `SQLITE_PATH` from `.env` (default `./data/pulse-customers.db`) — seed scripts MUST `import "dotenv/config"` or they write to the wrong DB file.

**"Thinking" animation (bot reply wait).** While the LLM/query pipeline composes a reply (often 30–90s), the Telegram bot shows a 💭 dot hopping left→right, editing ONE bubble (~2s/frame) plus the native "typing…" action. When the answer is ready that same bubble is edited into the final reply (with the officer button when escalating) — no extra bubbles. Code: `src/gateway/thinking.ts` (`startThinking` → `{ messageId, stop }`), `InboundChannel.sendForEdit`/`editMessage`/`deleteMessage`/`typing` (Telegram implements; WhatsApp degrades to typing-only), and `editTelegramMessage`/`sendChatAction` in the Telegram client. Best-effort throughout (a glitch never drops a reply); a max-lifetime timer guarantees the interval can't run forever. Interval is ~2s deliberately — Telegram allows ~1 edit/sec/chat, and the final answer is also an edit to that chat.

**Sentiment.** Emotion is scored per message during the bot phase AND on relayed post-escalation messages (HF text + audio emotion → `scoreEmotion`, 0–100). Scores ride along on each user turn in the case history and render as chips; `emotion_score > 70` auto-offers the officer button.

**Member profile.** `getConversation` (`src/services/officer/service.ts`) builds the right panel via `resolveMemberProfile` (SQLite customer store), guarded so a missing/un-seeded DB falls back to a minimal record instead of a 500. Anonymous Telegram users get a representative record labelled "Representative record (demo)", and the real `tg:<chatId>` is surfaced. Seed real customer data with `npm run db:migrate && npm run db:seed`.

Linked in the top nav as **CCU Dashboard**.

New env vars: `AI_PROVIDER`, `HERMES_BASE_URL`, `HERMES_API_KEY`, `HERMES_MODEL`, `MESSAGING_CHANNEL`, `TELEGRAM_MODE`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OFFICER_CHAT_ID`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`.

---

## Reference Documents

| Document | Purpose |
| :--- | :--- |
| [README.md](./README.md) | Full project documentation — pillars, architecture, setup, contributing |
| [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md) | Complete AI agent system specification — agents, communication, OpenClaw integration, safety |
| [CONTEXT.md](./CONTEXT.md) | This file — consolidated quick reference |
| [DEPLOY.md](./DEPLOY.md) | VPS deployment guide — Caddy reverse proxy, PM2 ecosystem, setup script |
| [POST.md](./POST.md) | Backend Power-On Self-Test — `npm run post`; run on every backend start/restart |
| [adaptive-service-architecture-documentation.md](./adaptive-service-architecture-documentation.md) | Adaptive service architecture deep-dive — friction, telemetry, CSO alerts, Hermes integration |

---

## Hermes Coding Agent

Hermes is a coding agent (NousResearch/hermes-agent) running on this VPS, accessible via Telegram (@SDS_Pulse_Bot). Its sole purpose is to build, edit, and modify code within this project directory.

- **Install location**: `/nat/hermes-agent/` (installed directly, not Docker)
- **Config home**: `~/.hermes/` (SOUL.md, config.yaml, .env, gateway logs)
- **Scope**: Only `/nat/Project-PULSE/` — reads, writes, builds, tests within this directory
- **Access**: Telegram bot (@SDS_Pulse_Bot), gateway runs as systemd user service
- **LLM**: Z.AI GLM-4.5-flash via `https://api.z.ai/api/coding/paas/v4`
- **SOUL.md**: Defines Hermes as a coding agent that builds PULSE features end-to-end and escalates to the developer on ambiguity/blockers

### Gateway Management

```bash
hermes gateway status                # check if running
hermes gateway restart              # restart after config changes
tail -f ~/.hermes/logs/gateway.log  # view live logs
hermes gateway run                  # run in foreground (for debugging)
```
