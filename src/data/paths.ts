import path from "node:path";

export function dataDir(): string {
  return path.resolve(process.cwd(), "data");
}

export function docStorePath(): string {
  const configured = process.env.DOC_STORE_PATH ?? "./data/docstore";
  return path.resolve(process.cwd(), configured);
}

export function knowledgeSeedPath(): string {
  return path.resolve(dataDir(), "cpf-knowledge.json");
}

export function sqlitePath(): string {
  const configured = process.env.SQLITE_PATH ?? "./data/pulse.db";
  return path.resolve(process.cwd(), configured);
}
