import { newId } from "../data/ids.js";
import {
  ageBracketFor,
  buildCpfAccount,
  buildMarkers,
  chance,
  deriveTier,
  describePersona,
  pick,
  rng,
  type IncomeBand,
} from "../data/customers/factory.js";
import type {
  CaseCategory,
  CaseChannel,
  CasePriority,
  CorrespondenceCase,
  CustomerDetail,
  DigitalLiteracy,
  EmploymentStatus,
  Language,
} from "../data/customers/types.js";

// ---------------------------------------------------------------------------
// Name pools (representative of Singapore's resident mix)
// ---------------------------------------------------------------------------

const CHINESE_SURNAMES = ["Tan", "Lim", "Lee", "Ng", "Wong", "Goh", "Chua", "Koh", "Ong", "Teo", "Sim", "Low", "Toh", "Yeo", "Chan"];
const CHINESE_GIVEN_M = ["Wei Ming", "Jun Jie", "Kok Wah", "Boon Hock", "Chee Keong", "Ah Seng", "Hock Lai", "Beng Huat", "Kim Soon"];
const CHINESE_GIVEN_F = ["Mei Ling", "Hui Wen", "Siew Lan", "Ai Choo", "Bee Hoon", "Li Hua", "Swee Eng", "Geok Hua", "Pei Shan"];

const MALAY_GIVEN_M = ["Rahim", "Ahmad", "Ismail", "Hafiz", "Razak", "Yusof", "Salleh", "Idris", "Hassan"];
const MALAY_GIVEN_F = ["Siti", "Nurul", "Aminah", "Faridah", "Rohana", "Zainab", "Halimah", "Noraini"];
const MALAY_FATHER = ["Salleh", "Osman", "Abdullah", "Ibrahim", "Karim", "Bakar", "Hamid", "Latif"];

const INDIAN_GIVEN_M = ["Raj", "Kumar", "Suresh", "Ganesh", "Mohan", "Arjun", "Vijay", "Anand"];
const INDIAN_GIVEN_F = ["Kavitha", "Lakshmi", "Devi", "Priya", "Saraswathi", "Meena", "Anitha", "Radha"];
const INDIAN_FATHER = ["Raman", "Krishnan", "Subramaniam", "Pillai", "Nair", "Govindasamy", "Murugan"];

const EURASIAN_M = ["Gerald Pereira", "Lance de Souza", "Dominic Tessensohn", "Brian Klyne"];
const EURASIAN_F = ["Michelle Pereira", "Sandra de Cruz", "Lorraine Scully", "Patricia Aeria"];

type Ethnicity = "chinese" | "malay" | "indian" | "eurasian";

const CHINESE_DIALECTS = ["Hokkien", "Cantonese", "Teochew", "Hakka", "Hainanese"];
const MALAY_DIALECTS = ["Bazaar Melayu", "Javanese"];
const INDIAN_DIALECTS = ["Spoken Tamil", "Malayalam"];

function buildName(eth: Ethnicity, gender: "M" | "F", r: () => number): { fullName: string; dialect: string | null; language: Language } {
  if (eth === "chinese") {
    const surname = pick(CHINESE_SURNAMES, r);
    const given = gender === "M" ? pick(CHINESE_GIVEN_M, r) : pick(CHINESE_GIVEN_F, r);
    return { fullName: `${surname} ${given}`, dialect: null, language: "zh" };
  }
  if (eth === "malay") {
    const given = gender === "M" ? pick(MALAY_GIVEN_M, r) : pick(MALAY_GIVEN_F, r);
    const link = gender === "M" ? "Bin" : "Binte";
    return { fullName: `${given} ${link} ${pick(MALAY_FATHER, r)}`, dialect: null, language: "ms" };
  }
  if (eth === "indian") {
    const given = gender === "M" ? pick(INDIAN_GIVEN_M, r) : pick(INDIAN_GIVEN_F, r);
    const link = gender === "M" ? "s/o" : "d/o";
    return { fullName: `${given} ${link} ${pick(INDIAN_FATHER, r)}`, dialect: null, language: "ta" };
  }
  return { fullName: gender === "M" ? pick(EURASIAN_M, r) : pick(EURASIAN_F, r), dialect: null, language: "en" };
}

