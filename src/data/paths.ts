import path from "node:path";

/**
 * Filesystem locations for the local data layer.
 * All paths resolve from the backend process working directory (repo root).
 */

export function dataDir(): string {
  return path.resolve(process.cwd(), "data");
}

export function sqlitePath(): string {
  const configured = process.env.SQLITE_PATH ?? "./data/pulse-customers.db";
  return path.resolve(process.cwd(), configured);
}

export function docStorePath(): string {
  const configured = process.env.DOC_STORE_PATH ?? "./data/docstore";
  return path.resolve(process.cwd(), configured);
}

export function knowledgeSeedPath(): string {
  return path.resolve(dataDir(), "cpf-knowledge.json");
}
