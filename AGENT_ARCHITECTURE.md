# PULSE Multi-Agent AI System Architecture

> **OpenClaw Framework — Hierarchical Agent Design for Inclusive Correspondence**

This document defines the full architecture for PULSE's AI agent system, built on the **OpenClaw** framework. The system uses a hierarchical multi-agent model where a central orchestrator routes users to domain-specialist agents, which in turn invoke language agents to contextualise terminology in the user's preferred language.

---

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Agent Hierarchy](#agent-hierarchy)
- [Agent Catalogue](#agent-catalogue)
  - [PULSE Orchestrator (Root Agent)](#1-pulse-orchestrator-root-agent)
  - [Domain Specialist Agents](#domain-specialist-agents)
  - [Language Agents](#language-agents)
  - [Accessibility Agent](#accessibility-agent)
  - [Guardian Agent](#guardian-agent)
- [Inter-Agent Communication](#inter-agent-communication)
- [The Language-Domain Intersection](#the-language-domain-intersection)
- [Agent Lifecycles](#agent-lifecycles)
- [OpenClaw Integration](#openclaw-integration)
- [Agent Training & Knowledge Bases](#agent-training--knowledge-bases)
- [Safety & Guardrails](#safety--guardrails)
- [Future Agent Expansion](#future-agent-expansion)

---

## Design Philosophy

### Why Multi-Agent, Not Monolithic

A single LLM cannot simultaneously be an expert in Singapore tax law, speak fluent Tamil with culturally appropriate financial terminology, simplify language for a Primary 6 reading level, and detect vulnerability signals. Multi-agent architecture solves this by composing specialised agents, each with a narrow, well-defined scope.

| Approach | Problem |
| :--- | :--- |
| **Single monolithic LLM** | Jack of all trades, master of none. Hallucinates domain specifics. Cannot enforce boundaries. |
| **Fine-tuned single model** | Expensive to update. One domain change requires full retraining. |
| **Multi-agent (PULSE approach)** | Each agent owns its domain. Swappable, testable, expandable. New domain = new agent. |

### Core Principles

1. **Every agent has one job.** Financial Agent handles finances. It does not try to also explain medical terminology.
2. **Language is a layer, not a feature.** Domain agents focus on accuracy. Language agents focus on comprehension. They compose together.
3. **The orchestrator never answers directly.** It only routes. This prevents the "confident but wrong" problem.
4. **Humans are always in the loop.** Every agent must be able to hand off to a human agent at any point.

---

## Agent Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTION                               │
│              (Voice call, In-app chat, SMS, Physical mail QR)           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PULSE ORCHESTRATOR (Root Agent)                     │
│                                                                         │
│  • Classifies user intent (what is this about?)                         │
│  • Detects language/dialect preference                                  │
│  • Assesses vulnerability tier (how much support do they need?)         │
│  • Routes to the correct domain specialist                              │
│  • Monitors conversation health (confusion, frustration, drop-off)      │
│                                                                         │
└──────────┬──────────┬──────────┬──────────┬──────────┬─────────────────┘
           │          │          │          │          │
           ▼          ▼          ▼          ▼          ▼
     ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
     │Financial ││Healthcare││ Housing  ││Employment││  Legal   │
     │  Agent   ││  Agent   ││  Agent   ││  Agent   ││  Agent   │
     └────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘
          │           │           │           │           │
          └───────────┴─────┬─────┴───────────┴───────────┘
                            │
                     Domain agent invokes
                     language or dialect agent
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
   ┌─────────────────────┐   ┌─────────────────────────────────────┐
   │   LANGUAGE AGENTS   │   │        DIALECT AGENTS               │
   │   (Official Langs)  │   │   (First-class, not afterthoughts)  │
   │                     │   │                                     │
   │  ┌───────┐┌───────┐ │   │  Chinese Dialects:                  │
   │  │English││  简体  │ │   │  ┌────────┐┌──────────┐┌────────┐ │
   │  │       ││ 中文  │ │   │  │Hokkien ││Cantonese ││Teochew │ │
   │  └───────┘└───────┘ │   │  │福建话  ││广东话    ││潮州话  │ │
   │  ┌───────┐┌───────┐ │   │  └────────┘└──────────┘└────────┘ │
   │  │ Bahasa││ தமிழ்  │ │   │  ┌────────┐┌──────────┐          │
   │  │ Melayu││ Tamil │ │   │  │Hakka   ││Hainanese │          │
   │  └───────┘└───────┘ │   │  │客家话  ││海南话    │          │
   └──────────┬──────────┘   │  └────────┘└──────────┘          │
              │              │                                     │
              │              │  Malay Varieties:                   │
              │              │  ┌──────────┐┌──────────┐          │
              │              │  │Bazaar    ││Javanese  │          │
              │              │  │Melayu    ││          │          │
              │              │  └──────────┘└──────────┘          │
              │              │                                     │
              │              │  Tamil & Indian Varieties:          │
              │              │  ┌──────────┐┌──────────┐┌──────┐  │
              │              │  │Singapore ││Spoken    ││Malay- │  │
              │              │  │Tamil     ││Tamil     ││alam  │  │
              │              │  └──────────┘└──────────┘└──────┘  │
              │              │  ┌──────┐┌────┐                     │
              │              │  │Punjabi││Hindi│                     │
              │              │  └──────┘└────┘                     │
              │              └──────────────┬──────────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │  ACCESSIBILITY AGENT        │
              │  Simplification, TTS,       │
              │  Readability scoring        │
              └──────────────┬──────────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │    GUARDIAN AGENT            │
              │  Scam detection, PII         │
              │  scrubbing, safety           │
              └─────────────────────────────┘
                             │
                             ▼
                    Response to User
```

---

## Agent Catalogue

### 1. PULSE Orchestrator (Root Agent)

**Role:** The router. It never answers user questions directly. It classifies, routes, and monitors.

| Attribute | Detail |
| :--- | :--- |
| **Type** | Router / Orchestrator |
| **Invoked by** | User-facing channels (chat, voice, SMS) |
| **Invokes** | Domain specialist agents, Guardian Agent |
| **Knowledge** | User profile, conversation history, system capabilities |

#### Decision Flow

```
User message arrives
        │
        ▼
┌─────────────────────────────────────────────────┐
│  STEP 1: Language/Dialect Detection              │
│  What language or dialect is the user using?     │
│  → en / zh / ms / ta (official languages)        │
│  → zh-hok / zh-can / zh-teo / zh-hak / zh-hai   │
│    (Chinese dialects)                             │
│  → ms-bms / ms-jav (Malay varieties)             │
│  → ta-sin / ta-spo / ml / pa / hi               │
│    (Tamil & Indian varieties)                     │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  STEP 2: Intent Classification                   │
│  What is this about?                             │
│  → tax / health / housing / employment / legal   │
│  → general / unclear                             │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  STEP 3: Vulnerability Assessment                │
│  How much support does this user need?           │
│  → self-service / guided / high-touch            │
│  (Based on user profile + real-time signals)     │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  STEP 4: Route                                   │
│  Hand off to the correct domain specialist agent │
│  with language + vulnerability context attached  │
└─────────────────────────────────────────────────┘
```

#### Context Package (Passed to Domain Agent)

```typescript
interface RoutingContext {
  userId: string;
  tenantId: string;
  language: "en" | "zh" | "ms" | "ta";
  dialect?: "zh-hok" | "zh-can" | "zh-teo" | "zh-hak" | "zh-hai"
           | "ms-bms" | "ms-joh" | "ms-boy" | "ms-jav"
           | "ta-sin" | "ta-spo" | "ml" | "pa" | "hi";
  vulnerabilityTier: "self-service" | "guided" | "high-touch";
  correspondenceId?: string;
  conversationHistory: Message[];
  detectedIntent: string;
  confidenceScore: number;
  requiresHumanFallback: boolean;
}
```

---

### Domain Specialist Agents

Each domain agent is a deep expert in its area. It answers questions, explains correspondence, and guides actions — but only within its domain. If the user asks something outside its scope, it hands back to the Orchestrator.

---

#### 2. Financial Agent

| Attribute | Detail |
| :--- | :--- |
| **Domain** | Tax, CPF, GST, income tax, property tax, financial benefits |
| **Invoked by** | PULSE Orchestrator |
| **Invokes** | Language Agent, Accessibility Agent |
| **Handoff trigger** | User asks about non-financial topic |

**Knowledge Base:**

| Topic | Coverage |
| :--- | :--- |
| IRAS notices (tax assessments, reminders) | Notice types, payment deadlines, dispute process |
| CPF contributions | Contribution rates, withdrawal rules, Medisave/Ordinary/Special accounts |
| GST | Registration, filing, refunds |
| Financial assistance schemes | ComCare, Silver Support, GST Voucher |
| Payment methods | GIRO, PayNow, AXS, cheque |

**Example Interaction:**

```
User (in Mandarin): "I got this letter about my income tax. I don't understand
what 'assessable income' means."

Financial Agent receives context: { language: "zh", tier: "guided" }

Financial Agent:
  1. Identifies concept: "assessable income" (tax term)
  2. Invokes Language Agent:
     { term: "assessable income", domain: "tax", targetLanguage: "zh" }
  3. Language Agent returns:
     { translation: "评税入息", explanation: "这是你一年的总收入...",
       culturalContext: "In Singapore context, this includes..." }
  4. Financial Agent composes response using the Language Agent's output
  5. Invokes Accessibility Agent to simplify to Primary 6 level

Response to user (in Mandarin, simplified):
  "评税入息是指你一年内赚取的所有收入的总数。这包括你的薪水、奖金
   和其他收入。政府用这个数目来计算你需要交多少税。
   您的评税入息是 $24,000。"
```

---

#### 3. Healthcare Agent

| Attribute | Detail |
| :--- | :--- |
| **Domain** | Hospital appointments, Medisave, polyclinic visits, health screenings |
| **Invoked by** | PULSE Orchestrator |
| **Invokes** | Language Agent, Accessibility Agent |
| **Handoff trigger** | User asks about non-healthcare topic |

**Knowledge Base:**

| Topic | Coverage |
| :--- | :--- |
| Appointment letters | Appointment types, rescheduling, no-show consequences |
| Medisave | Balance inquiries, withdrawal limits, approved uses |
| Polyclinic referrals | Referral process, specialist appointments, waiting times |
| Health screenings | Screen for Life programme, age-based recommendations |
| CHAS / Pioneer Generation | Subsidy tiers, eligibility, card usage |

---

#### 4. Housing Agent

| Attribute | Detail |
| :--- | :--- |
| **Domain** | HDB matters, rental, maintenance, SERS, lease renewal |
| **Invoked by** | PULSE Orchestrator |
| **Invokes** | Language Agent, Accessibility Agent |
| **Handoff trigger** | User asks about non-housing topic |

**Knowledge Base:**

| Topic | Coverage |
| :--- | :--- |
| HDB letters | Types (maintenance, renovation, SERS, lease) |
| Rental flats | Eligibility, application, rental rates |
| Home ownership | BTO, resale, grants, eligibility |
| Maintenance | Town council matters, repair requests, conservancy charges |
| SERS | Compensation, replacement flat selection, timeline |

---

#### 5. Employment Agent

| Attribute | Detail |
| :--- | :--- |
| **Domain** | Workpass, employment disputes, CPF contributions by employer, retrenchment |
| **Invoked by** | PULSE Orchestrator |
| **Invokes** | Language Agent, Accessibility Agent |
| **Handoff trigger** | User asks about non-employment topic |

**Knowledge Base:**

| Topic | Coverage |
| :--- | :--- |
| Workpass / S Pass / Employment Pass | Status, renewal, cancellation |
| MOM notices | Inspection notices, levy, quota |
| Employment disputes | TADM, salary claims, wrongful dismissal |
| Retrenchment | Benefits, WFMA, re-employment |
| CPF employer contributions | Obligations, underpayment disputes |

---

#### 6. Legal & Compliance Agent

| Attribute | Detail |
| :--- | :--- |
| **Domain** | Fines, court notices, regulatory correspondence, LTA matters |
| **Invoked by** | PULSE Orchestrator |
| **Invokes** | Language Agent, Accessibility Agent |
| **Handoff trigger** | User asks about non-legal topic |

**Knowledge Base:**

| Topic | Coverage |
| :--- | :--- |
| Traffic fines | LTA notices, payment, appeal process |
| Court summons | Types, attendance obligations, legal aid |
| Regulatory notices | NEA, URA, SCDF compliance |
| Penalty structures | Composition amounts, late payment surcharges |
| Appeals process | How to contest, timelines, documentation |

---

### Language Agents

#### 7. Language Agents (One per Official Language)

Language agents do not just translate. They **contextualise domain-specific terminology** in the target language, accounting for cultural understanding and common misconceptions.

| Agent | Code | Specialisation |
| :--- | :--- | :--- |
| **English Language Agent** | `en` | Plain English simplification, readability scoring |
| **Chinese Language Agent** | `zh` | Simplified Chinese, local colloquialisms (e.g., "还水费" for utilities) |
| **Malay Language Agent** | `ms` | Bahasa Melayu, formal vs colloquial register |
| **Tamil Language Agent** | `ta` | Tamil script, formal register, local terminology |

#### The Language-Domain Glossary System

Each language agent maintains a **domain-specific glossary** — not a generic dictionary, but a curated mapping of institutional terms to plain-language explanations in the target language.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LANGUAGE GLOSSARY SYSTEM                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Domain: tax        Language: zh (Chinese)                    │   │
│  │                                                              │   │
│  │ "assessable income"     → 评税入息                            │   │
│  │   plain explanation: 你一年内赚到的所有钱的总和                │   │
│  │   example: 如果你的薪水是每月$2000，你的评税入息大约是$24000   │   │
│  │                                                              │   │
│  │ "Notice of Assessment"  → 估税通知书                          │   │
│  │   plain explanation: 税务局算好你要交多少税后寄给你的信         │   │
│  │                                                              │   │
│  │ "GIRO deduction"        → 财路扣款                            │   │
│  │   plain explanation: 每个月自动从你的银行户口扣除的付款方式     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Domain: health     Language: ms (Malay)                      │   │
│  │                                                              │   │
│  │ "Medisave"              → Medisave (保留原词)                  │   │
│  │   plain explanation: Wang simpanan kesihatan CPF anda        │   │
│  │   example: Kalau gaji anda $2000 sebulan, $400 masuk Medisave│   │
│  │                                                              │   │
│  │ "referral letter"       → Surat rujukan                      │   │
│  │   plain explanation: Surat dari klinik yang hantar anda ke   │   │
│  │                      hospital pakar                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Domain: housing    Language: ta (Tamil)                      │   │
│  │                                                              │   │
│  │ "SERS"                  → SERS (தேர்வுமுறை வீட்டுக்கு மாற்றம்)  │   │
│  │   plain explanation: உங்கள் HDB வீடு இடிக்கப்படும்போது      │   │
│  │                      புதிய வீடு கிடைக்கும் திட்டம்           │   │
│  │                                                              │   │
│  │ "conservancy charges"   → பராமரிப்பு கட்டணம்                 │   │
│  │   plain explanation: உங்கள் வீட்டு பகுதியை சுத்தமாக          │   │
│  │                      வைத்திருக்க மாதம் தோறும் செலுத்தும் தொகை │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### How Domain Agents Invoke Language Agents

```typescript
interface LanguageAgentRequest {
  term: string;
  domain: "tax" | "health" | "housing" | "employment" | "legal";
  targetLanguage: "en" | "zh" | "ms" | "ta";
  context?: string;
  vulnerabilityTier: "self-service" | "guided" | "high-touch";
}

interface LanguageAgentResponse {
  translation: string;
  plainExplanation: string;
  example?: string;
  culturalNote?: string;
  relatedTerms?: string[];
}
```

**The domain agent sends the term + context. The language agent returns the translation, a plain-language explanation (adjusted for vulnerability tier), and optionally an example and cultural note.**

---

### Dialect Agents (First-Class, Not Afterthoughts)

#### Why Dialects Are Critical

Many Singapore seniors aged 75+ are more comfortable in dialect than in Mandarin or formal Tamil. The Speak Mandarin Campaign (1979) shifted education to Mandarin, but the current elderly population was already out of school. For these users, Hokkien or Bazaar Melayu is their **primary language of comprehension** — not a translation of Mandarin, but their native tongue.

PULSE treats dialects as first-class agents. They follow the same glossary pattern as language agents but with additional cultural context specific to how terms are understood in everyday conversation (hawker centres, markets, neighbourhoods).

#### 8. Dialect Agents

##### Chinese Dialect Agents

| Agent | Code | Notes |
| :--- | :--- | :--- |
| **Hokkien Agent** | `zh-hok` | Largest senior dialect. Used in hawker centres, markets, neighbourhoods. |
| **Cantonese Agent** | `zh-can` | Significant older generation. Common in media consumption (HK dramas). |
| **Teochew Agent** | `zh-teo` | Concentrated in mature estates. Often mixed with Hokkien. |
| **Hakka Agent** | `zh-hak` | Smaller community. Important for inclusivity. |
| **Hainanese Agent** | `zh-hai` | Smallest Chinese dialect group in Singapore. |

##### Malay Dialect / Variety Agents

| Agent | Code | Notes |
| :--- | :--- | :--- |
| **Bazaar Melayu Agent** | `ms-bms` | Colloquial Malay spoken informally across ethnic groups. |
| **Javanese Agent** | `ms-jav` | Older generation of Javanese-descended Singaporeans. |
| **Boyanese Agent** | `ms-boy` | Subset of Javanese-descended community. |
| **Johor-Riau Agent** | `ms-joh` | Regional variety common among Singapore Malays. |

##### Tamil & Indian Variety Agents

| Agent | Code | Notes |
| :--- | :--- | :--- |
| **Singapore Tamil Agent** | `ta-sin` | Local Tamil with Malay/English loan words. Distinct from Indian Tamil. |
| **Spoken Tamil Agent** | `ta-spo` | Informal register. More accessible than formal written Tamil. |
| **Malayalam Agent** | `ml` | Significant Keralite community. |
| **Punjabi Agent** | `pa` | Sikh community. |
| **Hindi Agent** | `hi` | Broader Indian community, newer migrants. |

#### Dialect Glossary System

Dialect agents use the same domain-glossary structure as language agents, but with additional layers:

```typescript
interface DialectGlossaryEntry {
  term: string;
  domain: "tax" | "health" | "housing" | "employment" | "legal";
  dialectCode: string;
  dialectTerm: string;
  plainExplanation: string;
  example?: string;
  culturalContext?: string;
  parentLanguageEquivalent?: string;
}
```

```
┌─────────────────────────────────────────────────────────────────────┐
│              DIALECT GLOSSARY EXAMPLES                               │
│                                                                     │
│  Domain: tax        Dialect: zh-hok (Hokkien)                       │
│                                                                     │
│  "assessable income"                                                 │
│    dialectTerm: 应税收入 (written) / "liām-sòe siu-ji̍p" (spoken)    │
│    plainExplanation: 你一年赚有够额                                   │
│    example: 假讲你逐个月趁两千, 一年拢总共是两万四                      │
│    culturalContext: In hawker-centre conversation, seniors may       │
│      refer to this as "政府算你要纳多少税的那个数目"                    │
│    parentLanguageEquivalent: 评税入息 (Mandarin)                      │
│                                                                     │
│  Domain: health     Dialect: ms-bms (Bazaar Melayu)                 │
│                                                                     │
│  "Medisave"                                                          │
│    dialectTerm: Medisave (retain original)                           │
│    plainExplanation: Duit CPF kamu yang khusus buat bayar dokter     │
│    example: Kalau kamu masuk hospital, duit Medisave yang bayar      │
│    culturalContext: Older generation may simply call this "duit CPF"  │
│    parentLanguageEquivalent: Wang simpanan kesihatan CPF anda (BM)   │
│                                                                     │
│  Domain: housing    Dialect: ta-sin (Singapore Tamil)                │
│                                                                     │
│  "conservancy charges"                                               │
│    dialectTerm: பராமரிப்பு கட்டணம்                                  │
│    plainExplanation: ஒரு மாசம் வீட்டு பக்கம் சுத்தமா வச்சிருக்க     │
│      கொடுக்கணும் பணம் (using local syntax and loan words)          │
│    culturalContext: Many seniors just call it "town council money"   │
│    parentLanguageEquivalent: பராமரிப்பு கட்டணம் (formal Tamil)       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### How Domain Agents Invoke Dialect Agents

Domain agents use the same request interface, but with a `dialect` field:

```typescript
interface LanguageAgentRequest {
  term: string;
  domain: "tax" | "health" | "housing" | "employment" | "legal";
  targetLanguage: "en" | "zh" | "ms" | "ta";
  targetDialect?: "zh-hok" | "zh-can" | "zh-teo" | "zh-hak" | "zh-hai"
                 | "ms-bms" | "ms-joh" | "ms-boy" | "ms-jav"
                 | "ta-sin" | "ta-spo" | "ml" | "pa" | "hi";
  context?: string;
  vulnerabilityTier: "self-service" | "guided" | "high-touch";
}
```

**Routing logic:** If `targetDialect` is specified, the Orchestrator routes to the dialect agent (which may fall back to its parent language agent for terms it cannot handle). If no dialect is specified, the language agent handles it directly.

```
User speaks Hokkien
  → Orchestrator detects dialect: zh-hok
  → Routes to domain agent with dialect context
  → Domain agent invokes Hokkien dialect agent
  → Hokkien agent checks glossary:
      Found?  → Return dialect-specific explanation
      Not found? → Fall back to Chinese language agent → Return Mandarin explanation
```

---

### 8. Accessibility Agent

**Role:** Takes any agent's output and ensures it meets the user's accessibility needs.

| Function | How |
| :--- | :--- |
| **Readability scoring** | Runs Flesch-Kincaid on English output; equivalent scoring for other languages |
| **Simplification** | Rewrites above the target reading level (Primary 6 for guided, Primary 4 for high-touch) |
| **Text-to-speech prep** | Adds SSML markup for voice agents (pauses, emphasis, pronunciation guides) |
| **Large-format layout** | Generates HTML with adjustable font sizes, high-contrast colour scheme |

```typescript
interface AccessibilityRequest {
  content: string;
  language: "en" | "zh" | "ms" | "ta";
  targetReadability: "p6" | "p4" | "standard";
  outputFormat: "text" | "html" | "ssml";
  vulnerabilityTier: "self-service" | "guided" | "high-touch";
}

interface AccessibilityResponse {
  simplifiedContent: string;
  readabilityScore: number;
  ssmlContent?: string;
  htmlContent?: string;
}
```

---

### 9. Guardian Agent

**Role:** The final safety gate. Every response passes through the Guardian before reaching the user.

| Function | How |
| :--- | :--- |
| **Scam detection** | Checks if the response could be confused with a scam pattern (urgency, threats, links) |
| **PII scrubbing** | Ensures no sensitive data (NRIC, full address, bank account) is in the response unless explicitly required |
| **Accuracy flag** | Flags responses where confidence is below threshold for human review |
| **Human handoff** | Triggers immediate transfer to human agent if any safety rule is violated |

```
Domain Agent produces response
        │
        ▼
Guardian Agent:
  1. Scan for PII exposure         → PASS / FAIL
  2. Scan for scam-like patterns   → PASS / FAIL
  3. Check confidence score        → PASS / FLAG
  4. Verify no external links      → PASS / FAIL
  5. Check tone appropriateness    → PASS / FAIL
        │
        ├── ALL PASS ──▶ Response delivered to user
        ├── ANY FAIL ──▶ Response blocked, human agent alerted
        └── FLAG ──────▶ Response delivered with human review queued
```

---

## Inter-Agent Communication

### Communication Protocol

Agents communicate through a structured message bus (built on OpenClaw's agent runtime). Every message follows the same envelope:

```typescript
interface AgentMessage {
  messageId: string;
  correlationId: string;
  from: string;          // agent name
  to: string;            // agent name or "orchestrator"
  type: "request" | "response" | "handoff" | "escalation";
  payload: unknown;
  metadata: {
    userId: string;
    tenantId: string;
    language: string;
    vulnerabilityTier: string;
    timestamp: string;
    conversationTurn: number;
  };
}
```

### Communication Patterns

```
Pattern 1: Orchestrator → Domain Agent
  Orchestrator sends RoutingContext + user message
  Domain agent processes and responds

Pattern 2: Domain Agent → Language Agent
  Domain agent sends term + domain + language
  Language agent responds with translation + explanation

Pattern 3: Domain Agent → Accessibility Agent
  Domain agent sends composed response
  Accessibility agent returns simplified/formatted version

Pattern 4: Any Agent → Guardian Agent
  Final response sent to Guardian for safety review
  Guardian approves, blocks, or flags

Pattern 5: Any Agent → Orchestrator (Handoff)
  Agent detects out-of-scope query
  Returns control to Orchestrator with reason
  Orchestrator re-routes to correct domain agent

Pattern 6: Any Agent → Human Agent (Escalation)
  Agent triggers escalation (safety concern, low confidence, user request)
  Conversation context transferred to human agent dashboard
```

### Timeout & Fallback Rules

| Scenario | Timeout | Fallback |
| :--- | :--- | :--- |
| Domain agent fails to respond | 5 seconds | Orchestrator retries once, then escalates to human |
| Language agent fails to respond | 3 seconds | Domain agent responds in English (safe default) |
| Accessibility agent fails | 2 seconds | Deliver unsimplified response (better than nothing) |
| Guardian agent blocks response | Immediate | Queue for human review; inform user of delay |

---

## Agent Lifecycles

### Agent Registration (Adding a New Agent)

```typescript
interface AgentRegistration {
  name: string;
  type: "orchestrator" | "domain" | "language" | "accessibility" | "guardian";
  version: string;
  description: string;
  capabilities: string[];
  supportedLanguages?: string[];
  domains?: string[];
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  healthEndpoint: string;
}
```

When a new agent is added to the system:

```
Step 1: Define the agent's registration (name, type, schemas)
Step 2: Register with the Orchestrator's agent registry
Step 3: Orchestrator adds it to its routing table
Step 4: Agent's health endpoint is monitored
Step 5: Agent is live — Orchestrator can now route to it
```

No existing agent code changes. The Orchestrator dynamically routes based on the registry.

### Agent Health Monitoring

```
Every 30 seconds:
  Orchestrator pings each registered agent's /health endpoint

  If agent responds healthy → keep in routing table
  If agent fails 3 consecutive pings → remove from routing table
                                      → log alert
                                      → route affected traffic to fallback

  When agent recovers → re-register → back in routing table
```

---

## OpenClaw Integration

### Agent Definition Pattern

Each agent is defined as an OpenClaw module with:

```
src/agents/
├── orchestrator/
│   ├── agent.ts             # Agent personality, system prompt, capabilities
│   ├── router.ts            # Intent classification + routing logic
│   ├── registry.ts          # Dynamic agent registry
│   └── monitor.ts           # Conversation health monitoring
├── domain/
│   ├── financial/
│   │   ├── agent.ts         # Financial agent personality + knowledge
│   │   ├── knowledge/       # Domain-specific knowledge base
│   │   │   ├── tax.ts
│   │   │   ├── cpf.ts
│   │   │   └── benefits.ts
│   │   └── prompts/         # System prompts per scenario
│   │       ├── assessment-notice.ts
│   │       ├── payment-reminder.ts
│   │       └── general-query.ts
│   ├── healthcare/
│   │   ├── agent.ts
│   │   ├── knowledge/
│   │   │   ├── appointments.ts
│   │   │   ├── medisave.ts
│   │   │   └── screenings.ts
│   │   └── prompts/
│   ├── housing/
│   │   ├── agent.ts
│   │   ├── knowledge/
│   │   └── prompts/
│   ├── employment/
│   │   ├── agent.ts
│   │   ├── knowledge/
│   │   └── prompts/
│   └── legal/
│       ├── agent.ts
│       ├── knowledge/
│       └── prompts/
├── language/
│   ├── english/
│   │   ├── agent.ts
│   │   └── glossaries/      # Domain-specific glossaries
│   │       ├── financial.ts
│   │       ├── healthcare.ts
│   │       ├── housing.ts
│   │       ├── employment.ts
│   │       └── legal.ts
│   ├── chinese/
│   │   ├── agent.ts
│   │   └── glossaries/
│   ├── malay/
│   │   ├── agent.ts
│   │   └── glossaries/
│   └── tamil/
│       ├── agent.ts
│       └── glossaries/
├── dialect/
│   ├── chinese/
│   │   ├── hokkien/
│   │   │   ├── agent.ts
│   │   │   └── glossaries/  # Domain glossaries in Hokkien
│   │   ├── cantonese/
│   │   │   ├── agent.ts
│   │   │   └── glossaries/
│   │   ├── teochew/
│   │   │   ├── agent.ts
│   │   │   └── glossaries/
│   │   ├── hakka/
│   │   │   ├── agent.ts
│   │   │   └── glossaries/
│   │   └── hainanese/
│   │       ├── agent.ts
│   │       └── glossaries/
│   ├── malay/
│   │   ├── bazaar-melayu/
│   │   │   ├── agent.ts
│   │   │   └── glossaries/
│   │   ├── javanese/
│   │   │   ├── agent.ts
│   │   │   └── glossaries/
│   │   └── boyanese/
│   │       ├── agent.ts
│   │       └── glossaries/
│   └── indian/
│       ├── singapore-tamil/
│       │   ├── agent.ts
│       │   └── glossaries/
│       ├── spoken-tamil/
│       │   ├── agent.ts
│       │   └── glossaries/
│       ├── malayalam/
│       │   ├── agent.ts
│       │   └── glossaries/
│       ├── punjabi/
│       │   ├── agent.ts
│       │   └── glossaries/
│       └── hindi/
│           ├── agent.ts
│           └── glossaries/
│       └── glossaries/
├── accessibility/
│   ├── agent.ts
│   ├── readability.ts       # Readability scoring engines
│   ├── simplifier.ts        # Content simplification logic
│   └── ssml.ts              # Text-to-speech markup generator
├── guardian/
│   ├── agent.ts
│   ├── pii-scanner.ts       # PII detection and scrubbing
│   ├── scam-detector.ts     # Scam pattern matching
│   └── safety-rules.ts      # Configurable safety rule engine
└── shared/
    ├── types.ts              # Shared agent interfaces
    ├── prompts.ts            # Common prompt utilities
    └── metrics.ts            # Agent performance tracking
```

### Agent Personality Template

Each agent has a defined personality that governs its tone, behaviour, and boundaries:

```typescript
interface AgentPersonality {
  name: string;
  role: string;
  tone: "professional" | "warm" | "reassuring" | "neutral";
  constraints: string[];
  fallbackBehaviour: "handoff" | "retry" | "escalate";
  maxConversationTurns: number;
  systemPrompt: string;
}

// Example: Financial Agent
const financialPersonality: AgentPersonality = {
  name: "PULSE Financial Assistant",
  role: "Help citizens understand and act on financial correspondence from government agencies",
  tone: "warm",
  constraints: [
    "Never provide specific financial advice beyond explaining government correspondence",
    "Never recommend specific financial products or services",
    "Always direct payment questions to official channels",
    "Cannot access or display full NRIC or bank account numbers",
  ],
  fallbackBehaviour: "handoff",
  maxConversationTurns: 15,
  systemPrompt: `You are the PULSE Financial Assistant. You help Singapore citizens
understand financial correspondence from IRAS, CPF, and other agencies.
You explain terms plainly, in the user's preferred language, at an
appropriate reading level. You never give investment or financial planning
advice. If unsure, hand off to a human agent.`,
};
```

---

## Agent Training & Knowledge Bases

### Knowledge Base Structure

Each domain agent's knowledge base is structured as:

```
knowledge/
├── concepts/          # Domain concepts explained (what is "assessable income"?)
├── procedures/        # Step-by-step processes (how to appeal a tax assessment)
├── correspondence/    # Notice types and what they mean
├── faq/               # Frequently asked questions with approved answers
└── escalation/        # When and how to escalate to human agents
```

### Training Data Sources

| Source | Purpose | Update Frequency |
| :--- | :--- | :--- |
| **Agency documentation** (IRAS, CPF, HDB, MOH, MOM) | Core domain knowledge | Monthly review |
| **Historical correspondence** (anonymised) | Real-world language patterns | Quarterly |
| **User interaction logs** (anonymised) | Common questions, confusion points | Continuous |
| **Glossary databases** (curated by linguists) | Domain-term translations | Quarterly |
| **Regulatory updates** | New policies, changed procedures | As published |

### Continuous Improvement Loop

```
User interacts with agent
        │
        ▼
Conversation logged (anonymised)
        │
        ▼
Analytics Agent detects:
  • Unanswered questions (knowledge gap)
  • Low-confidence responses (training gap)
  • Frequent re-phrasing (comprehension gap)
        │
        ▼
Flagged for human review
        │
        ▼
Knowledge base updated
        │
        ▼
Agent re-trained on new data
        │
        ▼
A/B tested against previous version
        │
        ▼
Promoted to production (if metrics improve)
```

---

## Safety & Guardrails

### Hard Rules (Cannot Be Overridden)

1. **No external links in responses.** Ever. Users are directed to type gov.sg URLs manually.
2. **No financial advice.** Only explanation of existing correspondence.
3. **PII is never stored in conversation logs.** Real-time scanning and redaction.
4. **Every response passes through the Guardian Agent.** No bypass.
5. **Human handoff is always available.** Users can request it at any time using any phrasing.
6. **Conversation limits.** After max turns, the agent offers human handoff.
7. **Confidence thresholds.** Below 70% confidence → human review queue.

### Soft Rules (Configurable per Tenant)

1. **Reading level targets** — adjustable per vulnerability tier.
2. **Response length limits** — shorter for voice channel, longer for text.
3. **Proactive check-ins** — "Did that make sense?" frequency.
4. **Language mixing tolerance** — how much Singlish/code-switching to allow.

---

## Future Agent Expansion

Because agents are modular and registered dynamically, new agents can be added without touching existing ones:

| Planned Agent | Domain | Trigger |
| :--- | :--- | :--- |
| **Education Agent** | School enrolment, MOE notices, Edusave | When education-related correspondence detected |
| **Immigration Agent** | ICA matters, PR applications, passport renewal | When immigration-related correspondence detected |
| **Utilities Agent** | SP Services, water, electricity, gas bills | When utilities-related correspondence detected |
| **Transport Agent** | LTA vehicle matters, ERP, COE, road tax | When transport-related correspondence detected |
| **Community Agent** | PA events, CC bookings, grassroots programmes | When community-related correspondence detected |

Each new agent follows the same registration process: define personality, build knowledge base, create glossaries, register with Orchestrator. Zero changes to existing agents.

### Adding New Dialects

New dialects follow the same pattern — create a folder under `src/agents/dialect/<group>/<dialect>/`, build the domain glossaries, and register:

| Planned Dialect | Group | Priority |
| :--- | :--- | :--- |
| **Peranakan / Baba Malay** | Malay varieties | Medium — unique cultural group in Singapore |
| **Sri Lankan Tamil** | Indian varieties | Low — smaller community |
| **Telugu** | Indian varieties | Low — smaller community |
| **Hakka (Taiwanese variant)** | Chinese dialects | Low — if serving broader region |

---

## Summary: Agent Interaction at a Glance

```
User: "I got a letter about my HDB conservancy charges. What does this mean?"
  (spoken in Malay, detected vulnerability tier: guided)

  1. Orchestrator:
     - Language: ms (Malay)
     - Intent: housing
     - Tier: guided
     - Route → Housing Agent

  2. Housing Agent:
     - Identifies: "conservancy charges" explanation needed
     - Invokes Malay Language Agent:
       { term: "conservancy charges", domain: "housing", language: "ms" }

  3. Malay Language Agent:
     - Returns: {
         translation: "caj penyelenggaraan",
         plainExplanation: "Wang yang anda bayar setiap bulan untuk...",
         example: "Contohnya, jika anda bayar $50 sebulan..."
       }

  4. Housing Agent composes response using Language Agent output

  5. Accessibility Agent:
     - Simplifies to P6 Malay readability
     - Adds SSML markup for voice channel

  6. Guardian Agent:
     - Scans: no PII ✓, no links ✓, no scam patterns ✓, confidence 92% ✓
     - Approves

  7. Response delivered to user (in Malay, simplified, via voice):
     "Caj penyelenggaraan ialah wang yang anda bayar setiap bulan
      kepada Majlis Kawasan supaya kawasan tempat tinggal anda
      bersih dan selesa. Surat ini mengatakan anda belum bayar
      $85 untuk bulan Mac. Anda boleh bayar di AXS machine atau
      gunakan PayNow."
```
