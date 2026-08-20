/**
 * Data access layer — replaces the db-proxy HTTP indirection.
 * CPF knowledge comes from MongoDB Atlas (same connection as main branch).
 * User prefs, queue, and caches are in-memory (survive the process lifetime;
 * sufficient for dev/demo — add SQLite persistence when needed).
 */
import { MongoClient } from "mongodb";
import { searchKnowledge, searchTerminology } from "../data/knowledge/repository.js";
import type { GuidingQuestion } from "../data/docstore/types.js";
import type { VulnerabilityTier } from "../shared/types/index.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("db");

// ── Types (kept identical to the old proxy-client contract) ──────────────────

/**
 * In-flight guiding-questions session. Set when a broad (Cat-2) query lands on a
 * topic with a curated guiding set; cleared when all questions are answered (or
 * the user escapes). Like `pendingOfficerOffer`, this lives in the in-memory
 * prefsStore and does NOT survive a backend restart — a restart mid-flow just
 * drops the user back to normal answering.
 */
export interface PendingGuiding {
  topicKey: string;
  title: string;
  questions: GuidingQuestion[];
  answers: Array<{ id: string; question: string; answer: string }>;
  index: number;
  originalQuery: string;
  knowledge: string;
  synthesisHint?: string;
  lang: string;
}

export interface UserPrefs {
  userId: string;
  display_name?: string; // the citizen's real name from the channel (e.g. Telegram first_name) — shown on the officer dashboard
  preferred_lang: string;
  voice_enabled: boolean;
  speech_rate: number;
  accessibility_mode: string;
  pendingOfficerOffer?: boolean;
  pendingVoiceUnclear?: boolean; // last voice note was unclear → used to summarise an escalation right after
  preferred_dialect?: string;
  pendingGuiding?: PendingGuiding;
  // ── Reading-support level (messaging channels) ──────────────────────────────
  // Drives the reply reading level + TTS speech rate. Default self_service (full detail).
  // Raised via explicit opt-in ("/support"/"simple") or an accepted auto-detected offer;
  // lowered only by the citizen ("full"/"normal"). See agents/accessibility/support.ts.
  support_tier?: VulnerabilityTier;
  pendingSupportOffer?: boolean;   // we offered simpler replies; a "yes"/"simple" applies it
  supportOfferDeclined?: boolean;  // citizen declined the offer → don't re-offer this session
  lastReplyMeta?: { words: number; ts: string }; // last bot reply size/time — reading-rate proxy
  slowReplyStreak?: number;        // consecutive turns with an implied reading rate below the floor
}

export interface SlangEntry {
  term: string;
  dialect: string;
  normalized_form: string;
  confidence: number;
  source: string[];
}

export interface TranslationCacheEntry {
  hash: string;
  translated_text: string;
  model: string;
  created_at: string;
  hit_count: number;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  device: string;
  created_at: string;
  expires_at: string;
}

export interface CpfLinkEntry {
  url: string;
  service_name: string;
  description: string;
  section: string;
  keywords: string[];
}

export interface CpfKnowledgeEntry {
  fact_id: string;
  section: string;
  question: string;
  answer: string;
  source_url: string;
  /** Raw relevance score from searchKnowledge, carried through for the scope guard. */
  score: number;
  /** Which of the question's tokens this document actually matched. */
  matched_terms: string[];
}

export interface QueueEntry {
  queueId: string;
  sessionId: string;
  userId: string;
  display_name?: string; // citizen's real channel name (e.g. Telegram first_name); falls back to a derived label in the UI
  emotion_score: number;
  emotion_label: string;
  summary: string;
  query_summary?: string; // clean AI summary of what the member needs (set once at escalation; not clobbered by emotion updates)
  chat_history: Array<{ role: string; content: string; ts: string; emotion_score?: number; emotion_label?: string; translated?: string; translated_lang?: string; original?: string; original_lang?: string }>;
  preferred_lang: string;
  dialect_hint: string | null;
  status: "waiting" | "assigned" | "resolved";
  assigned_officer: string | null;
  assigned_at: string | null;
  priority_score: number;
  created_at: string;
  rating?: number; // 1–5 CSAT score, set when the citizen rates after the case closes
}

