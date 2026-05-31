import { createServiceLogger } from "../../shared/logger.js";
import { createFileStore } from "./fileStore.js";
import { createMongoStore } from "./mongoStore.js";
import type { DocumentStore } from "./types.js";

export type { DocumentStore } from "./types.js";
export {
  COLLECTIONS,
  type CpfSection,
  type CpfKnowledgeDoc,
  type CpfTerm,
  type CpfKnowledgeFile,
} from "./types.js";

const log = createServiceLogger("docstore");

let storePromise: Promise<DocumentStore> | null = null;

/**
 * Returns the shared document store. Chooses the backend from env:
 *   DOC_STORE_BACKEND=mongo + MONGODB_URI  -> MongoDB (with file fallback on failure)
 *   otherwise                              -> embedded file store
 */
export function getDocumentStore(): Promise<DocumentStore> {
  if (!storePromise) {
    storePromise = createStore();
  }
  return storePromise;
}

async function createStore(): Promise<DocumentStore> {
  const backend = (process.env.DOC_STORE_BACKEND ?? "file").toLowerCase();
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "pulse";

  if (backend === "mongo" && uri) {
    try {
      const store = await createMongoStore(uri, dbName);
      log.info({ backend: "mongo", db: dbName }, "Document store connected");
      return store;
    } catch (error) {
      log.warn(
        { err: (error as Error).message },
        "MongoDB unreachable — falling back to embedded file document store",
      );
      return createFileStore();
    }
  }

  const store = createFileStore();
  log.info({ backend: "file" }, "Document store using embedded files");
  return store;
}

/** Resets the cached store (used by scripts that change backends). */
export async function resetDocumentStore(): Promise<void> {
  if (storePromise) {
    const store = await storePromise;
    await store.close();
    storePromise = null;
  }
}
