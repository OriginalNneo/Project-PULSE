import { Router, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { getToolsDb } from "../connections.js";

const router = Router();

router.get("/slang/:term", async (req: Request, res: Response) => {
  const entry = await getToolsDb()
    .collection("slang_dictionary")
    .findOne({ term: req.params.term }, { projection: { _id: 0 } });
  if (!entry) return void res.status(404).json({ error: "Not found" });
  res.json(entry);
});

router.post("/slang", async (req: Request, res: Response) => {
  const { term, dialect, normalized_form, confidence, source } = req.body as {
    term: string;
    dialect: string;
    normalized_form: string;
    confidence: number;
    source?: string[];
  };
  if (!term || !dialect) return void res.status(400).json({ error: "term and dialect required" });
  const result = await getToolsDb()
    .collection("slang_dictionary")
    .findOneAndUpdate(
      { term },
      { $set: { term, dialect, normalized_form, confidence, source: source ?? [] } },
      { upsert: true, returnDocument: "after", projection: { _id: 0 } },
    );
  res.status(201).json(result);
});

router.get("/cache/:hash", async (req: Request, res: Response) => {
  const entry = await getToolsDb()
    .collection("translation_cache")
    .findOneAndUpdate(
      { hash: req.params.hash },
      { $inc: { hit_count: 1 } },
      { returnDocument: "after", projection: { _id: 0 } },
    );
  if (!entry) return void res.status(404).json({ error: "Not found" });
  res.json(entry);
});

router.post("/cache", async (req: Request, res: Response) => {
  const { hash, translated_text, model } = req.body as {
    hash: string;
    translated_text: string;
    model: string;
  };
  if (!hash || !translated_text) return void res.status(400).json({ error: "hash and translated_text required" });
  const entry = { hash, translated_text, model, created_at: new Date().toISOString(), hit_count: 0 };
  await getToolsDb()
    .collection("translation_cache")
    .updateOne({ hash }, { $setOnInsert: entry }, { upsert: true });
  res.status(201).json(entry);
});

router.get("/cpf-page", async (req: Request, res: Response) => {
  const url = req.query["url"] as string | undefined;
  if (!url) return void res.status(400).json({ error: "url query param required" });
  const page = await getToolsDb()
    .collection("cpf_pages_cache")
    .findOne({ url }, { projection: { _id: 0 } });
  if (!page) return void res.status(404).json({ error: "Not found" });
  res.json(page);
});

router.get("/cpf-links", async (req: Request, res: Response) => {
  const keyword = req.query["keyword"] as string | undefined;
  if (!keyword) return void res.status(400).json({ error: "keyword query param required" });
  const links = await getToolsDb()
    .collection("cpf_hyperlinks")
    .find(
      { $text: { $search: keyword } },
      { projection: { _id: 0 }, limit: 5 },
    )
    .toArray();
  res.json(links);
});

router.post("/cpf-links", async (req: Request, res: Response) => {
  const { keyword, service_name, url, description, section } = req.body as {
    keyword: string;
    service_name: string;
    url: string;
    description: string;
    section: string;
  };
  if (!keyword || !url) return void res.status(400).json({ error: "keyword and url required" });
  const result = await getToolsDb()
    .collection("cpf_hyperlinks")
    .findOneAndUpdate(
      { keyword },
      { $set: { keyword, service_name, url, description, section, last_verified: new Date() } },
      { upsert: true, returnDocument: "after", projection: { _id: 0 } },
    );
  res.status(201).json(result);
});

router.get("/cpf-knowledge", async (req: Request, res: Response) => {
  const q = req.query["q"] as string | undefined;
  if (!q) return void res.status(400).json({ error: "q query param required" });
  const facts = await getToolsDb()
    .collection("cpf_knowledge")
    .find(
      { $text: { $search: q } },
      { projection: { _id: 0 }, limit: 3 },
    )
    .toArray();
  res.json(facts);
});

router.post("/cpf-knowledge", async (req: Request, res: Response) => {
  const { fact_id, section, question, answer, source_url } = req.body as {
    fact_id: string;
    section: string;
    question: string;
    answer: string;
    source_url: string;
  };
  if (!fact_id || !answer) return void res.status(400).json({ error: "fact_id and answer required" });
  const doc = { fact_id, section, question, answer, source_url, last_updated: new Date() };
  await getToolsDb()
    .collection("cpf_knowledge")
    .updateOne({ fact_id }, { $set: doc }, { upsert: true });
  res.status(201).json(doc);
});

// ── Query response cache ──────────────────────────────────────────────────────
const QUERY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

router.get("/query-cache/:hash", async (req: Request, res: Response) => {
  const entry = await getToolsDb()
    .collection("query_response_cache")
    .findOne(
      { hash: req.params.hash, expires_at: { $gt: new Date() } },
      { projection: { _id: 0 } },
    );
  if (!entry) return void res.status(404).json({ error: "Not found or expired" });
  await getToolsDb()
    .collection("query_response_cache")
    .updateOne({ hash: req.params.hash }, { $inc: { hit_count: 1 } });
  res.json(entry);
});

router.post("/query-cache", async (req: Request, res: Response) => {
  const { hash, response, intent, lang } = req.body as {
    hash: string;
    response: string;
    intent?: string;
    lang?: string;
  };
  if (!hash || !response) return void res.status(400).json({ error: "hash and response required" });
  const now = new Date();
  const doc = {
    hash,
    response,
    intent: intent ?? "",
    lang: lang ?? "en",
    created_at: now,
    expires_at: new Date(now.getTime() + QUERY_CACHE_TTL_MS),
    hit_count: 0,
  };
  await getToolsDb()
    .collection("query_response_cache")
    .updateOne({ hash }, { $setOnInsert: doc }, { upsert: true });
  res.status(201).json(doc);
});

// ── WhatsApp queue ────────────────────────────────────────────────────────────
// /queue/stats must come before /queue/:queueId to avoid route shadowing
router.get("/queue/stats", async (_req: Request, res: Response) => {
  const db = getToolsDb();
  const waiting = await db.collection("whatsapp_queue").countDocuments({ status: "waiting" });
  const waitingDocs = await db
    .collection("whatsapp_queue")
    .find({ status: "waiting" }, { projection: { created_at: 1 } })
    .toArray();
  const now = Date.now();
  const avgWaitMs =
    waitingDocs.length > 0
      ? waitingDocs.reduce(
          (acc, e) => acc + (now - new Date(e["created_at"] as string).getTime()),
          0,
        ) / waitingDocs.length
      : 0;
  res.json({ waiting, avg_wait_minutes: Math.round(avgWaitMs / 60_000) });
});

router.get("/queue", async (_req: Request, res: Response) => {
  const queue = await getToolsDb()
    .collection("whatsapp_queue")
    .find({}, { projection: { _id: 0 } })
    .sort({ priority_score: -1 })
    .toArray();
  res.json(queue);
});

router.post("/queue", async (req: Request, res: Response) => {
  const body = req.body as {
    sessionId: string;
    userId: string;
    emotion_score?: number;
    emotion_label?: string;
    summary?: string;
    chat_history?: unknown[];
    preferred_lang?: string;
    dialect_hint?: string;
  };
  const emotionScore = Math.min(body.emotion_score ?? 0, 80);
  const queueId = randomUUID();
  const now = new Date();
  const doc = {
    queueId,
    sessionId: body.sessionId,
    userId: body.userId,
    emotion_score: body.emotion_score ?? 0,
    emotion_label: body.emotion_label ?? "neutral",
    summary: body.summary ?? "",
    chat_history: body.chat_history ?? [],
    preferred_lang: body.preferred_lang ?? "en",
    dialect_hint: body.dialect_hint ?? null,
    status: "waiting",
    assigned_officer: null,
    assigned_at: null,
    priority_score: emotionScore,
    created_at: now,
  };
  await getToolsDb().collection("whatsapp_queue").insertOne(doc);
  const { _id: _mongoId, ...docOut } = doc as typeof doc & { _id?: unknown };
  void _mongoId;
  res.status(201).json(docOut);
});

router.get("/queue/:queueId", async (req: Request, res: Response) => {
  const entry = await getToolsDb()
    .collection("whatsapp_queue")
    .findOne({ queueId: req.params.queueId }, { projection: { _id: 0 } });
  if (!entry) return void res.status(404).json({ error: "Not found" });
  res.json(entry);
});

router.patch("/queue/:queueId/assign", async (req: Request, res: Response) => {
  const { officerId } = req.body as { officerId?: string };
  if (!officerId) return void res.status(400).json({ error: "officerId required" });
  const result = await getToolsDb()
    .collection("whatsapp_queue")
    .findOneAndUpdate(
      { queueId: req.params.queueId, status: "waiting" },
      { $set: { status: "assigned", assigned_officer: officerId, assigned_at: new Date() } },
      { returnDocument: "after", projection: { _id: 0 } },
    );
  if (!result) return void res.status(404).json({ error: "Not found or already assigned" });
  res.json(result);
});

router.patch("/queue/:queueId/resolve", async (req: Request, res: Response) => {
  const result = await getToolsDb()
    .collection("whatsapp_queue")
    .findOneAndUpdate(
      { queueId: req.params.queueId },
      { $set: { status: "resolved" } },
      { returnDocument: "after", projection: { _id: 0 } },
    );
  if (!result) return void res.status(404).json({ error: "Not found" });
  res.json(result);
});

router.patch("/queue/:queueId/priority", async (req: Request, res: Response) => {
  const { priority_score } = req.body as { priority_score?: number };
  if (priority_score === undefined) return void res.status(400).json({ error: "priority_score required" });
  const result = await getToolsDb()
    .collection("whatsapp_queue")
    .findOneAndUpdate(
      { queueId: req.params.queueId, status: "waiting" },
      { $set: { priority_score: Math.min(priority_score, 100) } },
      { returnDocument: "after", projection: { _id: 0 } },
    );
  if (!result) return void res.status(404).json({ error: "Not found or not in waiting status" });
  res.json(result);
});

export { router as toolsRoutes };