export interface QueueStats {
  waiting: number;
  avg_wait_minutes: number;
}

export interface QueryCacheEntry {
  hash: string;
  response: string;
  intent: string;
  lang: string;
  created_at: string;
  expires_at: string;
  hit_count: number;
}

// ── In-memory stores ─────────────────────────────────────────────────────────

const prefsStore = new Map<string, UserPrefs>();
const queueStore = new Map<string, QueueEntry>();
const queryCacheStore = new Map<string, QueryCacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── CPF knowledge — direct MongoDB Atlas query ────────────────────────────────

export async function getCpfKnowledge(q: string): Promise<CpfKnowledgeEntry[] | null> {
  try {
    const results = await searchKnowledge(q, 5);
    if (results.length === 0) return null;
    return results.map((doc) => ({
      fact_id: doc.docId,
      section: doc.sectionKey,
      question: doc.title,
      answer: [doc.summary, ...doc.keyFacts].join("\n"),
      source_url: doc.sourceUrl,
      score: doc.score,
      matched_terms: doc.matchedTerms,
    }));
  } catch (err) {
    log.warn({ err }, "getCpfKnowledge failed");
    return null;
  }
}

export async function getCpfLinks(keyword: string): Promise<CpfLinkEntry[] | null> {
  try {
    const col = await getPulseCollection("cpf_hyperlinks");
    if (!col) return null;

    // Text index search first; fall back to regex if the collection has no data yet.
    let docs: CpfLinkEntry[] = [];
    try {
      const cursor = col.find<CpfLinkEntry>(
        { $text: { $search: keyword } },
        { projection: { _id: 0, url: 1, service_name: 1, description: 1, section: 1, keywords: 1 }, limit: 5 },
      );
      docs = await cursor.toArray();
    } catch {
      // $text requires an index — fall back to regex on service_name/description
    }

    if (docs.length === 0) {
      const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const cursor = col.find<CpfLinkEntry>(
        { $or: [{ service_name: re }, { description: re }, { keywords: re }] },
        { projection: { _id: 0, url: 1, service_name: 1, description: 1, section: 1, keywords: 1 }, limit: 5 },
      );
      docs = await cursor.toArray();
    }

    return docs.length > 0 ? docs : null;
  } catch (err) {
    log.warn({ err }, "getCpfLinks failed");
    return null;
  }
}

export async function getCpfPage(_url: string): Promise<{ url: string; content: string; last_scraped: string; lang: string } | null> {
  // No scraped page cache — return null so the caller falls back gracefully.
  return null;
}

// ── User prefs — in-memory ────────────────────────────────────────────────────

export async function getUserPrefs(userId: string): Promise<UserPrefs | null> {
  return prefsStore.get(userId) ?? null;
}

export async function upsertUserPrefs(prefs: Partial<UserPrefs> & { userId: string }): Promise<UserPrefs> {
  const existing = prefsStore.get(prefs.userId) ?? {
    userId: prefs.userId,
    preferred_lang: "en",
    voice_enabled: false,
    speech_rate: 1.0,
    accessibility_mode: "standard",
  };
  const updated: UserPrefs = { ...existing, ...prefs };
  prefsStore.set(prefs.userId, updated);
  return updated;
}

export const getSession = async (_sessionId: string): Promise<SessionRecord | null> => null;
export const createSession = async (s: Omit<SessionRecord, "sessionId">): Promise<SessionRecord> =>
  ({ ...s, sessionId: crypto.randomUUID() });

let _pulseClient: MongoClient | null = null;
async function getPulseCollection(collectionName: string) {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!_pulseClient) {
    _pulseClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10_000,
      connectTimeoutMS: 5000,
    });
    await _pulseClient.connect();
  }
  return _pulseClient.db("pulse").collection(collectionName);
}

