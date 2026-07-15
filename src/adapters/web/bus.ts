import { createServiceLogger } from "../../shared/logger.js";

const log = createServiceLogger("web-bus");

// In-memory per-session outbound message bus for the "web" (Text Us) channel.
// The browser holds no socket to the backend; instead the Text Us page short-polls
// GET /webchat/:sessionId/poll and this bus is drained into that response. Both the
// officer-reply path (POST /dashboard/send/:queueId) and the bot/escalation path
// (makeWebChannel().send) push here.
//
// Single-instance only (mirrors the officer registry Map in src/dashboard/officer.ts):
// the Officer Dashboard and /webchat must run in the same gateway process. Swap for a
// Redis pub/sub keyed by sessionId for multi-instance deployments.

export type WebMessageFrom = "officer" | "system" | "bot";

export interface WebMessage {
  seq: number;
  from: WebMessageFrom;
  text: string;
  ts: string;
}

interface WebSession {
  seq: number;
  messages: WebMessage[];
  lastActivity: number;
}

const sessions = new Map<string, WebSession>();

// Drop messages older than a bounded window so a long-lived process doesn't grow
// unboundedly; the browser has already polled them well before this.
const MAX_MESSAGES_PER_SESSION = 200;
// Reap idle sessions (no push and no poll) after this long.
const SESSION_TTL_MS = 60 * 60 * 1000; // 1h

function getOrCreate(sessionId: string): WebSession {
  let s = sessions.get(sessionId);
  if (!s) {
    s = { seq: 0, messages: [], lastActivity: Date.now() };
    sessions.set(sessionId, s);
  }
  return s;
}

/** Append an outbound message for a web session; returns the assigned sequence number. */
export function pushToWeb(sessionId: string, msg: { from: WebMessageFrom; text: string }): number {
  const s = getOrCreate(sessionId);
  s.seq += 1;
  const entry: WebMessage = { seq: s.seq, from: msg.from, text: msg.text, ts: new Date().toISOString() };
  s.messages.push(entry);
  if (s.messages.length > MAX_MESSAGES_PER_SESSION) {
    s.messages.splice(0, s.messages.length - MAX_MESSAGES_PER_SESSION);
  }
  s.lastActivity = Date.now();
  log.info({ sessionId, seq: entry.seq, from: entry.from }, "web message pushed");
  return entry.seq;
}

/** Return messages with seq > since, plus the new cursor to poll from next time. */
export function drainWeb(sessionId: string, since: number): { messages: WebMessage[]; cursor: number } {
  const s = sessions.get(sessionId);
  if (!s) return { messages: [], cursor: since };
  s.lastActivity = Date.now();
  const messages = s.messages.filter((m) => m.seq > since);
  return { messages, cursor: s.seq };
}

// Periodic reaper for idle sessions.
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > SESSION_TTL_MS) sessions.delete(id);
  }
}, 10 * 60 * 1000).unref?.();
