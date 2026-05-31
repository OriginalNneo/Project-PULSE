import { MongoClient, type Db } from "mongodb";
import type { DocumentStore } from "./types.js";

/**
 * MongoDB-backed document store (Atlas / self-hosted on the VPS).
 * Mongo's own `_id` is projected away so documents round-trip cleanly to the
 * same shape the file store returns.
 */
export async function createMongoStore(uri: string, dbName: string): Promise<DocumentStore> {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });
  await client.connect();
  await client.db(dbName).command({ ping: 1 });
  const db: Db = client.db(dbName);

  return {
    backend: "mongo",
    async list<T>(collection: string): Promise<T[]> {
      return (await db.collection(collection).find({}, { projection: { _id: 0 } }).toArray()) as T[];
    },
    async replaceAll<T>(collection: string, docs: T[]): Promise<number> {
      const col = db.collection(collection);
      await col.deleteMany({});
      if (docs.length > 0) {
        await col.insertMany(docs as Record<string, unknown>[]);
      }
      return docs.length;
    },
    async insert<T>(collection: string, doc: T): Promise<void> {
      await db.collection(collection).insertOne(doc as Record<string, unknown>);
    },
    async count(collection: string): Promise<number> {
      return db.collection(collection).countDocuments();
    },
    async close(): Promise<void> {
      await client.close();
    },
  };
}
