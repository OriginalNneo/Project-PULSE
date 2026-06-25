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
  close(): Promise<void>;
}

export const COLLECTIONS = {
  knowledge: "cpf_knowledge",
  sections: "cpf_sections",
  terminology: "cpf_terminology",
  guidingQuestions: "cpf_guiding_questions",
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

/**
 * A single guiding question the bot asks to personalise its answer.
 * `open` → free-text reply; `choice` → present `options` as inline buttons.
 */
export interface GuidingQuestion {
  id: string;
  text: string;
  type?: "open" | "choice";
  /** Expected answers shown as buttons (choice questions). */
  options?: string[];
  /** Quick-pick buttons for open questions (user can also type a free answer). */
  quickReplies?: string[];
  /** Inline example of the expected answer, shown for open questions (e.g. "63"). */
  example?: string;
  hint?: string;
}

/**
 * Curated set of guiding questions for one CPF topic, keyed by `topicKey`
 * which MUST equal a CpfSection.sectionKey (the stable controlled vocabulary).
 * Retrieved when a broad (triage Category 2) query lands on this topic.
 */
export interface CpfGuidingQuestionSet {
  /** Primary key — matches a CpfSection.sectionKey. */
  topicKey: string;
  /**
   * Alternate sectionKeys this set also matches. The knowledge store's section
   * vocabulary has drifted across environments (e.g. `retirement-income` vs
   * `retirement`), so aliases let one set match whichever dataset is loaded.
   */
  aliases?: string[];
  title: string;
  intro?: string;
  questions: GuidingQuestion[];
  synthesisHint?: string;
}

export interface CpfGuidingQuestionsFile {
  version: string;
  topics: CpfGuidingQuestionSet[];
}
