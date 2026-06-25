/**
 * Seed specific, named demo customers into the SQLite store (additive, idempotent).
 * Run:  npm run db:seed:named
 *
 * Unlike `db:seed` (which generates ~150 random members), this inserts a fixed set
 * of hand-specified members with explicit OA / SA / MA balances — used to fill out
 * realistic internal data for the officer dashboard's member panel.
 */
import "dotenv/config"; // MUST be first: load .env so SQLITE_PATH matches the backend's DB
import { migrate, insertCustomerBundle, listCustomers } from "../data/customers/repository.js";
import { buildCustomerFromInput } from "../data/customers/factory.js";
import type { Language, ResidentialStatus } from "../data/customers/types.js";

interface NamedSpec {
  fullName: string;
  age: number;
  gender: "M" | "F";
  preferredLanguage: Language;
  residentialStatus: ResidentialStatus;
  oa: number;
  sa: number;
  ma: number;
  note: string;
}

const PEOPLE: NamedSpec[] = [
  // Indian, 24 (the request said "she")
  { fullName: "Muhammad Hira", age: 24, gender: "F", preferredLanguage: "ta", residentialStatus: "citizen", oa: 18000, sa: 9000, ma: 12000, note: "Indian" },
  // Indonesian, 24 (name was unclear in the request — placeholder, rename if needed)
  { fullName: "Budi Santoso", age: 24, gender: "M", preferredLanguage: "ms", residentialStatus: "pr", oa: 15000, sa: 7500, ma: 10000, note: "Indonesian (placeholder name)" },
  // Nathaniel Neill, 48
  { fullName: "Nathaniel Neill", age: 48, gender: "M", preferredLanguage: "en", residentialStatus: "citizen", oa: 120000, sa: 95000, ma: 68000, note: "age 48" },
];

migrate();

const existing = new Set(listCustomers({ limit: 5000 }).items.map((c) => c.fullName));

PEOPLE.forEach((p, i) => {
  if (existing.has(p.fullName)) {
    console.log(`skip (already exists): ${p.fullName}`);
    return;
  }
  // Distinct per-person seed → distinct synthetic NRIC (singpass_subject is UNIQUE).
  // A shared Date.now() seed in a tight loop produces identical NRICs → collisions.
  const detail = buildCustomerFromInput({
    fullName: p.fullName,
    age: p.age,
    gender: p.gender,
    preferredLanguage: p.preferredLanguage,
    residentialStatus: p.residentialStatus,
    incomeBand: "mid",
  }, Date.now() + i * 100003);
  // Override the synthesised CPF account with the explicit arbitrary balances.
  if (detail.cpfAccount) {
    detail.cpfAccount.oaBalance = p.oa;
    detail.cpfAccount.saBalance = p.sa;
    detail.cpfAccount.maBalance = p.ma;
    detail.cpfAccount.raBalance = 0; // all under 55 → no Retirement Account yet
    detail.cpfAccount.total = p.oa + p.sa + p.ma;
  }
  try {
    insertCustomerBundle(detail);
    console.log(`added: ${p.fullName} (${p.note}, age ${p.age}) — OA ${p.oa}, SA ${p.sa}, MA ${p.ma}, total ${p.oa + p.sa + p.ma}`);
  } catch (err) {
    console.error(`FAILED to add ${p.fullName}: ${(err as Error).message}`);
  }
});

console.log("seed-named: done");
