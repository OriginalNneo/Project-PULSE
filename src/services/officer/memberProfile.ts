import { getCustomer, listCustomers } from "../../data/customers/repository.js";
import type { CustomerDetail } from "../../data/customers/types.js";
import type { ChatSession } from "../chatbot/types.js";

/**
 * The member profile shown in the right-hand panel of the conversation view —
 * the "Singpass record" an officer sees while handling a chat. Built from the
 * customer DB when the chat is linked to a member; otherwise a representative
 * seeded member is matched so the panel is always fully populated (demo mode).
 * Fields not yet stored in the DB (contact, address, scheme enrolments, unread
 * letters) are derived into realistic placeholders.
 */

export interface MemberProfile {
  // Identity header
  memberId: string;
  maskedNric: string;
  fullName: string;
  age: number;
  residentialStatus: string;
  dateOfBirth: string;
  contact: string;
  preferredLanguage: string;
  address: string;
  // CPF accounts
  ordinary: number;
  medisave: number;
  retirement: number;
  // Retirement overview
  retirementSumElected: string;
  monthlyPayout: number | null;
  payoutStartDate: string | null;
  shortfallVsFullRs: number | null;
  // Schemes
  schemes: Array<{ name: string; status: string }>;
  // Flags and alerts
  flags: string[];
  /** "real" = pulled from a linked member; "demo" = representative fallback. */
  dataSource: "real" | "demo";
}

const LANGUAGE_LABEL: Record<string, string> = {
  en: "English",
  zh: "Mandarin",
  ms: "Malay",
  ta: "Tamil",
};

const RESIDENTIAL_LABEL: Record<string, string> = {
  citizen: "Singapore Citizen",
  pr: "Permanent Resident",
};

const RETIREMENT_SUM_LABEL: Record<string, string> = {
  BRS: "Basic",
  FRS: "Full",
  ERS: "Enhanced",
};

// Full Retirement Sum reference (2026) used to compute the shortfall row.
const FULL_RETIREMENT_SUM_2026 = 213_000;

// Human-readable labels for the raw vulnerability marker values in the DB.
const MARKER_LABEL: Record<string, string> = {
  "65_plus": "elderly (65+)",
  "75_plus": "elderly (75+)",
  assisted: "needs assisted access",
  high_contrast: "low vision / high-contrast UI",
  linked: "caregiver-assisted",
  self_reported: "low digital confidence",
};