async function getSlangCollection() {
  // Slang lives in pulse.slang_dictionary (same DB as everything else)
  return getPulseCollection("slang_dictionary");
}

export async function getSlang(term: string): Promise<SlangEntry | null> {
  try {
    const col = await getSlangCollection();
    if (!col) return null;
    const t = term.toLowerCase().trim();
    const doc = await col.findOne<SlangEntry>({ term: t }, { projection: { _id: 0 } });
    return doc ?? null;
  } catch {
    return null;
  }
}

/** term → normalized_form (fast path used by resolveSlang) */
export async function getAllSlang(): Promise<Map<string, string>> {
  try {
    const col = await getSlangCollection();
    if (!col) return new Map();
    const docs = await col.find<SlangEntry>({}, { projection: { _id: 0, term: 1, normalized_form: 1 } }).toArray();
    return new Map(docs.filter((d) => d.normalized_form).map((d) => [d.term, d.normalized_form]));
  } catch {
    return new Map();
  }
}

/** term → { normalized, dialect } — used for dialect auto-detection alongside resolution. */
export async function getAllSlangFull(): Promise<Map<string, { normalized: string; dialect: string }>> {
  try {
    const col = await getSlangCollection();
    if (!col) return new Map();
    const docs = await col
      .find<SlangEntry>({}, { projection: { _id: 0, term: 1, normalized_form: 1, dialect: 1 } })
      .toArray();
    return new Map(
      docs
        .filter((d) => d.normalized_form && d.dialect)
        .map((d) => [d.term, { normalized: d.normalized_form, dialect: d.dialect }]),
    );
  } catch {
    return new Map();
  }
}
export const getTranslationCache = async (_hash: string): Promise<TranslationCacheEntry | null> => null;
export const writeTranslationCache = async (e: Omit<TranslationCacheEntry, "hit_count">): Promise<TranslationCacheEntry> =>
  ({ ...e, hit_count: 1 });

// ── Queue — in-memory + MongoDB-backed ───────────────────────────────────────
// In-memory store is the fast-path read cache.
// All writes dual-persist to MongoDB so the queue survives backend restarts.

/**
 * Load active (waiting/assigned) queue entries from MongoDB into the in-memory
 * store. Call once at gateway startup so the queue is immediately available.
 */
export async function initQueue(): Promise<void> {
  try {
    const col = await getPulseCollection("ccu_queue");
    if (!col) return;
    const docs = await col
      .find<QueueEntry>({ status: { $in: ["waiting", "assigned"] } }, { projection: { _id: 0 } })
      .toArray();
    for (const doc of docs) queueStore.set(doc.queueId, doc);
    if (docs.length > 0) log.info({ count: docs.length }, "Queue restored from MongoDB");
  } catch (err) {
    log.warn({ err }, "Could not restore queue from MongoDB — starting fresh");
  }
}

export async function getQueue(): Promise<QueueEntry[] | null> {
  return [...queueStore.values()].filter(
    (e) => e.status === "waiting" || e.status === "assigned",
  );
}

export async function getQueueEntry(queueId: string): Promise<QueueEntry | null> {
  const cached = queueStore.get(queueId);
  if (cached) return cached;
  // Fall back to MongoDB for resolved entries no longer in memory
  try {
    const col = await getPulseCollection("ccu_queue");
    if (!col) return null;
    return await col.findOne<QueueEntry>({ queueId }, { projection: { _id: 0 } }) ?? null;
  } catch {
    return null;
  }
}

