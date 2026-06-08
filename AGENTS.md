# Project PULSE — Workspace Instructions for Hermes

## Project Overview
- **Name**: PULSE — People-centric Framework for Correspondence (PFC)
- **Purpose**: Transform Singapore government correspondence into adaptive, inclusive, accessible communications for vulnerable citizens
- **Location**: /nat/Project-PULSE/
- **Status**: Scaffolding complete — services, agents, frontend pages built. DB schemas, knowledge bases, glossaries, and tests not yet started.

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
