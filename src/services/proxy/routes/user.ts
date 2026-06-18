import { Router, type Request, type Response } from "express";
import { getUsersDb } from "../connections.js";

const router = Router();

router.get("/prefs/:userId", async (req: Request, res: Response) => {
  const prefs = await getUsersDb()
    .collection("user_prefs")
    .findOne({ userId: req.params.userId }, { projection: { _id: 0 } });
  if (!prefs) return void res.status(404).json({ error: "Not found" });
  res.json(prefs);
});

router.get("/session/:sessionId", async (req: Request, res: Response) => {
  const session = await getUsersDb()
    .collection("sessions")
    .findOne({ sessionId: req.params.sessionId }, { projection: { _id: 0 } });
  if (!session) return void res.status(404).json({ error: "Not found" });
  res.json(session);
});

router.post("/prefs", async (req: Request, res: Response) => {
  const { userId, preferred_lang, voice_enabled, speech_rate, accessibility_mode } = req.body as {
    userId: string;
    preferred_lang?: string;
    voice_enabled?: boolean;
    speech_rate?: number;
    accessibility_mode?: string;
  };
  if (!userId) return void res.status(400).json({ error: "userId required" });
  const result = await getUsersDb()
    .collection("user_prefs")
    .findOneAndUpdate(
      { userId },
      { $set: { preferred_lang, voice_enabled, speech_rate, accessibility_mode } },
      { upsert: true, returnDocument: "after", projection: { _id: 0 } },
    );
  res.json(result);
});

router.post("/session", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const session = { ...body, sessionId: crypto.randomUUID(), created_at: new Date().toISOString() };
  await getUsersDb().collection("sessions").insertOne(session);
  const { _id: _mongoId, ...sessionOut } = session as typeof session & { _id?: unknown };
  void _mongoId;
  res.status(201).json(sessionOut);
});

// Returns the 3 most recent sessions for a user (used by conversation summariser)
router.get("/sessions-by-user/:userId", async (req: Request, res: Response) => {
  const sessions = await getUsersDb()
    .collection("sessions")
    .find({ userId: req.params.userId }, { projection: { _id: 0 } })
    .sort({ created_at: -1 })
    .limit(3)
    .toArray();
  res.json(sessions);
});

router.post("/conversation-log", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const doc = { ...body, created_at: new Date().toISOString() };
  await getUsersDb().collection("conversation_logs").insertOne(doc);
  const { _id: _mongoId, ...docOut } = doc as typeof doc & { _id?: unknown };
  void _mongoId;
  res.status(201).json(docOut);
});

router.get("/conversation-log/:sessionId", async (req: Request, res: Response) => {
  const logs = await getUsersDb()
    .collection("conversation_logs")
    .find({ sessionId: req.params.sessionId }, { projection: { _id: 0 } })
    .sort({ created_at: 1 })
    .toArray();
  res.json(logs);
});

export { router as userRoutes };
