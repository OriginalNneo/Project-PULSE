# The PULSE Framework (PFC)

> **People-centric Framework for Correspondence**

In response to the rapid acceleration of Singapore's digital transformation, vulnerable citizens—including seniors, persons with disabilities, and individuals with low digital literacy—frequently face systemic barriers when navigating critical institutional correspondence.

**PULSE** shifts the paradigm of service delivery from uniform automation to empathetic, adaptive engagement. By actively keeping a finger on the "pulse" of the community, this framework ensures that digital inclusion is built into the core system workflow rather than treated as an afterthought.

---

## Table of Contents

- [Background & Motivation](#background--motivation)
- [Core Pillars](#-core-pillars-of-pulse)
- [Project Goals & Impact](#-project-goals--impact)
- [System Architecture](#-system-architecture)
- [Edge & Security Perimeter](#ring-1--edge--security-perimeter)
- [API Gateway](#ring-2--api-gateway)
- [Application Services (Modular Core)](#ring-3--application-services-modular-core)
- [Data & Integration Layer](#ring-4--data--integration-layer)
- [AI Agent System (OpenClaw)](#-ai-agent-system-openclaw)
- [Cross-Cutting Concerns](#cross-cutting-concerns)
- [Key Features](#-key-features)
- [User Journeys](#-user-journeys)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Team](#-team)
- [License](#-license)

---

## Background & Motivation

### The Problem

Singapore's Smart Nation initiative has digitised the majority of public service touchpoints. While this benefits the digitally fluent majority, it creates a widening accessibility gap for:

| Vulnerable Group | Key Challenge | Estimated Population |
| :--- | :--- | :--- |
| **Seniors (65+)** | Low digital literacy, fear of scams, declining vision | ~1 in 4 citizens by 2030 |
| **Persons with Disabilities** | Screen-reader incompatibility, cognitive overload in complex forms | ~3.4% of resident population |
| **Low Digital Literacy Individuals** | Unfamiliarity with gov portals, language barriers, tech anxiety | Underserved across all age groups |

These groups encounter critical friction when interacting with institutional correspondence — tax notices, healthcare appointments, housing letters, and benefits disbursements. The consequences of failed correspondence are severe: missed medical treatments, unpaid fines, lost benefits, and erosion of trust in public institutions.

### Our Response

PULSE is not a product — it is an **architectural blueprint and design philosophy**. It can be applied to any digital correspondence system to transform high-friction touchpoints into reassuring, inclusive user journeys.

---

## Core Pillars of PULSE

To dismantle digital exclusion and bridge the gap between analog trust and digital efficiency, the PULSE framework operates on four foundational pillars:

### P — People-Centric

> Focus on the human, not the demographic.

Design context-aware communication flows that automatically adapt to detected user vulnerability markers. The system treats each individual as a unique case rather than a demographic bucket, adjusting tone, channel, complexity, and support level in real time.

**Design Principles:**
- Detect vulnerability signals (e.g., repeated failed logins, long idle times, bounced digital notifications) and escalate support automatically.
- Use plain language scored against readability benchmarks (target: Primary 6 reading level).
- Offer human-agent fallback at every decision point — never trap users in a purely automated loop.

### U — Universal

> Accessibility by default, not by retrofit.

Every component, layout, and interaction pattern meets or exceeds WCAG 2.2 AA standards from inception. No user should need to request accommodation — it is the default experience.

**Design Principles:**
- High-visibility UI components with a minimum 4.5:1 contrast ratio.
- Simplified language patterns validated against the Simple English Corpus.
- Intuitive multi-channel routing — the same message reaches the user via their preferred and most accessible channel.
- Responsive layouts tested across devices commonly used by seniors (larger-screen phones, tablets).

### L — Linked

> Seamless analog-to-digital bridges.

Many vulnerable users trust physical mail more than digital notifications. Rather than forcing digital adoption, PULSE creates a continuum between physical and digital channels — using one to reinforce and ease adoption of the other.

**Design Principles:**
- Physical mail includes scannable QR codes, large-print URLs, and hotline numbers that link to personalised digital assist flows.
- Secure voice-assist integration: users can call a hotline and have the system read their correspondence aloud with identity verification via NRIC + voice biometrics.
- Community-trusted proxies: authorised family members or care coordinators can assist through a secure delegated-access portal.
- Text-to-speech for all digital correspondence with adjustable speed and language selection (English, Mandarin, Malay, Tamil).

### S — Secure & Supportive

> Empowering without exposing.

Vulnerable users are disproportionately targeted by scams and phishing. PULSE builds trust through transparent, high-touch verification pathways that are scam-resistant by design.

**Design Principles:**
- All correspondence carries a unique, verifiable reference code that can be cross-checked via an official hotline.
- No links in SMS/email notifications — users are directed to type a known gov.sg URL manually.
- Two-factor identity confirmation for sensitive actions (e.g., confirming medical appointments, updating personal data).
- Proactive scam alerts and education woven into the correspondence flow itself.

---

## Project Goals & Impact

Our application of the PULSE framework to the **Inclusive Digital Correspondence Service Redesign** focuses on transforming high-friction touchpoints into reassuring user journeys:

### Eliminating Uniform Treatment

Replace rigid "one-size-fits-all" automated notifications with adaptive support pathways. The system detects user context and adjusts:
- **Communication complexity** — simplified language, fewer steps, larger text.
- **Channel selection** — physical letter, SMS with voice-assist prompt, in-app notification, or phone callback.
- **Support intensity** — self-service for confident users; guided walkthrough for users showing signs of difficulty.

### Proactive Intervention

Trigger high-touch pathways **before** a vulnerable member experiences digital drop-off. The system monitors engagement signals and intervenes early:
- If a digital notification is unopened after 48 hours → trigger a follow-up SMS with simplified summary.
- If no action taken after 5 days → initiate an automated voice-guided callback offering to walk the user through the correspondence.
- If repeated failed interactions detected → flag for community coordinator outreach.

### Fostering Autonomy

Restore confidence to the estimated **1 in 4 Singaporeans** projected to be over 65 by 2030, ensuring they can access essential public services with dignity and independence. Success is measured not just by task completion rates, but by:
- Reduced anxiety scores in post-interaction surveys.
- Increased repeat engagement without human assistance.
- Decreased time-to-completion over successive interactions (learning curve flattening).

---

## System Architecture

The PULSE platform is built as a **modular, event-driven SaaS** following a concentric-ring security model. Each ring inward is more protected and more specific. Every ring communicates only through well-defined contracts. Nothing reaches inward without passing through the layer above it.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTERNET / CLIENTS                           │
│                    (Browsers, Mobile, IVR, SMS)                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RING 1 — EDGE & SECURITY PERIMETER                                │
│  CDN → WAF → DDoS Protection → SSL Termination                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RING 2 — API GATEWAY                                              │
│  Auth Verification → Rate Limiting → Request Routing → Logging     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RING 3 — APPLICATION SERVICES (Modular Core)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │Correspond-│ │Vulnerab- │ │Adaptation│ │ Delivery  │              │
│  │ence Svc  │ │ility Svc │ │  Engine  │ │Orchestr.  │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │Proxy Svc │ │Analytics │ │ Notific. │ │ Billing   │              │
│  │          │ │   Svc    │ │   Svc    │ │   Svc     │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                         EVENT BUS                                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RING 4 — DATA & INTEGRATION LAYER                                 │
│  PostgreSQL │ Redis │ S3 │ Kafka │ External API Adapters           │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Layers

| Layer | Responsibility |
| :--- | :--- |
| **Ingestion Layer** | Receives raw correspondence data from upstream government agencies and normalises it into a unified schema. |
| **Vulnerability Detection** | Analyses user profile and behavioural signals to assign a support-tier classification (self-service / guided / high-touch). |
| **Orchestration & Routing** | Determines the optimal channel(s), timing, and support level for each correspondence based on the vulnerability assessment. |
| **Adaptation Engine** | Modifies template content — simplifies language, adjusts formatting, selects language, and generates multi-format outputs (print, audio, screen-reader-optimised HTML). |
| **Delivery & Personalisation** | Handles multi-channel dispatch — physical mail integration (with SingPost), SMS, in-app push, email, and voice-assist callback scheduling. |
| **Engagement Analytics** | Tracks open rates, action completion, time-to-completion, drop-off points, and user feedback to continuously refine vulnerability detection and adaptation rules. |

---

## RING 1 — Edge & Security Perimeter

The first line of defence. Nothing gets past this without permission.

```
Client Request
     │
     ▼
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌────────────┐
│   CDN    │───▶│   WAF    │───▶│ DDoS Shield  │───▶│   TLS/SSL  │
│(CloudFront│    │(AWS WAF/ │    │(Cloudflare/  │    │Termination │
│ /Cloudflare)│   │ Cloudflare)│  │ AWS Shield)  │    │            │
└──────────┘    └──────────┘    └──────────────┘    └────────────┘
```

| Component | What It Does | Why It Matters |
| :--- | :--- | :--- |
| **CDN** | Caches static assets (JS, CSS, images) at edge locations worldwide. | Users get sub-100ms load times. Backend never sees static requests. |
| **WAF** | Inspects every HTTP request for SQL injection, XSS, known attack patterns. | Blocks 99% of automated attacks before they reach your code. |
| **DDoS Shield** | Absorbs volumetric attacks (millions of requests/sec). | Servers stay up even under attack. |
| **TLS Termination** | Decrypts HTTPS at the edge so the backend doesn't waste CPU on it. | Encryption in transit is enforced. Backend focuses on logic. |

### Security Headers (Enforced at the Edge)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

These prevent clickjacking, MIME sniffing, and protocol downgrade attacks. Non-negotiable for a system handling citizen data.

---

## RING 2 — API Gateway

The single entry point for all application traffic. Every request passes through here. This is where we enforce **who** can do **what**, **how often**.

```
Incoming Request
     │
     ▼
┌──────────────────────────────────────────────────┐
│                  API GATEWAY                      │
│                                                   │
│  1. Verify JWT / Session Token                    │
│  2. Check Rate Limits (per user, per tenant)      │
│  3. Validate request schema                       │
│  4. Attach correlation ID (for tracing)           │
│  5. Route to correct service                      │
│  6. Log request metadata (not bodies)             │
│                                                   │
└──────────────┬───────────────────────────────────┘
               │
        ┌──────┼──────┬──────┬──────┐
        ▼      ▼      ▼      ▼      ▼
     Svc A   Svc B  Svc C  Svc D  Svc E
```

### Authentication Flow

```
┌────────┐         ┌────────┐         ┌──────────┐
│ Client │──(1)───▶│  Auth  │──(2)───▶│ Identity │
│        │         │ Service│         │ Provider │
└────────┘         └────────┘         │(Singpass)│
     ▲               │                 └──────────┘
     │               ▼                          
     │         ┌──────────┐                    
     │         │ Issue JWT│                    
     │         │ + Refresh│                    
     │         │  Token   │                    
     │         └──────────┘                    
     │               │                          
     │    ┌──────────▼──────────────────────────────────┐
     │    │  JWT contains:                               │
     │    │  { sub: user_id,                             │
     │    │    tenant_id: "...",                         │
     │    │    roles: ["user", "proxy"],                 │
     │    │    iat: ..., exp: ...,                       │
     │    │    jti: "unique-token-id" }                  │
     │    └─────────────────────────────────────────────┘
     │                                                
     └────────────────── JWT in httpOnly cookie ◀────────
```

**Token Strategy:**

| Token | Lifetime | Storage | Purpose |
| :--- | :--- | :--- | :--- |
| **Access Token** (JWT) | 15 minutes | httpOnly cookie | Contains user ID, tenant, roles. Verified at gateway. |
| **Refresh Token** | 7 days | httpOnly cookie + hashed in DB | Rotated on every use. Enables seamless re-authentication. |
| **Token Revocation** | Until expiry | Redis (TTL = token expiry) | Revoked JWT IDs checked at gateway on every request. |

**Key Rule:** The JWT is verified at the gateway. The service layer trusts the gateway but re-verifies tenant ownership. Never trust the client.

### Rate Limiting

```
Anonymous:       10 req/min   (block at edge)
Authenticated:   100 req/min  (per user)
Service Account: 1000 req/min (per service)
Admin:           500 req/min  (per user)
```

Rate limits are stored in Redis (atomic INCR + EXPIRE). When exceeded, return `429 Too Many Requests` with a `Retry-After` header.

---

## RING 3 — Application Services (Modular Core)

This is where modularity lives. **Each service is a self-contained module** with its own directory, its own database schema, its own tests, and its own deployment cycle.

### Service Module Contract

Every service follows the same internal structure:

```
src/services/correspondence/
├── index.ts              # Public API — what other services can call
├── routes.ts             # HTTP route definitions
├── controller.ts         # Request handling (thin — delegates to service)
├── service.ts            # Business logic (the brain)
├── repository.ts         # Database queries (the only file that touches SQL)
├── types.ts              # TypeScript interfaces and types
├── events.ts             # Events this service publishes/subscribes to
├── validators.ts         # Input validation schemas (Zod/Joi)
├── errors.ts             # Service-specific error classes
└── __tests__/
    ├── service.test.ts
    ├── controller.test.ts
    └── repository.test.ts
```

### The Dependency Rule (Why Nothing Breaks)

```
┌─────────────────────────────────────────────┐
│              OTHER SERVICES                  │
│   Can ONLY import from your index.ts         │
└──────────────────┬──────────────────────────┘
                   │  (public API only)
                   ▼
┌─────────────────────────────────────────────┐
│              index.ts (Facade)               │
│   Exposes only what others need to see       │
└──────────────────┬──────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│controller│  │ service  │  │ events   │
└────┬────┘  └────┬─────┘  └──────────┘
     │            │
     ▼            ▼
┌─────────┐  ┌──────────┐
│validators│  │repository│
└─────────┘  └────┬─────┘
                  │
                  ▼
           ┌──────────┐
           │Database  │
           └──────────┘
```

**Dependencies point inward only.** `controller` depends on `service`, `service` depends on `repository`. Never the reverse. Other services depend only on `index.ts`.

This means:
- Rewrite `repository.ts` (switch from PostgreSQL to MongoDB) → **zero other services change**.
- Add a new field to internal types → **zero other services know or care**.
- Add a whole new service (e.g., `billing`) → **existing services don't change at all**.

### How Services Communicate

#### Synchronous (Request/Response) — When you need an answer NOW

```
Delivery Service needs user preferences
     │
     ▼
HTTP call to Preference Service /internal/users/:id/preferences
     │
     ▼
Preference Service returns data
     │
     ▼
Delivery Service proceeds
```

Use when: The caller literally cannot proceed without the answer.

Rules:
- Always set a **timeout** (2 seconds max).
- Always have a **fallback** (circuit breaker pattern).
- Internal calls go through a **service mesh** or **internal API**, never through the public gateway.

#### Asynchronous (Events) — When you just need to announce something happened

```
Correspondence Service creates a new letter
     │
     ▼
Publishes event: { type: "correspondence.created", payload: { id, userId, ... } }
     │
     ▼
Event Bus (Kafka)
     │
     ├──▶ Vulnerability Service listens → classifies the user
     ├──▶ Notification Service listens → queues an SMS
     ├──▶ Analytics Service listens → records the event
     └──▶ (Future service not yet built) listens → does whatever
```

Use when: The thing that happened doesn't need an immediate response.

Rules:
- Events are **fire and forget**. The publisher doesn't know or care who listens.
- Events have a **schema** (versioned). Consumers validate before processing.
- Events are **idempotent** — processing the same event twice produces the same result.

**This is the key to modularity.** Adding a new feature means writing a new event consumer. The producer doesn't change. Nothing breaks.

### Event Schema Example

```typescript
// events/correspondence.created.v1.ts
export const CorrespondenceCreatedV1 = {
  type: "correspondence.created" as const,
  version: 1,
  schema: {
    id: string,
    userId: string,
    tenantId: string,
    category: "tax" | "health" | "housing" | "benefits",
    urgency: "normal" | "high" | "critical",
    channels: ("physical" | "sms" | "voice")[],
    language: "en" | "zh" | "ms" | "ta",
    createdAt: string,
  }
};
```

When the schema needs to change, create `v2`. Both versions coexist. Consumers migrate at their own pace.

### Service Catalogue

| Service | Owns | Publishes | Subscribes To |
| :--- | :--- | :--- | :--- |
| **Correspondence** | Letters, templates, metadata | `correspondence.created`, `correspondence.viewed` | `agency.submission` |
| **Vulnerability** | User classification, support tiers | `vulnerability.tier.changed` | `correspondence.created`, `user.behaviour.updated` |
| **Orchestration** | Channel routing, escalation rules | `routing.decision.made` | `correspondence.created`, `vulnerability.tier.changed` |
| **Adaptation** | Language simplification, format generation | `adaptation.completed` | `routing.decision.made` |
| **Delivery** | Multi-channel dispatch, tracking | `delivery.dispatched`, `delivery.failed` | `adaptation.completed` |
| **Notification** | SMS, push, email reminders | `notification.sent` | `delivery.dispatched`, `correspondence.unread` |
| **Proxy** | Delegated access, caregiver relationships | `proxy.action.taken` | `correspondence.created` |
| **Analytics** | Engagement metrics, drop-off detection | `analytics.insight.generated` | All events |
| **Auth** | Singpass integration, sessions, tokens | `auth.login`, `auth.logout` | (none — ingress only) |
| **Billing** | Usage metering, invoicing | `billing.invoice.created` | `delivery.dispatched` |

---

## RING 4 — Data & Integration Layer

### Database Design (Schema-per-Service Isolation)

```
┌─────────────────────────────────────────────────┐
│                  PostgreSQL                      │
│                                                  │
│  Schema: correspondence    (Correspondence Svc)  │
│  Schema: users             (Auth/User Svc)       │
│  Schema: delivery          (Delivery Svc)        │
│  Schema: analytics         (Analytics Svc)       │
│  Schema: proxy             (Proxy Svc)           │
│  Schema: billing           (Billing Svc)         │
│  Schema: shared            (Cross-cutting refs)  │
│                                                  │
└─────────────────────────────────────────────────┘
```

Each service owns its schema. **No service queries another service's schema directly.** If you need data from another service, call its API or subscribe to its events.

### Caching Strategy (4-Layer)

```
Layer 1: Edge Cache (CDN)          — static assets, public pages. TTL: hours.
Layer 2: API Gateway Cache         — GET responses for public endpoints. TTL: minutes.
Layer 3: Service-Level Cache       — user preferences, vulnerability scores. TTL: seconds-minutes.
Layer 4: Database Query Cache      — PostgreSQL internal buffer. Automatic.
```

**Cache Invalidation Rule:** When a service updates data, it publishes an event. Any service caching that data listens for the event and invalidates its cache. Never rely on TTL-based invalidation alone for critical data.

### External Integration Adapter Pattern

Every external system (Singpass, SingPost, Twilio, Stripe) gets an **adapter** — a single module that translates between the internal API and theirs.

```
src/adapters/
├── singpass/
│   ├── adapter.ts        # Implements AuthProvider interface
│   ├── types.ts          # Singpass-specific types
│   └── mocks.ts          # Mock for local development
├── singpost/
│   ├── adapter.ts        # Implements MailProvider interface
│   ├── types.ts
│   └── mocks.ts
├── twilio/
│   ├── adapter.ts        # Implements VoiceProvider interface
│   ├── types.ts
│   └── mocks.ts
└── stripe/
    ├── adapter.ts        # Implements PaymentProvider interface
    ├── types.ts
    └── mocks.ts
```

Each adapter implements a common interface:

```typescript
interface MailProvider {
  send(params: MailRequest): Promise<MailResult>;
  getStatus(trackingId: string): Promise<MailStatus>;
}
```

This means:
- Adding a new SMS provider → write one new adapter. Zero business logic changes.
- SingPost API goes down → adapter catches the error, publishes a failure event, orchestration retries or falls back.
- Local development → use the mock adapter. No external dependency needed.

### Webhook Handling (Inbound from External Systems)

```
External System (Stripe, Singpass, Twilio)
     │
     ▼ sends webhook
┌──────────────┐
│ Webhook      │  1. Verify signature (HMAC/secret)
│ Receiver     │  2. Parse payload
│              │  3. Enqueue to internal event bus
│              │  4. Return 200 OK immediately
└──────────────┘
     │
     ▼
Internal Event → Processing Service picks it up async
```

**Never process a webhook synchronously.** Acknowledge receipt immediately (return 200), then process asynchronously. If processing fails, retry with exponential backoff via a dead-letter queue.

---

## AI Agent System (OpenClaw)

PULSE integrates a **hierarchical multi-agent AI system** built on the **OpenClaw** framework. The system uses a central orchestrator that routes users to domain-specialist agents, which invoke language or dialect agents to contextualise terminology in the user's preferred language or dialect.

> **Full technical specification:** See [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md)

### Why Multi-Agent

A single LLM cannot simultaneously be an expert in Singapore tax law, speak fluent Tamil with culturally appropriate financial terminology, simplify language to Primary 6 level, and detect vulnerability signals. The multi-agent approach composes narrow, specialised agents — each swappable, testable, and expandable independently.

### Agent Hierarchy

```
                        PULSE ORCHESTRATOR
                        (Root Agent — routes, never answers)
                               │
           ┌───────────┬───────┼───────┬───────────┐
           ▼           ▼       ▼       ▼           ▼
     Financial     Healthcare  Housing  Employment  Legal
       Agent         Agent     Agent     Agent      Agent
           │           │       │       │           │
           └───────────┴───┬───┴───────────────────┘
                           │
                    Domain agent invokes
                    language or dialect agent
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
   ┌─────────────────────┐  ┌─────────────────────────────────┐
   │   LANGUAGE AGENTS   │  │       DIALECT AGENTS             │
   │  English | 中文     │  │  Hokkien | Cantonese | Teochew   │
   │  Bahasa Melayu      │  │  Hakka | Hainanese               │
   │  தமிழ்              │  │  Bazaar Melayu | Javanese        │
   └──────────┬──────────┘  │  Singapore Tamil | Spoken Tamil  │
              │              │  Malayalam | Punjabi | Hindi     │
              │              └──────────────┬──────────────────┘
              └──────────────┬──────────────┘
                             │
                             ▼
                 ┌─────────────────────────┐
                 │  ACCESSIBILITY AGENT    │
                 │  Simplification, TTS,   │
                 │  Readability scoring    │
                 └──────────┬──────────────┘
                            │
                            ▼
                 ┌─────────────────────────┐
                 │    GUARDIAN AGENT        │
                 │  Scam detection, PII    │
                 │  scrubbing, safety      │
                 └─────────────────────────┘
                            │
                            ▼
                    Response to User
```

### Agent Types

| Agent | Role | Key Behaviour |
| :--- | :--- | :--- |
| **Orchestrator** | Classifies intent, detects language/dialect, assesses vulnerability, routes | Never answers directly — only routes |
| **Domain Agents** (Financial, Healthcare, Housing, Employment, Legal) | Deep domain expertise for correspondence explanation | Invoke language/dialect agent for terminology; hand off if out-of-scope |
| **Language Agents** (EN, ZH, MS, TA) | Domain-specific glossary lookups with plain-language explanations | Not just translation — contextualises institutional terms in the user's language |
| **Dialect Agents** (Hokkien, Cantonese, Teochew, Hakka, Hainanese, Bazaar Melayu, Javanese, etc.) | First-class dialect support with cultural context | Seniors' primary language of comprehension; fall back to parent language agent when needed |
| **Accessibility Agent** | Readability scoring, simplification, text-to-speech prep | Adjusts output to Primary 6 (guided) or Primary 4 (high-touch) reading level |
| **Guardian Agent** | Final safety gate — scam detection, PII scrubbing, confidence check | Every response passes through; blocks or flags unsafe outputs |

### The Language-Domain Intersection

This is the core innovation. Language agents maintain **domain-specific glossaries** — curated mappings of institutional terms to plain-language explanations in the target language.

```
Domain agent needs to explain "assessable income" to a Mandarin-speaking user
     │
     ▼
Sends to Chinese Language Agent:
  { term: "assessable income", domain: "tax", language: "zh" }
     │
     ▼
Language Agent returns:
  {
    translation: "评税入息",
    plainExplanation: "你一年内赚到的所有钱的总和",
    example: "如果你的薪水是每月$2000，你的评税入息大约是$24000"
  }
     │
     ▼
Financial Agent composes response using this output
```

### The Dialect Layer

Many Singapore seniors aged 75+ are more comfortable in dialect than in Mandarin or formal Tamil. PULSE treats dialects as **first-class agents** with their own domain glossaries, cultural context, and fallback to their parent language agent.

**Chinese Dialects:** Hokkien (福建话), Cantonese (广东话), Teochew (潮州话), Hakka (客家话), Hainanese (海南话)
**Malay Varieties:** Bazaar Melayu, Javanese, Boyanese, Johor-Riau
**Tamil & Indian Varieties:** Singapore Tamil, Spoken Tamil, Malayalam, Punjabi, Hindi

```
Domain agent needs to explain "assessable income" to a Hokkien-speaking senior
     │
     ▼
Sends to Hokkien Dialect Agent:
  { term: "assessable income", domain: "tax", dialect: "zh-hok" }
     │
     ▼
Hokkien Agent returns:
  {
    dialectTerm: "应税收入",
    plainExplanation: "你一年赚有够额",
    example: "假讲你逐个月趁两千, 一年拢总共是两万四",
    culturalContext: "In hawker-centre conversation, seniors may refer to this
                     as '政府算你要纳多少税的那个数目'",
    parentLanguageEquivalent: "评税入息 (Mandarin)"
  }
     │
     ▼
If glossary entry not found → falls back to Chinese Language Agent
```

### Adding a New Agent (Without Breaking Anything)

```
1. Define agent personality + knowledge base in src/agents/domain/<name>/
2. Create language glossaries in src/agents/language/<lang>/glossaries/<domain>.ts
3. Create dialect glossaries in src/agents/dialect/<group>/<dialect>/glossaries/<domain>.ts
4. Register with the Orchestrator's agent registry
5. Agent is live — Orchestrator dynamically routes to it
```

Zero changes to existing agents. The Orchestrator routes based on the dynamic registry.

### Project Structure (Agent System)

```
src/agents/
├── orchestrator/           # Root agent: routing, registry, monitoring
├── domain/
│   ├── financial/          # Tax, CPF, GST, benefits
│   │   ├── agent.ts
│   │   ├── knowledge/      # Domain concepts, procedures, FAQs
│   │   └── prompts/        # Scenario-specific system prompts
│   ├── healthcare/         # Appointments, Medisave, screenings
│   ├── housing/            # HDB, rental, maintenance, SERS
│   ├── employment/         # Workpass, MOM, CPF contributions
│   └── legal/              # Fines, court notices, regulatory
├── language/
│   ├── english/            # Plain English simplification
│   │   └── glossaries/     # Per-domain glossary files
│   ├── chinese/            # Simplified Chinese with local context
│   │   └── glossaries/
│   ├── malay/              # Bahasa Melayu, formal register
│   │   └── glossaries/
│   └── tamil/              # Tamil script, local terminology
│       └── glossaries/
├── dialect/
│   ├── chinese/
│   │   ├── hokkien/        # 福建话 — largest senior dialect
│   │   │   └── glossaries/
│   │   ├── cantonese/      # 广东话
│   │   │   └── glossaries/
│   │   ├── teochew/        # 潮州话
│   │   │   └── glossaries/
│   │   ├── hakka/          # 客家话
│   │   │   └── glossaries/
│   │   └── hainanese/      # 海南话
│   │       └── glossaries/
│   ├── malay/
│   │   ├── bazaar-melayu/  # Colloquial Malay
│   │   │   └── glossaries/
│   │   └── javanese/       # Javanese-descended community
│   │       └── glossaries/
│   └── indian/
│       ├── singapore-tamil/ # Local Tamil variety
│       │   └── glossaries/
│       ├── spoken-tamil/    # Colloquial register
│       │   └── glossaries/
│       ├── malayalam/       # Keralite community
│       │   └── glossaries/
│       ├── punjabi/         # Sikh community
│       │   └── glossaries/
│       └── hindi/           # Broader Indian community
│           └── glossaries/
├── accessibility/          # Readability, simplification, TTS, layout
├── guardian/               # PII scanning, scam detection, safety rules
└── shared/                 # Types, prompt utilities, metrics
```

---

## Cross-Cutting Concerns

### Structured Logging

Every log entry follows a consistent JSON structure:

```json
{
  "timestamp": "2026-05-21T10:00:00.000Z",
  "level": "info",
  "service": "delivery",
  "traceId": "abc-123",
  "spanId": "def-456",
  "tenantId": "tenant-789",
  "userId": "user-012",
  "message": "Delivery dispatched",
  "metadata": {
    "channel": "sms",
    "correspondenceId": "corr-345"
  }
}
```

- **Always log:** traceId, service name, operation, outcome, duration.
- **Never log:** passwords, tokens, PII (NRIC, full names), request bodies.

### Error Handling

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,        // "CORRESPONDENCE.NOT_FOUND"
    public readonly statusCode: number,  // 404
    public readonly isRetryable: boolean,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
  }
}
```

Services throw these. The gateway catches and returns safe public responses. **Never leak stack traces to the client.**

### Health Checks

Every service exposes:

```
GET /health/live    → 200 OK (process is running)
GET /health/ready   → 200 OK (connected to DB, Redis, Kafka — ready for traffic)
```

### Observability Stack

| Tool | Purpose |
| :--- | :--- |
| **OpenTelemetry** | Distributed tracing across all services (trace ID flows end-to-end) |
| **Prometheus** | Metrics collection (request latency, error rates, queue depth) |
| **Grafana** | Dashboards and alerting |
| **Sentry** | Error tracking and crash reporting |
| **Structured Logs (Winston/Pino)** | JSON logs shipped to centralised log aggregator |

---

## How Adding a New Feature Works (Without Breaking Anything)

Example: Adding a **Feedback Service** where users rate their correspondence experience.

```
Step 1: Create the module
         src/services/feedback/
         (copy the module template: index, routes, controller, service, repo, events, types)

Step 2: Subscribe to existing events
         Listen to "correspondence.delivered"
         When a correspondence is delivered → create a feedback request

Step 3: Add your own database schema
         Schema: feedback
         Table: feedback_responses (id, userId, correspondenceId, rating, comment, createdAt)

Step 4: Add your HTTP routes
         POST   /api/v1/feedback           → submit feedback
         GET    /api/v1/feedback/:corrId    → get feedback for a correspondence
         GET    /api/v1/feedback/stats      → aggregated stats (admin)

Step 5: Publish your own events
         "feedback.submitted" → Analytics Service listens automatically

Step 6: Register at the gateway
         Add route mapping: /feedback/* → feedback service

Done. Zero existing service code was touched.
```

### Modularity Guarantees

| Concern | How It's Handled |
| :--- | :--- |
| **New DB tables** | New schema. No existing tables altered. |
| **New API routes** | Added to gateway config. No existing routes changed. |
| **New events** | New event type. Existing consumers ignore unknown events. |
| **New dependencies** | Added to the new service's `package.json`. No shared dependency versions changed. |
| **New tests** | Live in the new service's `__tests__/`. Existing test suites untouched. |
| **Deployment** | New service deploys independently. Others keep running on current versions. |

---

## Key Features

### Live Implementation — Telegram CPF Assistant
The running prototype is a multilingual **Telegram bot** for CPF Board enquiries (full detail in [CONTEXT.md](./CONTEXT.md)):
- **RAG answers** grounded in a MongoDB CPF knowledge base, with citations and a deterministic fallback.
- **Government-standard formatting** — concise, scannable, front-loaded answers (GOV.UK / Singapore SGDS), generated **natively** in the user's language (English, Mandarin, Malay, Tamil, Hindi, Malayalam, Punjabi, Singlish), with a GLM translation fallback for relay/UI.
- **Interactive guiding questions** — for broad, personal questions the bot asks a few short questions (buttons or typed), then tailors the answer.
- **Emotion-driven tone** — replies soften (warmer, less formal, empathy-first) for upset callers to reduce escalation, without dropping any facts. Tone adapts to the **trajectory** of the conversation, not just the latest message: as a caller gets angrier across turns the bot gets steadily more soothing (it only ever raises warmth, never strips the answer).
- **Human escalation** — complex / personal / distressed cases hand off to a CCU officer via a live dashboard, with two-way translated relay.
- **Voice** — speech-to-text in, text-to-speech out.
- **Satisfaction rating** — when a chat ends (officer closes the case, the customer signals they're done, or `/end`), the bot asks for a **1–5 ⭐ rating** and resets the chat; sessions left idle for 24h reset automatically.

*The features below describe the broader PULSE framework vision; the bot above is the implemented slice.*

### Adaptive Communication Flows
- Dynamically adjust message complexity, channel, and language based on detected user needs.
- A/B testing framework for readability and engagement optimisation.

### Multi-Channel Delivery
- **Physical Mail** — redesigned large-print layouts with QR codes and simplified call-to-action.
- **Digital (In-App / Web)** — high-contrast, screen-reader-friendly interfaces with text-to-speech.
- **SMS** — simplified summaries with hotline prompts (no clickable links).
- **Voice Assist** — automated IVR system that reads correspondence aloud with multi-language support.
- **Proxy Portal** — secure delegated access for authorised caregivers and community coordinators.

### Vulnerability-Aware Routing
- Behavioural signal detection (login failures, idle time, bounced notifications).
- Profile-based classification (age, declared accessibility needs, language preference).
- Escalation rules with configurable thresholds.

### Scam-Resistant Verification
- Reference code cross-check via official hotline.
- No links in outbound notifications.
- Proactive scam awareness education embedded in correspondence.

### Accessibility-First Templates
- WCAG 2.2 AA compliant by default.
- Readability scoring and plain-language validation.
- Multi-language support: English, Mandarin, Malay, Tamil.
- Large-print and high-contrast variants generated automatically.

---

## User Journeys

### Journey 1: Senior Receives Hospital Appointment Letter

```
Agency sends appointment data
        │
        ▼
PULSE Ingestion Layer receives data
        │
        ▼
Vulnerability Detection identifies: Age 72, past preference = physical mail
        │
        ▼
Routing Decision: Physical mail + SMS reminder + Voice-assist option
        │
        ▼
Adaptation Engine: Simplifies letter to large-print format,
                   adds QR code linking to voice-assist portal
        │
        ▼
Physical letter dispatched via SingPost
        │
        ▼
Day 3: SMS reminder sent with simplified summary + hotline number
        │
        ▼
Day 5: No response → Automated voice callback initiated
        │
        ▼
User confirms appointment via phone keypad (IVR)
        │
        ▼
Confirmation logged, future interactions preference updated
```

### Journey 2: Low-Literacy User Receives Tax Notification

```
Agency sends tax notification data
        │
        ▼
Vulnerability Detection: History of failed digital interactions,
                         language preference = Mandarin
        │
        ▼
Routing Decision: In-app notification (Mandarin) + Voice assist callback
        │
        ▼
Adaptation Engine: Translates to Mandarin, simplifies to 3-step summary,
                   adds text-to-speech audio attachment
        │
        ▼
User opens notification → plays audio attachment
        │
        ▼
System detects user spent extended time on step 2
        │
        ▼
Proactive chat prompt: "Would you like a callback to walk you through this?"
        │
        ▼
User accepts → Warm transfer to mandarin-speaking agent
        │
        ▼
Agent guides user through payment via secured session
```

### Journey 3: Caregiver Assists Elderly Parent via Proxy Portal

```
Elderly parent authorised caregiver via Singpass
        │
        ▼
PULSE recognises proxy access relationship
        │
        ▼
New correspondence arrives for elderly parent
        │
        ▼
Routing Decision: Notify caregiver via in-app + physical mail to parent
        │
        ▼
Caregiver logs into Proxy Portal, views parent's correspondence
        │
        ▼
Caregiver assists parent with understanding the letter
        │
        ▼
Caregiver completes action on parent's behalf (with audit trail)
        │
        ▼
Parent receives confirmation via preferred channel
```

---

## Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js | Accessible, server-rendered UI with WCAG compliance |
| **Design System** | Custom component library | High-visibility, accessible components built to PULSE spec |
| **Backend** | Node.js / Express (TypeScript) | API layer for correspondence orchestration |
| **Database** | PostgreSQL (>= 14) | Per-service schemas for user profiles, correspondence logs |
| **Cache** | Redis | Rate limiting, session store, service-level caching |
| **Message Queue** | Apache Kafka | Event-driven processing for multi-channel dispatch |
| **AI / NLP** | (Configurable) | Language simplification, readability scoring, sentiment analysis |
| **Voice / IVR** | Twilio / AWS Connect | Voice-assist callbacks, text-to-speech, IVR flows |
| **Physical Mail** | SingPost API integration | Automated physical mail generation and dispatch |
| **Authentication** | Singpass / Corppass | National digital identity integration |
| **Observability** | OpenTelemetry + Prometheus + Grafana | Distributed tracing, metrics, dashboards, alerting |
| **Error Tracking** | Sentry | Crash reporting and error aggregation |
| **Feature Flags** | LaunchDarkly / Unleash | Decouple deployment from release; per-tenant rollout |
| **CI/CD** | GitHub Actions | Automated test → lint → build → deploy pipelines |
| **Infrastructure** | AWS / Azure (Gov Cloud) | Secure, compliant cloud hosting for government data |
| **Containerisation** | Docker + Kubernetes | Service isolation, independent scaling, health checks |

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14
- Redis >= 7.x

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/project-pulse.git
cd project-pulse

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your local configuration

# Ensure PostgreSQL and Redis are running locally

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start the development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `KAFKA_BROKERS` | Kafka broker addresses | Yes |
| `SINGPASS_CLIENT_ID` | Singpass integration client ID | Yes |
| `SINGPASS_CLIENT_SECRET` | Singpass integration secret | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account for voice assist | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token | Yes |
| `SINGPOST_API_KEY` | SingPost mail integration key | Yes |
| `SESSION_SECRET` | Session encryption secret | Yes |
| `JWT_PUBLIC_KEY` | RSA public key for JWT verification | Yes |
| `JWT_PRIVATE_KEY` | RSA private key for JWT signing | Yes |
| `SENTRY_DSN` | Sentry error tracking endpoint | No |
| `PORT` | Application port (default: 3000) | No |

---

## Project Structure

```
project-pulse/
├── src/
│   ├── gateway/                # API Gateway (auth, rate limiting, routing)
│   ├── services/               # Modular service core
│   │   ├── correspondence/     #   Correspondence lifecycle management
│   │   ├── vulnerability/      #   User classification and support tiers
│   │   ├── orchestration/      #   Channel routing and escalation
│   │   ├── adaptation/         #   Language simplification, template engine
│   │   ├── delivery/           #   Multi-channel dispatch
│   │   ├── notification/       #   SMS, push, email reminders
│   │   ├── proxy/              #   Caregiver / coordinator portal
│   │   ├── analytics/          #   Engagement tracking and feedback
│   │   ├── auth/               #   Singpass integration, sessions
│   │   └── billing/            #   Usage metering, invoicing
│   ├── adapters/               # External system adapters
│   │   ├── singpass/           #   National identity provider
│   │   ├── singpost/           #   Physical mail delivery
│   │   ├── twilio/             #   Voice / SMS
│   │   └── stripe/             #   Payments
│   ├── agents/                  # OpenClaw multi-agent AI system
│   │   ├── orchestrator/       #   Root agent: routing, registry, monitoring
│   │   ├── domain/             #   Domain specialist agents
│   │   │   ├── financial/      #     Tax, CPF, GST, benefits
│   │   │   ├── healthcare/     #     Appointments, Medisave, screenings
│   │   │   ├── housing/        #     HDB, rental, maintenance, SERS
│   │   │   ├── employment/     #     Workpass, MOM, CPF contributions
│   │   │   └── legal/          #     Fines, court notices, regulatory
│   │   ├── language/           #   Language agents with domain glossaries
│   │   │   ├── english/        #     Plain English simplification
│   │   │   ├── chinese/        #     Simplified Chinese + local context
│   │   │   ├── malay/          #     Bahasa Melayu, formal register
│   │   │   └── tamil/          #     Tamil script, local terminology
│   │   ├── dialect/            #   Dialect agents (first-class, not afterthoughts)
│   │   │   ├── chinese/        #     Hokkien, Cantonese, Teochew, Hakka, Hainanese
│   │   │   ├── malay/          #     Bazaar Melayu, Javanese, Boyanese
│   │   │   └── indian/         #     Singapore Tamil, Spoken Tamil, Malayalam, Punjabi, Hindi
│   │   ├── accessibility/      #   Readability, simplification, TTS
│   │   ├── guardian/           #   PII scanning, scam detection, safety
│   │   └── shared/             #   Agent types, prompts, metrics
│   ├── events/                 # Event schemas and bus configuration
│   ├── shared/                 # Shared utilities, types, constants
│   │   ├── errors/             #   Error hierarchy
│   │   ├── logger/             #   Structured logging
│   │   ├── middleware/         #   Cross-cutting middleware
│   │   └── types/              #   Shared TypeScript types
│   └── workers/                # Background job processors
├── templates/                  # Correspondence templates (HTML, print, audio scripts)
├── frontend/                   # React / Next.js accessible UI
│   ├── components/             # PULSE design system components
│   ├── pages/                  # Application pages and user flows
│   ├── hooks/                  # Shared React hooks
│   ├── lib/                    # API client, auth helpers
│   └── styles/                 # High-contrast, accessible stylesheets
├── migrations/                 # Database migration scripts (per schema)
├── seeds/                      # Development seed data
├── tests/                      # Test suites
│   ├── unit/                   #   Per-service unit tests
│   ├── integration/            #   Cross-service integration tests
│   ├── e2e/                    #   End-to-end user journey tests
│   └── accessibility/          #   WCAG audit tests (axe-core)
├── scripts/                    # DevOps and utility scripts
├── docs/                       # Additional documentation
│   └── AGENT_ARCHITECTURE.md  #   Full AI agent system specification
├── infra/                      # Infrastructure as Code (Terraform / Pulumi)
├── Dockerfile                  # Production container definition (future)
├── .env.example                # Environment variable template
└── README.md                   # This file
```

---

## Contributing

We welcome contributions that align with PULSE's mission of digital inclusion. Please follow these guidelines:

1. **Accessibility First** — All UI contributions must pass WCAG 2.2 AA automated and manual audits.
2. **Plain Language** — All user-facing strings must score at or below Primary 6 reading level on the Flesch-Kincaid scale.
3. **No Breaking Changes** to existing service public APIs or event schemas without a versioned migration plan.
4. **Test Coverage** — New features require unit tests, and UI changes require accessibility test coverage.
5. **Modularity** — New features should be implemented as new services/modules. Do not expand existing service boundaries.

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Run the full test suite
npm test

# Run accessibility audits
npm run test:a11y

# Run linter
npm run lint

# Run type checker
npm run typecheck

# Submit a pull request with a clear description of changes
```

### The Modularity Rules

| Rule | Enforced By |
| :--- | :--- |
| Services don't share database schemas | PostgreSQL schema permissions (read-only on own schema) |
| Services communicate via API or events, never direct DB queries | Code review + architecture tests |
| External systems accessed only through adapters | TypeScript interfaces + dependency injection |
| All changes are backward-compatible | API versioning (`/v1/`, `/v2/`) + event schema versioning |
| Every service deploys independently | Docker containers + separate CI/CD pipelines |
| No shared mutable state between services | Event-driven architecture + idempotent consumers |
| Feature flags control rollout | New code ships OFF, turned on per-tenant |

---

## Team

Built with purpose by the PULSE team — designers, engineers, and researchers committed to making digital public services work for everyone.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

> *"Technology should serve the most vulnerable first. When the system works for the person who struggles most, it works for everyone."*
