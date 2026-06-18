/** Domain types for the SQLite customer / identity store. */

export type AgeBracket = "under_35" | "35_to_54" | "55_to_64" | "65_plus";
export type ResidentialStatus = "citizen" | "pr";
export type Language = "en" | "zh" | "ms" | "ta";
export type DigitalLiteracy = "low" | "medium" | "high";
export type VulnerabilityTier = "self_service" | "guided" | "high_touch";
export type EmploymentStatus =
  | "employed"
  | "self_employed"
  | "platform_worker"
  | "retired"
  | "unemployed";

export type RetirementSumTarget = "BRS" | "FRS" | "ERS";
export type CpfLifePlan = "standard" | "basic" | "escalating";

export interface CpfAccount {
  userId: string;
  /** Ordinary Account balance (housing/insurance/investment/education). */
  oaBalance: number;
  /** Special Account balance — 0 once the member turns 55 (SA closed). */
  saBalance: number;
  /** MediSave Account balance (healthcare). */
  maBalance: number;
  /** Retirement Account balance — populated from age 55. */
  raBalance: number;
  /** Basic Healthcare Sum that applies to this member. */
  bhsApplicable: number;
  retirementSumTarget: RetirementSumTarget | null;
  retirementSumAmount: number | null;
  cpfLifePlan: CpfLifePlan | null;
  monthlyPayoutEstimate: number | null;
  payoutEligibilityAge: number;
  total: number;
  updatedAt: string;
}

export interface VulnerabilityMarker {
  id: string;
  userId: string;
  markerType: string;
  markerValue: string;
  source: string;
  confidence: number;
  createdAt: string;
}

export type CaseStatus = "open" | "in_progress" | "resolved" | "dismissed";
export type CaseCategory =
  | "financial"
  | "healthcare"
  | "housing"
  | "employment"
  | "legal"
  | "retirement";
export type CasePriority = "low" | "medium" | "high";
export type CaseChannel = "web" | "chat" | "voice" | "sms" | "mail";

export interface CaseEvent {
  id: string;
  caseId: string;
  eventType: string;
  detail: string;
  occurredAt: string;
}

export interface CorrespondenceCase {
  id: string;
  userId: string;
  reference: string;
  category: CaseCategory;
  title: string;
  summary: string;
  status: CaseStatus;
  priority: CasePriority;
  channel: CaseChannel;
  language: Language;
  createdAt: string;
  dueAt: string | null;
  resolvedAt: string | null;
  events?: CaseEvent[];
}

export interface Customer {
  id: string;
  singpassSubject: string;
  fullName: string;
  displayAlias: string;
  dateOfBirth: string;
  age: number;
  ageBracket: AgeBracket;
  gender: "M" | "F";
  residentialStatus: ResidentialStatus;
  preferredLanguage: Language;
  dialect: string | null;
  employmentStatus: EmploymentStatus;
  digitalLiteracy: DigitalLiteracy;
  vulnerabilityTier: VulnerabilityTier;
  persona: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends Customer {
  cpfAccount: CpfAccount | null;
  vulnerabilityMarkers: VulnerabilityMarker[];
  cases: CorrespondenceCase[];
}

export interface CaseWithMember extends CorrespondenceCase {
  memberAlias: string;
  memberAgeBracket: AgeBracket;
}