function maskNricFromSubject(subject: string, id: string): string {
  // We never store the real NRIC; build a stable masked label for display.
  const digits = Array.from(subject + id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 9000 + 1000;
  return `S${digits}…A`;
}

function deriveContact(id: string): string {
  // Singapore mobile: 8 digits starting with 8 or 9, shown as "+65 9XXX XXXX".
  const sum = Array.from(id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const first = 9;
  const rest = String((sum * 31) % 10_000_000).padStart(7, "0"); // 7 more digits
  return `+65 ${first}${rest.slice(0, 3)} ${rest.slice(3)}`;
}

function deriveAddress(id: string): string {
  const blk = (Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) % 800) + 100;
  const towns = ["Toa Payoh Lor 6", "Ang Mo Kio Ave 3", "Bedok North St 1", "Tampines St 21", "Yishun Ring Rd", "Clementi Ave 4"];
  const town = towns[blk % towns.length];
  const unit = `#0${(blk % 9) + 1}-${(blk % 90) + 10}`;
  return `Blk ${blk} ${town}, ${unit}`;
}

function buildSchemes(member: CustomerDetail): Array<{ name: string; status: string }> {
  const a = member.cpfAccount;
  const schemes: Array<{ name: string; status: string }> = [];
  schemes.push({ name: "CPF LIFE", status: a?.cpfLifePlan ? "Active" : member.age >= 65 ? "Active" : "Not yet started" });
  schemes.push({ name: "MediShield Life", status: "Enrolled" });
  // Silver Support: lower-balance seniors qualify (illustrative derivation).
  const lowBalance = (a?.total ?? 0) < 60_000;
  schemes.push({ name: "Silver Support Scheme", status: member.age >= 65 && lowBalance ? "Enrolled" : "Not eligible" });
  schemes.push({
    name: "Matched Retirement Savings",
    status: member.age >= 55 && member.age <= 70 && lowBalance ? "Eligible - Not Enrolled" : "Not eligible",
  });
  return schemes;
}

function buildFlags(member: CustomerDetail, shortfall: number | null): string[] {
  const flags: string[] = [];
  // Unread correspondence → "Unread letter" alert.
  const unread = member.cases.find((c) => c.status === "open");
  if (unread) {
    flags.push(`Unread letter — ${unread.title}, unread since ${formatDate(unread.createdAt)}`);
  }
  if (shortfall && shortfall > 0) {
    flags.push(`Shortfall alert — ${money(shortfall)} below Full Retirement Sum target`);
  }
  // Vulnerability markers → "Vulnerable member" flag (human-readable reasons).
  if (member.vulnerabilityMarkers.length > 0 || member.vulnerabilityTier === "high_touch") {
    const reasons = member.vulnerabilityMarkers
      .map((m) => MARKER_LABEL[m.markerValue] ?? m.markerValue.replace(/_/g, " "))
      .slice(0, 3)
      .join(", ");
    flags.push(`Vulnerable member — ${reasons || "requires high-touch support"}`);
  }
  return flags;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function toProfile(member: CustomerDetail, dataSource: "real" | "demo"): MemberProfile {
  const a = member.cpfAccount;
  const shortfall =
    a?.retirementSumAmount != null ? Math.max(0, FULL_RETIREMENT_SUM_2026 - a.retirementSumAmount) : null;

  return {
    memberId: member.id,
    maskedNric: maskNricFromSubject(member.singpassSubject, member.id),
    fullName: member.fullName,
    age: member.age,
    residentialStatus: RESIDENTIAL_LABEL[member.residentialStatus] ?? member.residentialStatus,
    dateOfBirth: formatDate(member.dateOfBirth),
    contact: deriveContact(member.id),
    preferredLanguage: LANGUAGE_LABEL[member.preferredLanguage] ?? member.preferredLanguage,
    address: deriveAddress(member.id),
    ordinary: a?.oaBalance ?? 0,
    medisave: a?.maBalance ?? 0,
    retirement: a?.raBalance ?? 0,
    retirementSumElected: a?.retirementSumTarget ? RETIREMENT_SUM_LABEL[a.retirementSumTarget] ?? a.retirementSumTarget : "Not elected",
    monthlyPayout: a?.monthlyPayoutEstimate ?? null,
    payoutStartDate:
      a?.payoutEligibilityAge != null && member.dateOfBirth
        ? payoutStart(member.dateOfBirth, a.payoutEligibilityAge)
        : null,
    shortfallVsFullRs: shortfall,
    schemes: buildSchemes(member),
    flags: buildFlags(member, shortfall),
    dataSource,
  };
}

function payoutStart(dob: string, eligibilityAge: number): string {
  const d = new Date(dob);
  d.setFullYear(d.getFullYear() + eligibilityAge);
  return d.toLocaleDateString("en-SG", { month: "short", year: "numeric" });
}

/**
 * Resolve the member profile for a chat session.
 * - If the session is linked to a real member, use it.
 * - Otherwise deterministically pick a representative seeded member (by the
 *   session's channel-user id / name) so the panel is always populated.
 */
export function resolveMemberProfile(session: ChatSession): MemberProfile | null {
  if (session.memberId) {
    const member = getCustomer(session.memberId);
    if (member) return toProfile(member, "real");
  }

  // Demo fallback: pick a senior member deterministically from the seed set so
  // the same chat always shows the same person.
  const { items } = listCustomers({ ageBracket: "65_plus", limit: 100 });
  if (items.length === 0) {
    const any = listCustomers({ limit: 100 });
    if (any.items.length === 0) return null;
    return pickDeterministic(any.items, session);
  }
  return pickDeterministic(items, session);
}

function pickDeterministic(items: Array<{ id: string }>, session: ChatSession): MemberProfile | null {
  const seed = session.channelUserId ?? session.sessionId;
  const idx = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % items.length;
  const chosen = getCustomer(items[idx]!.id);
  return chosen ? toProfile(chosen, "demo") : null;
}