export async function postToQueue(
  entry: Omit<QueueEntry, "queueId" | "status" | "assigned_officer" | "assigned_at" | "priority_score" | "created_at">,
): Promise<QueueEntry> {
  const full: QueueEntry = {
    ...entry,
    queueId: crypto.randomUUID(),
    status: "waiting",
    assigned_officer: null,
    assigned_at: null,
    priority_score: entry.emotion_score,
    created_at: new Date().toISOString(),
  };
  queueStore.set(full.queueId, full);
  log.info({ queueId: full.queueId, userId: full.userId }, "Queue entry created");
  // Persist to MongoDB — fire-and-forget so we don't block the Telegram reply
  getPulseCollection("ccu_queue")
    .then((col) => col?.insertOne({ ...full }))
    .catch((err) => log.warn({ err }, "Failed to persist queue entry to MongoDB"));
  return full;
}

export async function assignQueueEntry(queueId: string, officerId: string): Promise<QueueEntry | null> {
  const entry = queueStore.get(queueId);
  if (!entry) return null;
  const updated = { ...entry, status: "assigned" as const, assigned_officer: officerId, assigned_at: new Date().toISOString() };
  queueStore.set(queueId, updated);
  getPulseCollection("ccu_queue")
    .then((col) => col?.updateOne({ queueId }, { $set: { status: updated.status, assigned_officer: officerId, assigned_at: updated.assigned_at } }))
    .catch((err) => log.warn({ err }, "Failed to update queue assignment in MongoDB"));
  return updated;
}

export async function resolveQueueEntry(queueId: string): Promise<QueueEntry | null> {
  const entry = queueStore.get(queueId);
  if (!entry) return null;
  const updated = { ...entry, status: "resolved" as const };
  queueStore.set(queueId, updated);
  getPulseCollection("ccu_queue")
    .then((col) => col?.updateOne({ queueId }, { $set: { status: "resolved" } }))
    .catch((err) => log.warn({ err }, "Failed to resolve queue entry in MongoDB"));
  return updated;
}

/**
 * Attach a CSAT rating (1–5) to a (usually resolved) queue entry so the officer
 * dashboard can show how the citizen rated the handled case. The entry stays in
 * queueStore after resolution (resolveQueueEntry keeps it), so the in-memory patch
 * works; the write also dual-persists to MongoDB.
 */
export async function setQueueRating(queueId: string, rating: number): Promise<QueueEntry | null> {
  const entry = queueStore.get(queueId);
  let updated: QueueEntry | null = null;
  if (entry) {
    updated = { ...entry, rating };
    queueStore.set(queueId, updated);
  }
  getPulseCollection("ccu_queue")
    .then((col) => col?.updateOne({ queueId }, { $set: { rating } }))
    .catch((err) => log.warn({ err }, "Failed to persist queue rating in MongoDB"));
  return updated;
}

/** Patch the AI-generated query_summary onto a queue entry (generated async after escalation). */
export async function setQueueQuerySummary(queueId: string, querySummary: string): Promise<QueueEntry | null> {
  const entry = queueStore.get(queueId);
  let updated: QueueEntry | null = null;
  if (entry) {
    updated = { ...entry, query_summary: querySummary };
    queueStore.set(queueId, updated);
  }
  getPulseCollection("ccu_queue")
    .then((col) => col?.updateOne({ queueId }, { $set: { query_summary: querySummary } }))
    .catch((err) => log.warn({ err }, "Failed to persist queue query_summary in MongoDB"));
  return updated;
}

// Keeps a live case's language in sync when the citizen's real language only becomes
// apparent mid-case (e.g. escalated with the widget's EN default, then messaged in
// Chinese) — officer-reply translation targets this field.
export async function updateQueueLang(queueId: string, preferredLang: string): Promise<QueueEntry | null> {
  const entry = queueStore.get(queueId);
  if (!entry) return null;
  const updated = { ...entry, preferred_lang: preferredLang };
  queueStore.set(queueId, updated);
  getPulseCollection("ccu_queue")
    .then((col) => col?.updateOne({ queueId }, { $set: { preferred_lang: preferredLang } }))
    .catch((err) => log.warn({ err }, "Failed to update queue preferred_lang in MongoDB"));
  return updated;
}