function pickEthnicity(r: () => number): Ethnicity {
  const x = r();
  if (x < 0.74) return "chinese";
  if (x < 0.87) return "malay";
  if (x < 0.96) return "indian";
  return "eurasian";
}

/** Age sampled across the adult range, weighted toward the older cohorts PULSE serves. */
function sampleAge(r: () => number): number {
  const buckets: Array<[number, number, number]> = [
    [21, 34, 0.18],
    [35, 54, 0.27],
    [55, 64, 0.22],
    [65, 74, 0.21],
    [75, 92, 0.12],
  ];
  const x = r();
  let acc = 0;
  for (const [min, max, w] of buckets) {
    acc += w;
    if (x <= acc) {
      return min + Math.floor(r() * (max - min + 1));
    }
  }
  return 70;
}

function dialectFor(eth: Ethnicity, age: number, r: () => number): string | null {
  const prob = age >= 70 ? 0.7 : age >= 60 ? 0.45 : age >= 50 ? 0.2 : 0.05;
  if (!chance(prob, r)) return null;
  if (eth === "chinese") return pick(CHINESE_DIALECTS, r);
  if (eth === "malay") return pick(MALAY_DIALECTS, r);
  if (eth === "indian") return pick(INDIAN_DIALECTS, r);
  return null;
}

function employmentFor(age: number, r: () => number): EmploymentStatus {
  if (age >= 68) return chance(0.85, r) ? "retired" : "self_employed";
  if (age >= 62) return pick(["retired", "employed", "self_employed", "platform_worker"] as const, r);
  if (age < 25) return chance(0.3, r) ? "unemployed" : "employed";
  return pick(["employed", "employed", "employed", "self_employed", "platform_worker"] as const, r);
}

function incomeFor(employment: EmploymentStatus, r: () => number): IncomeBand {
  if (employment === "unemployed" || employment === "retired") return pick(["low", "low", "lower_mid"] as const, r);
  if (employment === "platform_worker") return pick(["low", "lower_mid", "mid"] as const, r);
  return pick(["low", "lower_mid", "mid", "mid", "upper", "high"] as const, r);
}

function digitalLiteracyFor(age: number, r: () => number): DigitalLiteracy {
  if (age >= 72) return pick(["low", "low", "medium"] as const, r);
  if (age >= 60) return pick(["low", "medium", "medium", "high"] as const, r);
  if (age >= 45) return pick(["medium", "high", "high"] as const, r);
  return pick(["medium", "high", "high", "high"] as const, r);
}

function syntheticNric(r: () => number): string {
  const digits = Array.from({ length: 7 }, () => Math.floor(r() * 10)).join("");
  const letter = "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(r() * 24)];
  return `S${digits}${letter}`;
}

function aliasFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? "Member";
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1]![0]}.` : "";
  return `${first} ${lastInitial}`.trim();
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}

function isoDaysAhead(days: number): string {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Case templates
// ---------------------------------------------------------------------------

interface CaseTemplate {
  category: CaseCategory;
  title: string;
  summary: string;
  priority: CasePriority;
  minAge?: number;
  maxAge?: number;
  events: Array<{ type: string; detail: string }>;
}

const CASE_TEMPLATES: CaseTemplate[] = [
  {
    category: "retirement",
    title: "Choosing a CPF LIFE plan before payouts start",
    summary: "Member is approaching the payout eligibility age and needs help comparing the Standard, Basic and Escalating CPF LIFE plans.",
    priority: "high",
    minAge: 63,
    events: [
      { type: "letter_received", detail: "CPF LIFE plan selection letter sent to member." },
      { type: "page_visited", detail: "Member opened the Retirement Payout Planner but did not complete it." },
    ],
  },
  {
    category: "retirement",
    title: "Turning 55 — Retirement Account created",
    summary: "A Retirement Account was created and the member has questions about how much they can withdraw and what stays for payouts.",
    priority: "medium",
    minAge: 54,
    maxAge: 60,
    events: [
      { type: "system", detail: "Retirement Account created; Special Account closed." },
      { type: "enquiry", detail: "Member asked how the $5,000 withdrawal works." },
    ],
  },
  {
    category: "healthcare",
    title: "MediShield Life premium due",
    summary: "Annual MediShield Life premium is due and the member is unsure whether it will be deducted from MediSave automatically.",
    priority: "medium",
    events: [
      { type: "notification_sent", detail: "Premium-due reminder sent via SMS." },
      { type: "enquiry", detail: "Member asked if MediSave will be used automatically." },
    ],
  },
  {
    category: "healthcare",
    title: "Using MediSave for a hospital bill",
    summary: "Member was hospitalised and needs to understand MediSave withdrawal limits for the stay.",
    priority: "high",
    events: [
      { type: "claim", detail: "Hospital submitted a MediSave claim for the inpatient stay." },
      { type: "enquiry", detail: "Member asked why part of the bill was not covered." },
    ],
  },
  {
    category: "healthcare",
    title: "CareShield Life enrolment query",
    summary: "Member received CareShield Life information and wants to know the monthly payout if severely disabled.",
    priority: "low",
    events: [{ type: "letter_received", detail: "CareShield Life information pack sent." }],
  },
  {
    category: "housing",
    title: "Using CPF for monthly HDB instalment",
    summary: "Member wants to use Ordinary Account savings for their HDB loan and asks about the limits.",
    priority: "medium",
    maxAge: 60,
    events: [
      { type: "enquiry", detail: "Member asked how much OA can be used for the flat." },
      { type: "page_visited", detail: "Viewed 'Using your CPF to buy a home'." },
    ],
  },
  {
    category: "housing",
    title: "Accrued interest on flat sale",
    summary: "Member is selling their flat and was surprised by the accrued interest they must refund to CPF.",
    priority: "high",
    minAge: 45,
    events: [
      { type: "enquiry", detail: "Member queried the accrued interest refund amount." },
      { type: "escalation", detail: "Member expressed confusion about why interest is charged." },
    ],
  },
  {
    category: "financial",
    title: "Annual CPF contribution statement",
    summary: "Member received their yearly contribution statement and wants help reading the OA/SA/MA breakdown.",
    priority: "low",
    events: [{ type: "letter_received", detail: "Annual statement of account issued." }],
  },
  {
    category: "financial",
    title: "Top-up tax relief enquiry",
    summary: "Member wants to top up their Retirement Account for tax relief and asks about the limits.",
    priority: "low",
    minAge: 30,
    events: [{ type: "enquiry", detail: "Member asked about RSTU tax relief limits." }],
  },
  {
    category: "employment",
    title: "CPF contribution dispute with employer",
    summary: "Member believes their employer has not paid the correct CPF contribution for recent months.",
    priority: "high",
    minAge: 22,
    maxAge: 64,
    events: [
      { type: "complaint", detail: "Member reported missing employer CPF contributions." },
      { type: "review", detail: "Case flagged for contribution compliance review." },
    ],
  },
  {
    category: "employment",
    title: "Self-employed MediSave contribution",
    summary: "Self-employed member received a notice to contribute to MediSave based on their net trade income.",
    priority: "medium",
    events: [{ type: "notification_sent", detail: "MediSave contribution notice issued." }],
  },
  {
    category: "legal",
    title: "Updating CPF nomination",
    summary: "Member wants to update who will receive their CPF savings and how to make a nomination.",
    priority: "medium",
    minAge: 30,
    events: [{ type: "enquiry", detail: "Member asked how to make or change a CPF nomination." }],
  },
  {
    category: "legal",
    title: "Suspected scam targeting CPF savings",
    summary: "Member received a suspicious message asking for their Singpass details and reported it.",
    priority: "high",
    events: [
      { type: "scam_report", detail: "Member reported a phishing SMS impersonating CPF." },
      { type: "safeguard", detail: "Advised member to lock CPF savings and never share OTP." },
    ],
  },
];

function buildCases(userId: string, age: number, r: () => number): CorrespondenceCase[] {
  const count = age >= 65 ? pick([1, 2, 2, 3] as const, r) : pick([0, 0, 1, 1, 2] as const, r);
  const eligible = CASE_TEMPLATES.filter((t) => (t.minAge ?? 0) <= age && age <= (t.maxAge ?? 200));
  const cases: CorrespondenceCase[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count && eligible.length > 0; i += 1) {
    const template = pick(eligible, r);
    if (used.has(template.title)) continue;
    used.add(template.title);

    const createdDaysAgo = 3 + Math.floor(r() * 110);
    const status = pick(["open", "open", "in_progress", "resolved"] as const, r);
    const channel: CaseChannel = pick(["web", "web", "chat", "voice", "mail", "sms"] as const, r);
    const language: Language = pick(["en", "en", "zh", "ms", "ta"] as const, r);
    const caseId = newId("case");
    const ref = `CPF-${new Date().getFullYear()}-${Math.floor(r() * 90000 + 10000)}`;

    const events = template.events.map((e, idx) => ({
      id: newId("evt"),
      caseId,
      eventType: e.type,
      detail: e.detail,
      occurredAt: isoDaysAgo(createdDaysAgo - idx),
    }));

    cases.push({
      id: caseId,
      userId,
      reference: ref,
      category: template.category,
      title: template.title,
      summary: template.summary,
      status,
      priority: template.priority,
      channel,
      language,
      createdAt: isoDaysAgo(createdDaysAgo),
      dueAt: status === "resolved" ? null : isoDaysAhead(3 + Math.floor(r() * 21)),
      resolvedAt: status === "resolved" ? isoDaysAgo(Math.max(0, createdDaysAgo - 5)) : null,
      events,
    });
  }
  return cases;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export function generateCustomers(count: number, seed = 20260531): CustomerDetail[] {
  const customers: CustomerDetail[] = [];
  const usedSubjects = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const r = rng(seed * 7919 + i * 104729);
    const eth = pickEthnicity(r);
    const gender: "M" | "F" = chance(0.5, r) ? "M" : "F";
    const age = sampleAge(r);
    const { fullName, language } = buildName(eth, gender, r);
    const dialect = dialectFor(eth, age, r);
    const employmentStatus = employmentFor(age, r);
    const incomeBand = incomeFor(employmentStatus, r);
    const digitalLiteracy = digitalLiteracyFor(age, r);

    const accessibility: "none" | "high_contrast" | "assisted" =
      age >= 70 && chance(0.25, r) ? "assisted" : chance(0.1, r) ? "high_contrast" : "none";
    const caregiverLinked = age >= 75 && chance(0.4, r);

    // Many seniors prefer dialect/mother tongue; some prefer English regardless.
    const preferredLanguage: Language = chance(age >= 60 ? 0.65 : 0.35, r) ? language : "en";
    const tier = deriveTier({ age, digitalLiteracy, accessibility });

    let singpassSubject = syntheticNric(r);
    while (usedSubjects.has(singpassSubject)) {
      singpassSubject = syntheticNric(r);
    }
    usedSubjects.add(singpassSubject);

    const id = newId("usr");
    const now = new Date().toISOString();
    const dob = new Date(Date.now() - age * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const cpfAccount = buildCpfAccount({ userId: id, age, incomeBand, employmentStatus, r });
    const vulnerabilityMarkers = buildMarkers({ userId: id, age, digitalLiteracy, accessibility, caregiverLinked, r });
    const cases = buildCases(id, age, r);

    customers.push({
      id,
      singpassSubject,
      fullName,
      displayAlias: aliasFor(fullName),
      dateOfBirth: dob,
      age,
      ageBracket: ageBracketFor(age),
      gender,
      residentialStatus: chance(0.92, r) ? "citizen" : "pr",
      preferredLanguage,
      dialect,
      employmentStatus,
      digitalLiteracy,
      vulnerabilityTier: tier,
      persona: describePersona({ age, employmentStatus, digitalLiteracy, dialect, tier }),
      createdAt: now,
      updatedAt: now,
      cpfAccount,
      vulnerabilityMarkers,
      cases,
    });
  }

  return customers;
}
