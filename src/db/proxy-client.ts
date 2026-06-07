import { ExternalServiceError } from "../shared/errors.js";

const BASE = process.env.DB_PROXY_URL ?? "http://db-proxy:4000";
const INTERNAL_HEADERS = {
  "Content-Type": "application/json",
  "x-internal-key": process.env.DB_PROXY_SECRET ?? "",
};

async function proxyGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { headers: INTERNAL_HEADERS });
  if (res.status === 404) return null;
  if (!res.ok) throw new ExternalServiceError("db-proxy", `GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function proxyPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: INTERNAL_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ExternalServiceError("db-proxy", `POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function proxyPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: INTERNAL_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ExternalServiceError("db-proxy", `PATCH ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface UserPrefs {
  userId: string;
  preferred_lang: string;
  voice_enabled: boolean;
  speech_rate: number;
  accessibility_mode: string;
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

export const getUserPrefs = (userId: string) =>
  proxyGet<UserPrefs>(`/user/prefs/${encodeURIComponent(userId)}`);

export const getSession = (sessionId: string) =>
  proxyGet<SessionRecord>(`/user/session/${encodeURIComponent(sessionId)}`);

export const upsertUserPrefs = (prefs: Partial<UserPrefs> & { userId: string }) =>
  proxyPost<UserPrefs>("/user/prefs", prefs);

export const createSession = (session: Omit<SessionRecord, "sessionId">) =>
  proxyPost<SessionRecord>("/user/session", session);

export const getSlang = (term: string) =>
  proxyGet<SlangEntry>(`/tools/slang/${encodeURIComponent(term)}`);

export const getTranslationCache = (hash: string) =>
  proxyGet<TranslationCacheEntry>(`/tools/cache/${encodeURIComponent(hash)}`);

export const writeTranslationCache = (entry: Omit<TranslationCacheEntry, "hit_count">) =>
  proxyPost<TranslationCacheEntry>("/tools/cache", entry);

export const getCpfPage = (url: string) =>
  proxyGet<{ url: string; content: string; last_scraped: string; lang: string }>(
    `/tools/cpf-page?url=${encodeURIComponent(url)}`,
  );

export interface CpfLinkEntry {
  keyword: string;
  service_name: string;
  url: string;
  description: string;
  section: string;
}

export interface CpfKnowledgeEntry {
  fact_id: string;
  section: string;
  question: string;
  answer: string;
  source_url: string;
}

export const getCpfLinks = (keyword: string) =>
  proxyGet<CpfLinkEntry[]>(`/tools/cpf-links?keyword=${encodeURIComponent(keyword)}`);

export const getCpfKnowledge = (q: string) =>
  proxyGet<CpfKnowledgeEntry[]>(`/tools/cpf-knowledge?q=${encodeURIComponent(q)}`);

export interface QueueEntry {
  queueId: string;
  sessionId: string;
  userId: string;
  emotion_score: number;
  emotion_label: string;
  summary: string;
  chat_history: Array<{ role: string; content: string; ts: string }>;
  preferred_lang: string;
  dialect_hint: string | null;
  status: "waiting" | "assigned" | "resolved";
  assigned_officer: string | null;
  assigned_at: string | null;
  priority_score: number;
  created_at: string;
}

export interface QueueStats {
  waiting: number;
  avg_wait_minutes: number;
}

export const postToQueue = (entry: Omit<QueueEntry, "queueId" | "status" | "assigned_officer" | "assigned_at" | "priority_score" | "created_at">) =>
  proxyPost<QueueEntry>("/tools/queue", entry);

export const getQueue = () =>
  proxyGet<QueueEntry[]>("/tools/queue");

export const getQueueEntry = (queueId: string) =>
  proxyGet<QueueEntry>(`/tools/queue/${encodeURIComponent(queueId)}`);

export const getQueueStats = () =>
  proxyGet<QueueStats>("/tools/queue/stats");

export const assignQueueEntry = (queueId: string, officerId: string) =>
  proxyPatch<QueueEntry>(`/tools/queue/${encodeURIComponent(queueId)}/assign`, { officerId });

export const resolveQueueEntry = (queueId: string) =>
  proxyPatch<QueueEntry>(`/tools/queue/${encodeURIComponent(queueId)}/resolve`, {});

export const saveConversationLog = (log: {
  sessionId: string;
  agent: string;
  messages: Array<{ role: string; content: string; ts: string }>;
  emotion_log: Array<{ ts: string; score: number; label: string }>;
}) => proxyPost<typeof log & { created_at: string }>("/user/conversation-log", log);

export const getConversationLog = (sessionId: string) =>
  proxyGet<Array<{ sessionId: string; agent: string; messages: unknown[]; emotion_log: unknown[] }>>(
    `/user/conversation-log/${encodeURIComponent(sessionId)}`,
  );

export const updateQueuePriority = (queueId: string, priorityScore: number) =>
  proxyPatch<QueueEntry>(`/tools/queue/${encodeURIComponent(queueId)}/priority`, { priority_score: priorityScore });

// ── Query response cache ──────────────────────────────────────────────────────
export interface QueryCacheEntry {
  hash: string;
  response: string;
  intent: string;
  lang: string;
  created_at: string;
  expires_at: string;
  hit_count: number;
}

export const getQueryCache = (hash: string) =>
  proxyGet<QueryCacheEntry>(`/tools/query-cache/${encodeURIComponent(hash)}`);

export const writeQueryCache = (entry: { hash: string; response: string; intent: string; lang: string }) =>
  proxyPost<QueryCacheEntry>("/tools/query-cache", entry);

// ── Session lookup by user (for conversation summariser) ─────────────────────
export const getSessionsByUser = (userId: string) =>
  proxyGet<SessionRecord[]>(`/user/sessions-by-user/${encodeURIComponent(userId)}`);

