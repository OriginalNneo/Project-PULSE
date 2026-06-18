import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { sqlitePath } from "../paths.js";

let db: Database.Database | null = null;

/**
 * Returns the singleton SQLite connection (the customer / identity store —
 * the local stand-in for "Azure SQL Database" in the architecture doc).
 */
export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const file = sqlitePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
