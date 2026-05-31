import type Database from "better-sqlite3";

/**
 * SQLite schema for the customer / identity store.
 * Mirrors the PostgreSQL identity tables in the architecture doc
 * (users + vulnerability markers) and extends them with CPF account
 * data and correspondence cases for the demo.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  singpass_subject    TEXT UNIQUE NOT NULL,
  full_name           TEXT NOT NULL,
  display_alias       TEXT NOT NULL,
  date_of_birth       TEXT NOT NULL,
  age                 INTEGER NOT NULL,
  age_bracket         TEXT NOT NULL,
  gender              TEXT NOT NULL,
  residential_status  TEXT NOT NULL,
  preferred_language  TEXT NOT NULL,
  dialect             TEXT,
  employment_status   TEXT NOT NULL,
  digital_literacy    TEXT NOT NULL,
  vulnerability_tier  TEXT NOT NULL,
  persona             TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cpf_accounts (
  user_id                 TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  oa_balance              REAL NOT NULL DEFAULT 0,
  sa_balance              REAL NOT NULL DEFAULT 0,
  ma_balance              REAL NOT NULL DEFAULT 0,
  ra_balance              REAL NOT NULL DEFAULT 0,
  bhs_applicable          REAL NOT NULL DEFAULT 0,
  retirement_sum_target   TEXT,
  retirement_sum_amount   REAL,
  cpf_life_plan           TEXT,
  monthly_payout_estimate REAL,
  payout_eligibility_age  INTEGER NOT NULL DEFAULT 65,
  total                   REAL NOT NULL DEFAULT 0,
  updated_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vulnerability_markers (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marker_type TEXT NOT NULL,
  marker_value TEXT NOT NULL,
  source      TEXT NOT NULL,
  confidence  REAL NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS correspondence_cases (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference   TEXT NOT NULL,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL,
  status      TEXT NOT NULL,
  priority    TEXT NOT NULL,
  channel     TEXT NOT NULL,
  language    TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  due_at      TEXT,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS case_events (
  id          TEXT PRIMARY KEY,
  case_id     TEXT NOT NULL REFERENCES correspondence_cases(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  detail      TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_age_bracket ON users(age_bracket);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(vulnerability_tier);
CREATE INDEX IF NOT EXISTS idx_markers_user ON vulnerability_markers(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_user ON correspondence_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON correspondence_cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_category ON correspondence_cases(category);
CREATE INDEX IF NOT EXISTS idx_case_events_case ON case_events(case_id);
`;

export function migrateCustomerSchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}

export function dropCustomerSchema(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS case_events;
    DROP TABLE IF EXISTS correspondence_cases;
    DROP TABLE IF EXISTS vulnerability_markers;
    DROP TABLE IF EXISTS cpf_accounts;
    DROP TABLE IF EXISTS users;
  `);
}
