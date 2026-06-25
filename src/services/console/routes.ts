import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { ApiResponse } from "../../shared/types/index.js";
import { newId } from "../../data/ids.js";
import {
  addCaseEvent,
  getCase,
  getCustomer,
  insertCase,
  insertCustomerBundle,
  listCases,
  listCustomers,
  stats,
  updateCaseStatus,
} from "../../data/customers/repository.js";
import { buildCustomerFromInput } from "../../data/customers/factory.js";
import type { CorrespondenceCase } from "../../data/customers/types.js";
import { knowledgeStats, listDocuments, listSections, listTerminology, searchKnowledge } from "../../data/knowledge/repository.js";
import { isLlmConfigured, llmModel } from "../ai/llmClient.js";
import { LanguageSchema } from "../../shared/types/schemas.js";

const router = Router();

function ok<T>(res: Response<ApiResponse<T>>, data: T, status = 200): void {
  res.status(status).json({ data });
}
function fail(res: Response<ApiResponse>, code: string, message: string, status = 400): void {
  res.status(status).json({ error: { code, message } });
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "console", llmConfigured: isLlmConfigured(), model: llmModel() });
});

router.get("/stats", async (_req: Request, res: Response<ApiResponse>) => {
  const customerStats = stats();
  const knowledge = await knowledgeStats();
  ok(res, {
    customers: customerStats,
    knowledge,
    ai: { configured: isLlmConfigured(), model: llmModel() },
  });
});

// ---------------------------------------------------------------------------
// Customers (browse + key in new info)
// ---------------------------------------------------------------------------

router.get("/customers", (req: Request, res: Response<ApiResponse>) => {
  const { items, total } = listCustomers({
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    ageBracket: typeof req.query.ageBracket === "string" ? (req.query.ageBracket as never) : undefined,
    tier: typeof req.query.tier === "string" ? req.query.tier : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
  });
  ok(res, { items, total });
});

router.get("/customers/:id", (req: Request, res: Response<ApiResponse>) => {
  const customer = getCustomer(req.params.id ?? "");
  if (!customer) {
    return fail(res, "customer_not_found", "Customer not found", 404);
  }
  ok(res, customer);
});

const newCustomerSchema = z.object({
  fullName: z.string().min(2),
  age: z.number().int().min(18).max(100),
  gender: z.enum(["M", "F"]).optional(),
  residentialStatus: z.enum(["citizen", "pr"]).optional(),
  preferredLanguage: LanguageSchema.optional(),
  dialect: z.string().nullable().optional(),
  employmentStatus: z.enum(["employed", "self_employed", "platform_worker", "retired", "unemployed"]).optional(),
  digitalLiteracy: z.enum(["low", "medium", "high"]).optional(),
  incomeBand: z.enum(["low", "lower_mid", "mid", "upper", "high"]).optional(),
  accessibility: z.enum(["none", "high_contrast", "assisted"]).optional(),
  caregiverLinked: z.boolean().optional(),
});

router.post("/customers", (req: Request, res: Response<ApiResponse>) => {
  const parsed = newCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "invalid_customer", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const detail = buildCustomerFromInput(parsed.data);
  insertCustomerBundle(detail);
  ok(res, detail, 201);
});

// ---------------------------------------------------------------------------
// Cases (bring up + append + resolve)
// ---------------------------------------------------------------------------

router.get("/cases", (req: Request, res: Response<ApiResponse>) => {
  const { items, total } = listCases({
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    priority: typeof req.query.priority === "string" ? req.query.priority : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    userId: typeof req.query.userId === "string" ? req.query.userId : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
  });
  ok(res, { items, total });
});

router.get("/cases/:id", (req: Request, res: Response<ApiResponse>) => {
  const detail = getCase(req.params.id ?? "");
  if (!detail) {
    return fail(res, "case_not_found", "Case not found", 404);
  }
  ok(res, detail);
});

const newCaseSchema = z.object({
  userId: z.string().min(1),
  category: z.enum(["financial", "healthcare", "housing", "employment", "legal", "retirement"]),
  title: z.string().min(3),
  summary: z.string().min(3),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  channel: z.enum(["web", "chat", "voice", "sms", "mail"]).default("web"),
  language: LanguageSchema.default("en"),
});

router.post("/cases", (req: Request, res: Response<ApiResponse>) => {
  const parsed = newCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "invalid_case", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const member = getCustomer(parsed.data.userId);
  if (!member) {
    return fail(res, "customer_not_found", "Cannot create a case for an unknown member", 404);
  }

  const id = newId("case");
  const now = new Date().toISOString();
  const newCase: CorrespondenceCase = {
    id,
    userId: parsed.data.userId,
    reference: `CPF-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`,
    category: parsed.data.category,
    title: parsed.data.title,
    summary: parsed.data.summary,
    status: "open",
    priority: parsed.data.priority,
    channel: parsed.data.channel,
    language: parsed.data.language,
    createdAt: now,
    dueAt: null,
    resolvedAt: null,
    events: [{ id: newId("evt"), caseId: id, eventType: "created", detail: "Case opened via the data console.", occurredAt: now }],
  };
  insertCase(newCase);
  ok(res, getCase(id), 201);
});

const caseEventSchema = z.object({
  eventType: z.string().min(2).default("note"),
  detail: z.string().min(2),
});

router.post("/cases/:id/events", (req: Request, res: Response<ApiResponse>) => {
  const caseId = req.params.id ?? "";
  if (!getCase(caseId)) {
    return fail(res, "case_not_found", "Case not found", 404);
  }
  const parsed = caseEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "invalid_event", parsed.error.issues.map((i) => i.message).join("; "));
  }
  addCaseEvent(caseId, parsed.data.eventType, parsed.data.detail);
  ok(res, getCase(caseId));
});

const caseStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "dismissed"]),
});

router.patch("/cases/:id/status", (req: Request, res: Response<ApiResponse>) => {
  const caseId = req.params.id ?? "";
  const parsed = caseStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "invalid_status", "status must be open, in_progress, resolved, or dismissed");
  }
  const updated = updateCaseStatus(caseId, parsed.data.status);
  if (!updated) {
    return fail(res, "case_not_found", "Case not found", 404);
  }
  addCaseEvent(caseId, "status_changed", `Status changed to ${parsed.data.status} via the data console.`);
  ok(res, getCase(caseId));
});

// ---------------------------------------------------------------------------
// CPF knowledge (the document store)
// ---------------------------------------------------------------------------

router.get("/knowledge", async (_req: Request, res: Response<ApiResponse>) => {
  const [sections, documents, terminology] = await Promise.all([listSections(), listDocuments(), listTerminology()]);
  ok(res, { sections, documents, terminology });
});

router.get("/knowledge/search", async (req: Request, res: Response<ApiResponse>) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (!q.trim()) {
    return fail(res, "missing_query", "Provide a search query via ?q=");
  }
  const matches = await searchKnowledge(q, req.query.limit ? Number(req.query.limit) : 8);
  ok(res, { query: q, matches });
});

export { router as consoleRoutes };
