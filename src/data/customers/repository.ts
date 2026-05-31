import { getDb } from "../sqlite/connection.js";
import { migrateCustomerSchema } from "../sqlite/schema.js";
import { newId } from "../ids.js";
import type {
  AgeBracket,
  CaseEvent,
  CaseWithMember,
  CorrespondenceCase,
  CpfAccount,
  Customer,
  CustomerDetail,
  VulnerabilityMarker,
} from "./types.js";

export function migrate(): void {
  migrateCustomerSchema(getDb());
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    singpassSubject: row.singpass_subject,
    fullName: row.full_name,
    displayAlias: row.display_alias,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    ageBracket: row.age_bracket,
    gender: row.gender,
    residentialStatus: row.residential_status,
    preferredLanguage: row.preferred_language,
    dialect: row.dialect ?? null,
    employmentStatus: row.employment_status,
    digitalLiteracy: row.digital_literacy,
    vulnerabilityTier: row.vulnerability_tier,
    persona: row.persona,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAccount(row: any): CpfAccount {
  return {
    userId: row.user_id,
    oaBalance: row.oa_balance,
    saBalance: row.sa_balance,
    maBalance: row.ma_balance,
    raBalance: row.ra_balance,
    bhsApplicable: row.bhs_applicable,
    retirementSumTarget: row.retirement_sum_target ?? null,
    retirementSumAmount: row.retirement_sum_amount ?? null,
    cpfLifePlan: row.cpf_life_plan ?? null,
    monthlyPayoutEstimate: row.monthly_payout_estimate ?? null,
    payoutEligibilityAge: row.payout_eligibility_age,
    total: row.total,
    updatedAt: row.updated_at,
  };
}

function mapMarker(row: any): VulnerabilityMarker {
  return {
    id: row.id,
    userId: row.user_id,
    markerType: row.marker_type,
    markerValue: row.marker_value,
    source: row.source,
    confidence: row.confidence,
    createdAt: row.created_at,
  };
}

function mapCase(row: any): CorrespondenceCase {
  return {
    id: row.id,
    userId: row.user_id,
    reference: row.reference,
    category: row.category,
    title: row.title,
    summary: row.summary,
    status: row.status,
    priority: row.priority,
    channel: row.channel,
    language: row.language,
    createdAt: row.created_at,
    dueAt: row.due_at ?? null,
    resolvedAt: row.resolved_at ?? null,
  };
}

function mapCaseEvent(row: any): CaseEvent {
  return {
    id: row.id,
    caseId: row.case_id,
    eventType: row.event_type,
    detail: row.detail,
    occurredAt: row.occurred_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export function insertCustomerBundle(detail: CustomerDetail): void {
  const db = getDb();
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, singpass_subject, full_name, display_alias, date_of_birth, age, age_bracket,
      gender, residential_status, preferred_language, dialect, employment_status,
      digital_literacy, vulnerability_tier, persona, created_at, updated_at
    ) VALUES (
      @id, @singpassSubject, @fullName, @displayAlias, @dateOfBirth, @age, @ageBracket,
      @gender, @residentialStatus, @preferredLanguage, @dialect, @employmentStatus,
      @digitalLiteracy, @vulnerabilityTier, @persona, @createdAt, @updatedAt
    )
  `);

  const insertAccount = db.prepare(`
    INSERT INTO cpf_accounts (
      user_id, oa_balance, sa_balance, ma_balance, ra_balance, bhs_applicable,
      retirement_sum_target, retirement_sum_amount, cpf_life_plan, monthly_payout_estimate,
      payout_eligibility_age, total, updated_at
    ) VALUES (
      @userId, @oaBalance, @saBalance, @maBalance, @raBalance, @bhsApplicable,
      @retirementSumTarget, @retirementSumAmount, @cpfLifePlan, @monthlyPayoutEstimate,
      @payoutEligibilityAge, @total, @updatedAt
    )
  `);

  const insertMarker = db.prepare(`
    INSERT INTO vulnerability_markers (id, user_id, marker_type, marker_value, source, confidence, created_at)
    VALUES (@id, @userId, @markerType, @markerValue, @source, @confidence, @createdAt)
  `);

  const insertCase = db.prepare(`
    INSERT INTO correspondence_cases (
      id, user_id, reference, category, title, summary, status, priority, channel, language,
      created_at, due_at, resolved_at
    ) VALUES (
      @id, @userId, @reference, @category, @title, @summary, @status, @priority, @channel, @language,
      @createdAt, @dueAt, @resolvedAt
    )
  `);

  const insertEvent = db.prepare(`
    INSERT INTO case_events (id, case_id, event_type, detail, occurred_at)
    VALUES (@id, @caseId, @eventType, @detail, @occurredAt)
  `);

  const tx = db.transaction((d: CustomerDetail) => {
    const { cpfAccount, vulnerabilityMarkers, cases, ...user } = d;
    insertUser.run(user);
    if (cpfAccount) {
      insertAccount.run(cpfAccount);
    }
    for (const marker of vulnerabilityMarkers) {
      insertMarker.run(marker);
    }
    for (const c of cases) {
      const { events, ...caseRow } = c;
      insertCase.run(caseRow);
      for (const event of events ?? []) {
        insertEvent.run(event);
      }
    }
  });

  tx(detail);
}

export function insertCase(c: CorrespondenceCase): CorrespondenceCase {
  const db = getDb();
  const { events, ...caseRow } = c;
  db.prepare(`
    INSERT INTO correspondence_cases (
      id, user_id, reference, category, title, summary, status, priority, channel, language,
      created_at, due_at, resolved_at
    ) VALUES (
      @id, @userId, @reference, @category, @title, @summary, @status, @priority, @channel, @language,
      @createdAt, @dueAt, @resolvedAt
    )
  `).run(caseRow);
  for (const event of events ?? []) {
    db.prepare(`
      INSERT INTO case_events (id, case_id, event_type, detail, occurred_at)
      VALUES (@id, @caseId, @eventType, @detail, @occurredAt)
    `).run(event);
  }
  return c;
}

export function addCaseEvent(caseId: string, eventType: string, detail: string): CaseEvent {
  const event: CaseEvent = {
    id: newId("evt"),
    caseId,
    eventType,
    detail,
    occurredAt: new Date().toISOString(),
  };
  getDb().prepare(`
    INSERT INTO case_events (id, case_id, event_type, detail, occurred_at)
    VALUES (@id, @caseId, @eventType, @detail, @occurredAt)
  `).run(event);
  return event;
}

export function updateCaseStatus(caseId: string, status: CorrespondenceCase["status"]): CorrespondenceCase | null {
  const db = getDb();
  const resolvedAt = status === "resolved" ? new Date().toISOString() : null;
  db.prepare(`UPDATE correspondence_cases SET status = ?, resolved_at = ? WHERE id = ?`).run(status, resolvedAt, caseId);
  const row = db.prepare(`SELECT * FROM correspondence_cases WHERE id = ?`).get(caseId);
  return row ? mapCase(row) : null;
}

export function clearAll(): void {
  const db = getDb();
  db.exec(`
    DELETE FROM case_events;
    DELETE FROM correspondence_cases;
    DELETE FROM vulnerability_markers;
    DELETE FROM cpf_accounts;
    DELETE FROM users;
  `);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface ListCustomersOptions {
  search?: string;
  ageBracket?: AgeBracket;
  tier?: string;
  limit?: number;
  offset?: number;
}

export function listCustomers(opts: ListCustomersOptions = {}): { items: Customer[]; total: number } {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts.search) {
    where.push("(full_name LIKE @search OR display_alias LIKE @search OR singpass_subject LIKE @search OR persona LIKE @search)");
    params.search = `%${opts.search}%`;
  }
  if (opts.ageBracket) {
    where.push("age_bracket = @ageBracket");
    params.ageBracket = opts.ageBracket;
  }
  if (opts.tier) {
    where.push("vulnerability_tier = @tier");
    params.tier = opts.tier;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM users ${whereSql}`).get(params) as { n: number }).n;

  const limit = Math.min(opts.limit ?? 50, 500);
  const offset = opts.offset ?? 0;
  const rows = db
    .prepare(`SELECT * FROM users ${whereSql} ORDER BY age DESC, full_name ASC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });

  return { items: rows.map(mapCustomer), total };
}

export function getCustomer(id: string): CustomerDetail | null {
  const db = getDb();
  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (!userRow) {
    return null;
  }

  const accountRow = db.prepare(`SELECT * FROM cpf_accounts WHERE user_id = ?`).get(id);
  const markerRows = db.prepare(`SELECT * FROM vulnerability_markers WHERE user_id = ? ORDER BY confidence DESC`).all(id);
  const caseRows = db.prepare(`SELECT * FROM correspondence_cases WHERE user_id = ? ORDER BY created_at DESC`).all(id);

  const cases: CorrespondenceCase[] = caseRows.map((row) => {
    const c = mapCase(row);
    const eventRows = db.prepare(`SELECT * FROM case_events WHERE case_id = ? ORDER BY occurred_at ASC`).all(c.id);
    c.events = eventRows.map(mapCaseEvent);
    return c;
  });

  return {
    ...mapCustomer(userRow),
    cpfAccount: accountRow ? mapAccount(accountRow) : null,
    vulnerabilityMarkers: markerRows.map(mapMarker),
    cases,
  };
}

export interface ListCasesOptions {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export function listCases(opts: ListCasesOptions = {}): { items: CaseWithMember[]; total: number } {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts.status) {
    where.push("c.status = @status");
    params.status = opts.status;
  }
  if (opts.category) {
    where.push("c.category = @category");
    params.category = opts.category;
  }
  if (opts.priority) {
    where.push("c.priority = @priority");
    params.priority = opts.priority;
  }
  if (opts.userId) {
    where.push("c.user_id = @userId");
    params.userId = opts.userId;
  }
  if (opts.search) {
    where.push("(c.title LIKE @search OR c.summary LIKE @search OR c.reference LIKE @search OR u.display_alias LIKE @search)");
    params.search = `%${opts.search}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db
    .prepare(`SELECT COUNT(*) AS n FROM correspondence_cases c JOIN users u ON u.id = c.user_id ${whereSql}`)
    .get(params) as { n: number }).n;

  const limit = Math.min(opts.limit ?? 50, 500);
  const offset = opts.offset ?? 0;
  const rows = db
    .prepare(`
      SELECT c.*, u.display_alias AS member_alias, u.age_bracket AS member_age_bracket
      FROM correspondence_cases c
      JOIN users u ON u.id = c.user_id
      ${whereSql}
      ORDER BY
        CASE c.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        c.created_at DESC
      LIMIT @limit OFFSET @offset
    `)
    .all({ ...params, limit, offset });

  const items: CaseWithMember[] = rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ...mapCase(row),
      memberAlias: r.member_alias as string,
      memberAgeBracket: r.member_age_bracket as AgeBracket,
    };
  });

  return { items, total };
}

