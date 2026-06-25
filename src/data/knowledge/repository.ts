import fs from "node:fs";
import { knowledgeSeedPath, guidingQuestionsSeedPath } from "../paths.js";
import { getDocumentStore } from "../docstore/index.js";
import {
  COLLECTIONS,
  type CpfKnowledgeDoc,
  type CpfKnowledgeFile,
  type CpfSection,
  type CpfTerm,
  type CpfGuidingQuestionSet,
  type CpfGuidingQuestionsFile,
} from "../docstore/types.js";

export type { CpfKnowledgeDoc, CpfSection, CpfTerm } from "../docstore/types.js";

export interface KnowledgeMatch extends CpfKnowledgeDoc {
  score: number;
  matchedTerms: string[];
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

export function loadKnowledgeFile(): CpfKnowledgeFile {
  const raw = fs.readFileSync(knowledgeSeedPath(), "utf8");
  return JSON.parse(raw) as CpfKnowledgeFile;
}

export async function seedKnowledge(file: CpfKnowledgeFile): Promise<{ sections: number; documents: number; terminology: number; backend: string }> {
  const store = await getDocumentStore();
  const sections = await store.replaceAll(COLLECTIONS.sections, file.sections);
  const documents = await store.replaceAll(COLLECTIONS.knowledge, file.documents);
  const terminology = await store.replaceAll(COLLECTIONS.terminology, file.terminology);
  return { sections, documents, terminology, backend: store.backend };
}

/**
 * Load the curated guiding-question sets. Tolerant of a missing file so
 * seeding never breaks when the feature's data hasn't been authored yet.
 */
export function loadGuidingQuestionsFile(): CpfGuidingQuestionsFile {
  try {
    const raw = fs.readFileSync(guidingQuestionsSeedPath(), "utf8");
    return JSON.parse(raw) as CpfGuidingQuestionsFile;
  } catch {
    return { version: "0", topics: [] };
  }
}

export async function seedGuidingQuestions(file: CpfGuidingQuestionsFile): Promise<{ topics: number; backend: string }> {
  const store = await getDocumentStore();
  const topics = await store.replaceAll(COLLECTIONS.guidingQuestions, file.topics);
  return { topics, backend: store.backend };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listSections(): Promise<CpfSection[]> {
  return (await getDocumentStore()).list<CpfSection>(COLLECTIONS.sections);
}

export async function listDocuments(): Promise<CpfKnowledgeDoc[]> {
  return (await getDocumentStore()).list<CpfKnowledgeDoc>(COLLECTIONS.knowledge);
}

export async function listTerminology(): Promise<CpfTerm[]> {
  return (await getDocumentStore()).list<CpfTerm>(COLLECTIONS.terminology);
}

export async function knowledgeStats(): Promise<{ sections: number; documents: number; terminology: number; backend: string }> {
  const store = await getDocumentStore();
  return {
    sections: await store.count(COLLECTIONS.sections),
    documents: await store.count(COLLECTIONS.knowledge),
    terminology: await store.count(COLLECTIONS.terminology),
    backend: store.backend,
  };
}

// ---------------------------------------------------------------------------
// Search — the "navigation" surface the AI retrieves over
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "do", "i",
  "my", "me", "can", "how", "what", "when", "much", "you", "your", "with", "at", "if",
  "it", "be", "will", "about", "have", "has", "get", "this", "that", "from", "as", "by",
]);

/** Common CPF abbreviations / phrasings expanded so colloquial queries still hit. */
const ALIASES: Record<string, string[]> = {
  oa: ["ordinary", "account"],
  sa: ["special", "account"],
  ma: ["medisave", "account"],
  ra: ["retirement", "account"],
  cpflife: ["cpf", "life", "payout"],
  frs: ["full", "retirement", "sum"],
  brs: ["basic", "retirement", "sum"],
  ers: ["enhanced", "retirement", "sum"],
  bhs: ["basic", "healthcare", "sum"],
  hps: ["home", "protection", "scheme"],
  medisave: ["medisave", "healthcare"],
  medishield: ["medishield", "insurance"],
  careshield: ["careshield", "disability", "care"],
  interest: ["interest", "rate"],
  payout: ["payout", "monthly", "retirement"],
  withdraw: ["withdraw", "withdrawal"],
  house: ["housing", "home", "property"],
  flat: ["housing", "home", "hdb"],
  hdb: ["housing", "home"],
  scam: ["scam", "fraud", "safeguard"],
  nominate: ["nomination"],
  topup: ["top-up", "topping"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function expand(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const token of tokens) {
    out.add(token);
    const alias = ALIASES[token.replace(/[^a-z0-9]/g, "")];
    if (alias) {
      alias.forEach((a) => out.add(a));
    }
  }
  return [...out];
}

function docHaystack(doc: CpfKnowledgeDoc): { title: string; topic: string; body: string; tags: string } {
  return {
    title: doc.title.toLowerCase(),
    topic: doc.topic.toLowerCase(),
    body: `${doc.summary} ${doc.keyFacts.join(" ")}`.toLowerCase(),
    tags: `${doc.sectionKey} ${doc.audienceTags.join(" ")}`.toLowerCase(),
  };
}

export async function searchKnowledge(query: string, limit = 5): Promise<KnowledgeMatch[]> {
  const docs = await listDocuments();
  const tokens = expand(tokenize(query));
  if (tokens.length === 0) {
    return [];
  }

  const scored: KnowledgeMatch[] = docs.map((doc) => {
    const hay = docHaystack(doc);
    let score = 0;
    const matched = new Set<string>();
    for (const token of tokens) {
      if (hay.title.includes(token)) {
        score += 4;
        matched.add(token);
      }
      if (hay.topic.includes(token)) {
        score += 3;
        matched.add(token);
      }
      if (hay.body.includes(token)) {
        score += 2;
        matched.add(token);
      }
      if (hay.tags.includes(token)) {
        score += 1;
        matched.add(token);
      }
    }
    return { ...doc, score, matchedTerms: [...matched] };
  });

  return scored
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function searchTerminology(query: string, limit = 4): Promise<CpfTerm[]> {
  const terms = await listTerminology();
  const tokens = expand(tokenize(query));
  if (tokens.length === 0) {
    return [];
  }
  const scored = terms.map((term) => {
    const hay = `${term.term} ${term.plainEnglish}`.toLowerCase();
    const score = tokens.reduce((acc, token) => acc + (hay.includes(token) ? 1 : 0), 0);
    return { term, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.term);
}
