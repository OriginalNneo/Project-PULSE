# Project Context — PULSE Framework

> **Quick-reference document for anyone working on Project PULSE.** This file consolidates the project's purpose, architecture decisions, conventions, and current state into a single source of truth. For deep technical detail, refer to [README.md](./README.md) and [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md).

---

## Project Identity

| Field | Value |
| :--- | :--- |
| **Name** | PULSE — People-centric Framework for Correspondence (PFC) |
| **Type** | SaaS platform + AI multi-agent system |
| **Purpose** | Transform Singapore government correspondence into adaptive, inclusive, accessible communications for vulnerable citizens |
| **Status** | Scaffolding complete — routing, agents, frontend pages built |
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

## Reference Documents

| Document | Purpose |
| :--- | :--- |
| [README.md](./README.md) | Full project documentation — pillars, architecture, setup, contributing |
| [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md) | Complete AI agent system specification — agents, communication, OpenClaw integration, safety |
| [CONTEXT.md](./CONTEXT.md) | This file — consolidated quick reference |
| [DEPLOY.md](./DEPLOY.md) | VPS deployment guide — Caddy reverse proxy, PM2 ecosystem, setup script |
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
