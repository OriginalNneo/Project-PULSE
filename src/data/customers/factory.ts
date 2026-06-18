import { newId } from "../ids.js";
import type {
  AgeBracket,
  CpfAccount,
  Customer,
  CustomerDetail,
  DigitalLiteracy,
  EmploymentStatus,
  Language,
  ResidentialStatus,
  VulnerabilityMarker,
  VulnerabilityTier,
} from "./types.js";

/** CPF figures for 2026, used to synthesise believable account data. */
export const CPF = {
  BHS: 79000,
  BRS: 110200,
  FRS: 220400,
  ERS: 440800,
  payoutEligibilityAge: 65,
  monthlyPayout: { BRS: 950, FRS: 1780, ERS: 3440 } as Record<"BRS" | "FRS" | "ERS", number>,
};

export type IncomeBand = "low" | "lower_mid" | "mid" | "upper" | "high";

export function ageBracketFor(age: number): AgeBracket {
  if (age < 35) return "under_35";
  if (age < 55) return "35_to_54";
  if (age < 65) return "55_to_64";
  return "65_plus";
}

// ---------------------------------------------------------------------------
// Seeded RNG so reseeds are deterministic
// ---------------------------------------------------------------------------

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)] as T;
}

export function chance(p: number, r: () => number): boolean {
  return r() < p;
}

function jitter(value: number, pct: number, r: () => number): number {
  const factor = 1 + (r() * 2 - 1) * pct;
  return Math.max(0, value * factor);
}

function round(value: number, to = 100): number {
  return Math.round(value / to) * to;
}

// ---------------------------------------------------------------------------
// CPF account synthesis
// ---------------------------------------------------------------------------

const BASE_TOTAL: Record<AgeBracket, Record<IncomeBand, number>> = {
  under_35: { low: 22000, lower_mid: 40000, mid: 62000, upper: 85000, high: 110000 },
  "35_to_54": { low: 85000, lower_mid: 150000, mid: 230000, upper: 320000, high: 420000 },
  "55_to_64": { low: 140000, lower_mid: 240000, mid: 360000, upper: 500000, high: 640000 },
  "65_plus": { low: 120000, lower_mid: 210000, mid: 310000, upper: 430000, high: 560000 },
};