export interface CaseDetail extends CaseWithMember {
  events: CaseEvent[];
  memberId: string;
}

export function getCase(id: string): CaseDetail | null {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT c.*, u.id AS member_id, u.display_alias AS member_alias, u.age_bracket AS member_age_bracket
      FROM correspondence_cases c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `)
    .get(id);
  if (!row) {
    return null;
  }

  const r = row as Record<string, unknown>;
  const eventRows = db.prepare(`SELECT * FROM case_events WHERE case_id = ? ORDER BY occurred_at ASC`).all(id);

  return {
    ...mapCase(row),
    memberId: r.member_id as string,
    memberAlias: r.member_alias as string,
    memberAgeBracket: r.member_age_bracket as AgeBracket,
    events: eventRows.map(mapCaseEvent),
  };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface CustomerStats {
  totalCustomers: number;
  byAgeBracket: Record<string, number>;
  byTier: Record<string, number>;
  totalCases: number;
  openCases: number;
  highPriorityCases: number;
  totalCpfManaged: number;
}

export function stats(): CustomerStats {
  const db = getDb();
  const totalCustomers = (db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number }).n;
  const totalCases = (db.prepare(`SELECT COUNT(*) AS n FROM correspondence_cases`).get() as { n: number }).n;
  const openCases = (db.prepare(`SELECT COUNT(*) AS n FROM correspondence_cases WHERE status IN ('open','in_progress')`).get() as { n: number }).n;
  const highPriorityCases = (db.prepare(`SELECT COUNT(*) AS n FROM correspondence_cases WHERE priority = 'high' AND status IN ('open','in_progress')`).get() as { n: number }).n;
  const totalCpfManaged = (db.prepare(`SELECT COALESCE(SUM(total), 0) AS s FROM cpf_accounts`).get() as { s: number }).s;

  const byAgeBracket: Record<string, number> = {};
  for (const r of db.prepare(`SELECT age_bracket AS k, COUNT(*) AS n FROM users GROUP BY age_bracket`).all() as Array<{ k: string; n: number }>) {
    byAgeBracket[r.k] = r.n;
  }
  const byTier: Record<string, number> = {};
  for (const r of db.prepare(`SELECT vulnerability_tier AS k, COUNT(*) AS n FROM users GROUP BY vulnerability_tier`).all() as Array<{ k: string; n: number }>) {
    byTier[r.k] = r.n;
  }

  return { totalCustomers, byAgeBracket, byTier, totalCases, openCases, highPriorityCases, totalCpfManaged };
}
