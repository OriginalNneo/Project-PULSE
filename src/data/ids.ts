import { randomUUID } from "node:crypto";

/** Short, prefixed, collision-resistant id (e.g. usr_8f3a1c9d2b04). */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
