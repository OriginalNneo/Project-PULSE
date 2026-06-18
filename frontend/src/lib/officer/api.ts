import type { Conversation, OfficerDashboard } from "./types";

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

export const officerApi = {
  getDashboard: () => request<OfficerDashboard>("/officer/dashboard"),

  getConversation: (sessionId: string) =>
    request<Conversation>(`/officer/conversation/${sessionId}`),

  reply: (sessionId: string, officer: string, message: string) =>
    request<{ ok: boolean; delivered: boolean }>(`/officer/conversation/${sessionId}/reply`, {
      method: "POST",
      body: JSON.stringify({ officer, message }),
    }),

  acknowledge: (escalationId: string, officer: string) =>
    request(`/officer/escalations/${escalationId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ officer }),
    }),

  closeSession: (sessionId: string, officer: string) =>
    request<{ closed: boolean }>(`/officer/conversation/${sessionId}/close`, {
      method: "POST",
      body: JSON.stringify({ officer }),
    }),
};
