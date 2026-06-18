import { store, nextId } from "./store.js";
import type { AdaptiveUserProfile, MemberSession, PageKey } from "./types.js";

const SESSION_TTL_MS = 30 * 60 * 1000;

export function createMemberSession(user: AdaptiveUserProfile): MemberSession {
  const now = Date.now();
  const session: MemberSession = {
    id: nextId("sess"),
    userId: user.id,
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    currentPageKey: "home",
    active: true,
  };

  store.sessions.set(session.id, session);
  return session;
}

export function getActiveSession(sessionId: string): MemberSession | undefined {
  const session = store.sessions.get(sessionId);
  if (!session || !session.active) {
    return undefined;
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    session.active = false;
    return undefined;
  }

  return session;
}

export function updateSessionPage(sessionId: string, pageKey: PageKey): MemberSession | undefined {
  const session = getActiveSession(sessionId);
  if (!session) {
    return undefined;
  }

  session.currentPageKey = pageKey;
  return session;
}

export function endSession(sessionId: string): boolean {
  const session = store.sessions.get(sessionId);
  if (!session) {
    return false;
  }

  session.active = false;
  return true;
}
