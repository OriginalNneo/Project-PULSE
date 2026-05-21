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

```
┌─────────────────────────────────────────────────────────────────┐
│                        PULSE FRAMEWORK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │   Ingestion   │   │  Vulnerability│   │  Orchestration   │   │
│  │    Layer      │──▶│   Detection   │──▶│    & Routing     │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  Correspondence│   │  Adaptation  │   │   Delivery &     │   │
│  │   Templates   │◀──│    Engine     │◀──│  Personalisation │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │   Physical    │   │   Digital    │   │   Voice Assist   │   │
│  │     Mail      │   │   Channels   │   │    & Hotline     │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Engagement Analytics & Feedback Loop         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
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

## Key Features

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
| **Backend** | Node.js / Express | API layer for correspondence orchestration |
| **Database** | PostgreSQL | User profiles, preference storage, correspondence logs |
| **Message Queue** | Apache Kafka | Event-driven processing for multi-channel dispatch |
| **AI / NLP** | (Configurable) | Language simplification, readability scoring, sentiment analysis |
| **Voice / IVR** | Twilio / AWS Connect | Voice-assist callbacks, text-to-speech, IVR flows |
| **Physical Mail** | SingPost API integration | Automated physical mail generation and dispatch |
| **Authentication** | Singpass / Corppass | National digital identity integration |
| **Monitoring** | Grafana / Prometheus | Engagement analytics, drop-off detection, system health |
| **Infrastructure** | AWS / Azure (Gov Cloud) | Secure, compliant cloud hosting for government data |

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14
- Docker & Docker Compose (for local development)

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

# Start local services (PostgreSQL, Redis, etc.)
docker-compose up -d

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
| `SINGPASS_CLIENT_ID` | Singpass integration client ID | Yes |
| `SINGPASS_CLIENT_SECRET` | Singpass integration secret | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account for voice assist | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token | Yes |
| `SINGPOST_API_KEY` | SingPost mail integration key | Yes |
| `KAFKA_BROKERS` | Kafka broker addresses | Yes |
| `SESSION_SECRET` | Session encryption secret | Yes |
| `PORT` | Application port (default: 3000) | No |

---

## Project Structure

```
project-pulse/
├── src/
│   ├── ingestion/          # Correspondence data ingestion and normalisation
│   ├── detection/          # Vulnerability detection and classification engine
│   ├── orchestration/      # Channel routing and escalation logic
│   ├── adaptation/         # Language simplification, template engine, formatting
│   ├── delivery/           # Multi-channel dispatch (mail, SMS, voice, in-app)
│   ├── proxy/              # Caregiver / community coordinator portal
│   ├── analytics/          # Engagement tracking and feedback loop
│   ├── auth/               # Singpass integration and session management
│   ├── api/                # REST / GraphQL API layer
│   └── shared/             # Shared utilities, types, constants
├── templates/              # Correspondence templates (HTML, print, audio scripts)
├── frontend/               # React / Next.js accessible UI
│   ├── components/         # PULSE design system components
│   ├── pages/              # Application pages and user flows
│   └── styles/             # High-contrast, accessible stylesheets
├── migrations/             # Database migration scripts
├── seeds/                  # Development seed data
├── tests/                  # Test suites (unit, integration, e2e, accessibility)
├── docs/                   # Additional documentation
├── docker-compose.yml      # Local development services
├── Dockerfile              # Production container definition
└── README.md               # This file
```

---

## Contributing

We welcome contributions that align with PULSE's mission of digital inclusion. Please follow these guidelines:

1. **Accessibility First** — All UI contributions must pass WCAG 2.2 AA automated and manual audits.
2. **Plain Language** — All user-facing strings must score at or below Primary 6 reading level on the Flesch-Kincaid scale.
3. **No Breaking Changes** to existing vulnerability detection or routing logic without a coordinated migration plan.
4. **Test Coverage** — New features require unit tests, and UI changes require accessibility test coverage.

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

# Submit a pull request with a clear description of changes
```

---

## Team

Built with purpose by the PULSE team — designers, engineers, and researchers committed to making digital public services work for everyone.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

> *"Technology should serve the most vulnerable first. When the system works for the person who struggles most, it works for everyone."*
