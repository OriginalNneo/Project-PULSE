import { getDocumentStore } from "../../data/docstore/index.js";
import { COLLECTIONS } from "../../data/docstore/types.js";
import type { ChatSession } from "./types.js";

/**
 * Persistence for chatbot sessions + their context window. Lives in the
 * document store (MongoDB when DOC_STORE_BACKEND=mongo, file fallback
 * otherwise) — the same store the CPF knowledge is in, so a session and the
 * knowledge it was answered from share one database.
 */

export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const store = await getDocumentStore();
  return store.findOne<ChatSession>(COLLECTIONS.chatSessions, { sessionId });
}

export async function saveSession(session: ChatSession): Promise<ChatSession> {
  const store = await getDocumentStore();
  return store.upsert<ChatSession>(COLLECTIONS.chatSessions, { sessionId: session.sessionId }, session);
}

export async function listSessions(): Promise<ChatSession[]> {
  const store = await getDocumentStore();
  return store.list<ChatSession>(COLLECTIONS.chatSessions);
}

/** Find an open session for a channel identity (e.g. a Telegram chat). */
export async function findSessionByChannelUser(
  channel: string,
  channelUserId: string,
): Promise<ChatSession | null> {
  const sessions = await listSessions();
  return (
    sessions
      .filter((s) => s.channel === channel && s.channelUserId === channelUserId && s.status !== "closed")
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null
  );
}