export function buildCpfAccount(params: {
  userId: string;
  age: number;
  incomeBand: IncomeBand;
  employmentStatus: EmploymentStatus;
  r: () => number;
}): CpfAccount {
  const { userId, age, incomeBand, r } = params;
  const bracket = ageBracketFor(age);
  const total = round(jitter(BASE_TOTAL[bracket][incomeBand], 0.25, r));
  const now = new Date().toISOString();

  let oa = 0;
  let sa = 0;
  let ma = 0;
  let ra = 0;
  let retirementSumTarget: CpfAccount["retirementSumTarget"] = null;
  let retirementSumAmount: number | null = null;
  let cpfLifePlan: CpfAccount["cpfLifePlan"] = null;
  let monthlyPayoutEstimate: number | null = null;

  if (age < 55) {
    // Three active accounts. MediSave capped at BHS, remainder to OA/SA.
    ma = Math.min(round(total * (bracket === "under_35" ? 0.24 : 0.28)), CPF.BHS);
    const remainder = total - ma;
    sa = round(remainder * 0.28);
    oa = round(remainder - sa);
  } else {
    // SA closed; Retirement Account funded toward the highest sum the member can meet.
    ma = Math.min(round(total * 0.32), CPF.BHS);
    const setAside = total - ma;
    if (setAside >= CPF.ERS) {
      retirementSumTarget = "ERS";
      retirementSumAmount = CPF.ERS;
    } else if (setAside >= CPF.FRS) {
      retirementSumTarget = "FRS";
      retirementSumAmount = CPF.FRS;
    } else {
      retirementSumTarget = "BRS";
      retirementSumAmount = CPF.BRS;
    }
    ra = Math.min(round(setAside), retirementSumAmount);
    oa = round(Math.max(0, setAside - ra));
    cpfLifePlan = pick(["standard", "standard", "escalating", "basic"] as const, r);

    const basePayout = CPF.monthlyPayout[retirementSumTarget];
    const fundedRatio = retirementSumAmount > 0 ? Math.min(1, ra / retirementSumAmount) : 0;
    monthlyPayoutEstimate = age >= CPF.payoutEligibilityAge ? round(basePayout * Math.max(0.4, fundedRatio), 10) : null;
  }

  return {
    userId,
    oaBalance: oa,
    saBalance: sa,
    maBalance: ma,
    raBalance: ra,
    bhsApplicable: CPF.BHS,
    retirementSumTarget,
    retirementSumAmount,
    cpfLifePlan,
    monthlyPayoutEstimate,
    payoutEligibilityAge: CPF.payoutEligibilityAge,
    total: oa + sa + ma + ra,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Vulnerability markers + tier
// ---------------------------------------------------------------------------

export function buildMarkers(params: {
  userId: string;
  age: number;
  digitalLiteracy: DigitalLiteracy;
  accessibility: "none" | "high_contrast" | "assisted";
  caregiverLinked: boolean;
  r: () => number;
}): VulnerabilityMarker[] {
  const { userId, age, digitalLiteracy, accessibility, caregiverLinked } = params;
  const now = new Date().toISOString();
  const markers: VulnerabilityMarker[] = [];
  const add = (markerType: string, markerValue: string, source: string, confidence: number) =>
    markers.push({ id: newId("mrk"), userId, markerType, markerValue, source, confidence, createdAt: now });

  if (age >= 65) {
    add("senior_age_bracket", age >= 75 ? "75_plus" : "65_plus", "identity", 1);
  }
  if (digitalLiteracy === "low") {
    add("low_digital_confidence", "self_reported", "survey", 0.7);
  }
  if (accessibility === "high_contrast") {
    add("accessibility_preference", "high_contrast", "settings", 0.9);
  }
  if (accessibility === "assisted") {
    add("accessibility_preference", "assisted", "settings", 0.9);
  }
  if (caregiverLinked) {
    add("caregiver_assisted", "linked", "proxy", 0.8);
  }
  return markers;
}

export function deriveTier(params: {
  age: number;
  digitalLiteracy: DigitalLiteracy;
  accessibility: "none" | "high_contrast" | "assisted";
}): VulnerabilityTier {
  const { age, digitalLiteracy, accessibility } = params;
  if (age >= 75 || accessibility === "assisted" || (age >= 65 && digitalLiteracy === "low")) {
    return "high_touch";
  }
  if (age >= 65 || digitalLiteracy === "low" || accessibility === "high_contrast") {
    return "guided";
  }
  return "self_service";
}

export function describePersona(params: {
  age: number;
  employmentStatus: EmploymentStatus;
  digitalLiteracy: DigitalLiteracy;
  dialect: string | null;
  tier: VulnerabilityTier;
}): string {
  const { age, employmentStatus, digitalLiteracy, dialect, tier } = params;
  const stage = age >= 65 ? "Senior" : age >= 55 ? "Pre-retiree" : age >= 35 ? "Mid-career" : "Young adult";
  const parts = [stage, employmentStatus.replace("_", " ")];
  if (digitalLiteracy === "low") parts.push("low digital confidence");
  if (dialect) parts.push(`speaks ${dialect}`);
  if (tier === "high_touch") parts.push("needs high-touch support");
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Build a full customer from minimal input (used by the "key in new info" route)
// ---------------------------------------------------------------------------

export interface NewCustomerInput {
  fullName: string;
  age: number;
  gender?: "M" | "F";
  residentialStatus?: ResidentialStatus;
  preferredLanguage?: Language;
  dialect?: string | null;
  employmentStatus?: EmploymentStatus;
  digitalLiteracy?: DigitalLiteracy;
  incomeBand?: IncomeBand;
  accessibility?: "none" | "high_contrast" | "assisted";
  caregiverLinked?: boolean;
  singpassSubject?: string;
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

export function buildCustomerFromInput(input: NewCustomerInput, seed = Date.now()): CustomerDetail {
  const r = rng(seed);
  const age = Math.max(18, Math.min(100, Math.round(input.age)));
  const now = new Date().toISOString();
  const dob = new Date(Date.now() - age * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const employmentStatus: EmploymentStatus = input.employmentStatus ?? (age >= 65 ? "retired" : "employed");
  const digitalLiteracy: DigitalLiteracy = input.digitalLiteracy ?? (age >= 70 ? "low" : age >= 55 ? "medium" : "high");
  const accessibility = input.accessibility ?? "none";
  const caregiverLinked = input.caregiverLinked ?? false;
  const dialect = input.dialect ?? null;
  const tier = deriveTier({ age, digitalLiteracy, accessibility });

  const id = newId("usr");
  const customer: Customer = {
    id,
    singpassSubject: input.singpassSubject ?? syntheticNric(r),
    fullName: input.fullName,
    displayAlias: aliasFor(input.fullName),
    dateOfBirth: dob,
    age,
    ageBracket: ageBracketFor(age),
    gender: input.gender ?? pick(["M", "F"] as const, r),
    residentialStatus: input.residentialStatus ?? "citizen",
    preferredLanguage: input.preferredLanguage ?? "en",
    dialect,
    employmentStatus,
    digitalLiteracy,
    vulnerabilityTier: tier,
    persona: describePersona({ age, employmentStatus, digitalLiteracy, dialect, tier }),
    createdAt: now,
    updatedAt: now,
  };

  const cpfAccount = buildCpfAccount({
    userId: id,
    age,
    incomeBand: input.incomeBand ?? "mid",
    employmentStatus,
    r,
  });

  const vulnerabilityMarkers = buildMarkers({ userId: id, age, digitalLiteracy, accessibility, caregiverLinked, r });

  return { ...customer, cpfAccount, vulnerabilityMarkers, cases: [] };
}
