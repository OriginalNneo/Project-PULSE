import type {
  CaseWithMember,
  CopilotResult,
  CorrespondenceCase,
  Customer,
  CustomerDetail,
  KnowledgeDoc,
  KnowledgeSection,
  NewCustomerInput,
  Stats,
} from "./types";

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

export const consoleApi = {
  getStats: () => request<Stats>("/console/stats"),

  listCustomers: (params: { search?: string; ageBracket?: string; tier?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.ageBracket) q.set("ageBracket", params.ageBracket);
    if (params.tier) q.set("tier", params.tier);
    q.set("limit", String(params.limit ?? 60));
    return request<{ items: Customer[]; total: number }>(`/console/customers?${q.toString()}`);
  },

  getCustomer: (id: string) => request<CustomerDetail>(`/console/customers/${id}`),

  createCustomer: (input: NewCustomerInput) =>
    request<CustomerDetail>("/console/customers", { method: "POST", body: JSON.stringify(input) }),

  listCases: (params: { status?: string; category?: string; priority?: string; search?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return request<{ items: CaseWithMember[]; total: number }>(`/console/cases?${q.toString()}`);
  },

  getCase: (id: string) => request<CorrespondenceCase & { memberAlias: string; memberId: string; events: never[] }>(`/console/cases/${id}`),

  getKnowledge: () =>
    request<{ sections: KnowledgeSection[]; documents: KnowledgeDoc[]; terminology: Array<{ term: string; plainEnglish: string }> }>(
      "/console/knowledge",
    ),

  searchKnowledge: (q: string) =>
    request<{ query: string; matches: Array<KnowledgeDoc & { score: number; matchedTerms: string[] }> }>(
      `/console/knowledge/search?q=${encodeURIComponent(q)}`,
    ),

  copilotChat: (body: { question: string; userId?: string; history?: Array<{ role: "user" | "assistant"; content: string }> }) =>
    request<CopilotResult>("/copilot/chat", { method: "POST", body: JSON.stringify(body) }),
};
