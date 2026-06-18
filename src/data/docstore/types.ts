/**
 * Document store abstraction (MongoDB / Cosmos DB data model).
 *
 * Two interchangeable backends implement this interface:
 *   - mongoStore: real MongoDB (Atlas / self-hosted on the VPS)
 *   - fileStore:  embedded JSON files, so the stack runs with no DB server
 *
 * Per the architecture doc, identity data lives in SQL and document-shaped
 * data (CPF knowledge + behavioural telemetry) lives here. Both backends are
 * "replaceable enterprise equivalents" of the same contract.
 */
export interface DocumentStore {
  readonly backend: "mongo" | "file";
  list<T>(collection: string): Promise<T[]>;
  replaceAll<T>(collection: string, docs: T[]): Promise<number>;
  insert<T>(collection: string, doc: T): Promise<void>;
  count(collection: string): Promise<number>;
  /** Find a single document by an exact-match filter (e.g. { sessionId }). */
  findOne<T>(collection: string, filter: Record<string, unknown>): Promise<T | null>;
  /**
   * Upsert: replace the document matching `filter` with `doc`, or insert it if
   * none matches. Returns the stored document. Used for mutable session state.
   */
  upsert<T>(collection: string, filter: Record<string, unknown>, doc: T): Promise<T>;
  close(): Promise<void>;
}

export const COLLECTIONS = {
  knowledge: "cpf_knowledge",
  sections: "cpf_sections",
  terminology: "cpf_terminology",
  /** Integrated-chatbot conversations + their AI context window. */
  chatSessions: "chat_sessions",
  /** Escalations surfaced to the Customer Correspondence Unit officers. */
  escalations: "cso_escalations",
} as const;

export interface CpfSection {
  sectionKey: string;
  title: string;
  url: string;
  summary: string;
}

export interface CpfKnowledgeDoc {
  docId: string;
  sectionKey: string;
  topic: string;
  title: string;
  summary: string;
  keyFacts: string[];
  audienceTags: string[];
  sourceUrl: string;
  confidence: string;
}

export interface CpfTerm {
  term: string;
  plainEnglish: string;
  zh: string;
  ms: string;
  ta: string;
}

export interface CpfKnowledgeFile {
  version: string;
  source: string;
  fetchedAt: string;
  note?: string;
  sections: CpfSection[];
  documents: CpfKnowledgeDoc[];
  terminology: CpfTerm[];
}
