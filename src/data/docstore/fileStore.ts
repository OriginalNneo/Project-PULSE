import fs from "node:fs";
import path from "node:path";
import { docStorePath } from "../paths.js";
import type { DocumentStore } from "./types.js";

/**
 * Embedded JSON document store. Each collection is one file:
 *   data/docstore/<collection>.json -> array of documents.
 * Adequate for the knowledge base (tens of docs) and as a zero-server fallback.
 */
export function createFileStore(): DocumentStore {
  const root = docStorePath();
  fs.mkdirSync(root, { recursive: true });

  function file(collection: string): string {
    return path.join(root, `${collection}.json`);
  }

  function read<T>(collection: string): T[] {
    const f = file(collection);
    if (!fs.existsSync(f)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(f, "utf8")) as T[];
    } catch {
      return [];
    }
  }

  function write<T>(collection: string, docs: T[]): void {
    fs.writeFileSync(file(collection), JSON.stringify(docs, null, 2), "utf8");
  }

  function matches(doc: unknown, filter: Record<string, unknown>): boolean {
    if (typeof doc !== "object" || doc === null) return false;
    const record = doc as Record<string, unknown>;
    return Object.entries(filter).every(([key, value]) => record[key] === value);
  }

  return {
    backend: "file",
    async list<T>(collection: string): Promise<T[]> {
      return read<T>(collection);
    },
    async replaceAll<T>(collection: string, docs: T[]): Promise<number> {
      write(collection, docs);
      return docs.length;
    },
    async insert<T>(collection: string, doc: T): Promise<void> {
      const docs = read<T>(collection);
      docs.push(doc);
      write(collection, docs);
    },
    async count(collection: string): Promise<number> {
      return read(collection).length;
    },
    async findOne<T>(collection: string, filter: Record<string, unknown>): Promise<T | null> {
      const docs = read<T>(collection);
      return docs.find((doc) => matches(doc, filter)) ?? null;
    },
    async upsert<T>(collection: string, filter: Record<string, unknown>, doc: T): Promise<T> {
      const docs = read<T>(collection);
      const index = docs.findIndex((existing) => matches(existing, filter));
      if (index >= 0) {
        docs[index] = doc;
      } else {
        docs.push(doc);
      }
      write(collection, docs);
      return doc;
    },
    async close(): Promise<void> {
      /* nothing to close */
    },
  };
}