export async function updateQueuePriority(queueId: string, priorityScore: number): Promise<QueueEntry | null> {
  const entry = queueStore.get(queueId);
  if (!entry) return null;
  const updated = { ...entry, priority_score: priorityScore };
  queueStore.set(queueId, updated);
  getPulseCollection("ccu_queue")
    .then((col) => col?.updateOne({ queueId }, { $set: { priority_score: priorityScore } }))
    .catch((err) => log.warn({ err }, "Failed to update queue priority in MongoDB"));
  return updated;
}

export async function updateQueueEmotion(
  userId: string,
  emotion: { emotion_score: number; emotion_label: string },
  messagePreview: string,
): Promise<string | null> {
  const activeEntry = [...queueStore.values()].find(
    (e) => e.userId === userId && (e.status === "waiting" || e.status === "assigned"),
  );
  if (!activeEntry) return null;

  const summary = `"${messagePreview}" — emotion: ${emotion.emotion_label} (${emotion.emotion_score})`;
  const updated: QueueEntry = {
    ...activeEntry,
    emotion_score: emotion.emotion_score,
    emotion_label: emotion.emotion_label,
    summary,
    priority_score: emotion.emotion_score,
  };
  queueStore.set(activeEntry.queueId, updated);

  getPulseCollection("ccu_queue")
    .then((col) => col?.updateOne(
      { queueId: activeEntry.queueId },
      { $set: { emotion_score: updated.emotion_score, emotion_label: updated.emotion_label, summary, priority_score: updated.priority_score } },
    ))
    .catch((err) => log.warn({ err }, "Failed to patch queue emotion in MongoDB"));

  log.info({ queueId: activeEntry.queueId, userId, emotion_label: emotion.emotion_label, emotion_score: emotion.emotion_score }, "Queue entry emotion patched");
  return activeEntry.queueId;
}

export async function appendToQueueHistory(
  queueId: string,
  message: { role: string; content: string; ts: string; emotion_score?: number; emotion_label?: string; translated?: string; translated_lang?: string; original?: string; original_lang?: string },
): Promise<void> {
  const entry = queueStore.get(queueId);
  if (!entry) return;
  const updated: QueueEntry = {
    ...entry,
    chat_history: [...entry.chat_history, message],
  };
  queueStore.set(queueId, updated);
  getPulseCollection("ccu_queue")
    .then((col) => col?.updateOne({ queueId }, { $push: { chat_history: message } } as any))
    .catch((err) => log.warn({ err }, "Failed to append to queue history in MongoDB"));
}

export async function getQueueStats(): Promise<QueueStats> {
  const waiting = [...queueStore.values()].filter((e) => e.status === "waiting").length;
  return { waiting, avg_wait_minutes: 0 };
}

// ── Query response cache — in-memory ─────────────────────────────────────────

export async function getQueryCache(hash: string): Promise<QueryCacheEntry | null> {
  const entry = queryCacheStore.get(hash);
  if (!entry) return null;
  if (new Date(entry.expires_at).getTime() < Date.now()) {
    queryCacheStore.delete(hash);
    return null;
  }
  return entry;
}

export async function writeQueryCache(entry: { hash: string; response: string; intent: string; lang: string }): Promise<QueryCacheEntry> {
  const full: QueryCacheEntry = {
    ...entry,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    hit_count: 1,
  };
  queryCacheStore.set(entry.hash, full);
  return full;
}

// ── Conversation logs — no-op stubs ──────────────────────────────────────────

export const saveConversationLog = async (l: {
  sessionId: string; agent: string;
  messages: Array<{ role: string; content: string; ts: string }>;
  emotion_log: Array<{ ts: string; score: number; label: string }>;
}): Promise<typeof l & { created_at: string }> => ({ ...l, created_at: new Date().toISOString() });

export const getConversationLog = async (_sessionId: string): Promise<Array<{ messages: Array<{ role: string; content: string }> }>> => [];
export const getSessionsByUser = async (_userId: string): Promise<SessionRecord[]> => [];
