/**
 * Guiding-question retrieval.
 *
 * Curated guiding-question sets live in the `cpf_guiding_questions` collection,
 * keyed by `topicKey` (== CpfSection.sectionKey). When a broad (triage Cat-2)
 * query arrives, we classify its topic by reusing the existing RAG search
 * (`searchKnowledge` → top doc's sectionKey) and look up the matching set.
 *
 * The collection is tiny, so list-and-filter mirrors how `searchKnowledge`
 * already lists all knowledge docs.
 */
import { getDocumentStore } from "../docstore/index.js";
import { COLLECTIONS, type CpfGuidingQuestionSet } from "../docstore/types.js";
import { searchKnowledge } from "./repository.js";
import { getCpfKnowledge } from "../../db/proxy-client.js";

export async function listGuidingQuestionSets(): Promise<CpfGuidingQuestionSet[]> {
  return (await getDocumentStore()).list<CpfGuidingQuestionSet>(COLLECTIONS.guidingQuestions);
}

export async function getGuidingSetForTopic(sectionKey: string): Promise<CpfGuidingQuestionSet | null> {
  const sets = await listGuidingQuestionSets();
  return sets.find((s) => s.topicKey === sectionKey || s.aliases?.includes(sectionKey)) ?? null;
}

/**
 * Classify the query's topic via RAG (top knowledge match) and return the
 * matching guiding-question set together with the retrieved CPF text captured
 * ONCE here, so the later synthesis step doesn't re-retrieve.
 *
 * Returns null when there's no knowledge match, no guiding set for that topic,
 * or the set has no questions.
 */
export async function findGuidingSetForQuery(
  query: string,
): Promise<{ set: CpfGuidingQuestionSet; knowledge: string } | null> {
  const top = (await searchKnowledge(query, 1))[0];
  if (!top) return null;

  const set = await getGuidingSetForTopic(top.sectionKey);
  if (!set?.questions.length) return null;

  const entries = await getCpfKnowledge(query).catch(() => null);
  const knowledge = entries?.map((e) => `${e.question}\n${e.answer}`).join("\n\n") ?? "";

  return { set, knowledge };
}
