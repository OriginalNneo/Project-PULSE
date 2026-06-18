// Frontend mirror of the backend console/copilot contracts.

export type AgeBracket = "under_35" | "35_to_54" | "55_to_64" | "65_plus";
export type VulnerabilityTier = "self_service" | "guided" | "high_touch";
export type Language = "en" | "zh" | "ms" | "ta";

export interface CpfAccount {
  oaBalance: number;
  saBalance: number;
  maBalance: number;
  raBalance: number;
  bhsApplicable: number;
  retirementSumTarget: "BRS" | "FRS" | "ERS" | null;
  retirementSumAmount: number | null;
  cpfLifePlan: "standard" | "basic" | "escalating" | null;
  monthlyPayoutEstimate: number | null;
  payoutEligibilityAge: number;
  total: number;
}

export interface VulnerabilityMarker {
  id: string;
  markerType: string;
  markerValue: string;
  source: string;
  confidence: number;
}

export type CaseStatus = "open" | "in_progress" | "resolved" | "dismissed";
export type CaseCategory = "financial" | "healthcare" | "housing" | "employment" | "legal" | "retirement";
export type CasePriority = "low" | "medium" | "high";

export interface CaseEvent {
  id: string;
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
  channel: string;
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
  residentialStatus: "citizen" | "pr";
  preferredLanguage: Language;
  dialect: string | null;
  employmentStatus: string;
  digitalLiteracy: "low" | "medium" | "high";
  vulnerabilityTier: VulnerabilityTier;
  persona: string;
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

export interface Stats {
  customers: {
    totalCustomers: number;
    byAgeBracket: Record<string, number>;
    byTier: Record<string, number>;
    totalCases: number;
    openCases: number;
    highPriorityCases: number;
    totalCpfManaged: number;
  };
  knowledge: { sections: number; documents: number; terminology: number; backend: string };
  ai: { configured: boolean; model: string };
}

export interface KnowledgeSection {
  sectionKey: string;
  title: string;
  url: string;
  summary: string;
}

export interface KnowledgeDoc {
  docId: string;
  sectionKey: string;
  topic: string;
  title: string;
  summary: string;
  keyFacts: string[];
  audienceTags: string[];
  sourceUrl: string;
  confidence: string;
}

export interface CopilotCitation {
  docId: string;
  title: string;
  topic: string;
  sectionKey: string;
  sourceUrl: string;
  score: number;
}

export interface CopilotResult {
  answer: string;
  citations: CopilotCitation[];
  terminology: Array<{ term: string; plainEnglish: string }>;
  navigation: string[];
  member: { id: string; alias: string; ageBracket: string; tier: string; preferredLanguage: string } | null;
  model: string | null;
  source: "llm" | "fallback";
  groundedInKnowledge: boolean;
}

export interface NewCustomerInput {
  fullName: string;
  age: number;
  preferredLanguage?: Language;
  dialect?: string | null;
  employmentStatus?: string;
  digitalLiteracy?: "low" | "medium" | "high";
  incomeBand?: "low" | "lower_mid" | "mid" | "upper" | "high";
  accessibility?: "none" | "high_contrast" | "assisted";
}
