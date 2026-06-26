import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Characterization tests for processInbound — they LOCK the current branch-by-branch
// behavior of the live message loop so the upcoming split into helpers can be proven
// behavior-preserving. Pure modules (formatter, analyzer, classifier, emotion,
// trajectory) are left REAL; every side-effecting dependency is mocked.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("../agents/transcriber/agent.js", () => ({ runTranscriberSubagent: vi.fn() }));
vi.mock("../agents/query/agent.js", () => ({ runQueryAgent: vi.fn() }));
vi.mock("../db/proxy-client.js", () => ({
  getUserPrefs: vi.fn(),
  upsertUserPrefs: vi.fn(),
  postToQueue: vi.fn(),
  getQueue: vi.fn(),
  updateQueueEmotion: vi.fn(),
  appendToQueueHistory: vi.fn(),
  setQueueQuerySummary: vi.fn(),
}));
vi.mock("../services/ai/llmClient.js", () => ({ callHermes: vi.fn(async () => "CLEAR") }));
vi.mock("../data/knowledge/guiding.js", () => ({ findGuidingSetForQuery: vi.fn() }));
vi.mock("../agents/query/guidedSynthesis.js", () => ({ synthesizeGuidedAnswer: vi.fn() }));
vi.mock("../python-bridge/client.js", () => ({
  translateText: vi.fn(async (t: string) => ({ translated_text: t, source_lang: "en", target_lang: "en" })),
  synthesizeSpeech: vi.fn(),
  detectLanguage: vi.fn(),
  detectEmotion: vi.fn(),
  detectAudioEmotion: vi.fn(),
}));
vi.mock("../services/session/manager.js", () => ({
  touchSession: vi.fn(),
  getActiveSession: vi.fn(),
  endSession: vi.fn(),
  recordRating: vi.fn(),
  resetSession: vi.fn(),
  getHistory: vi.fn(),
  appendHistory: vi.fn(),
  clearHistory: vi.fn(),
  isClosingMessage: vi.fn(),
}));
vi.mock("../dashboard/notify.js", () => ({ notifyNewQueueEntry: vi.fn(), notifyQueueUpdated: vi.fn() }));
vi.mock("./ws.js", () => ({ broadcast: vi.fn() }));
vi.mock("./dashboard.js", () => ({ pushEmotionEvent: vi.fn(), getLatestEmotionForUser: vi.fn() }));
vi.mock("./thinking.js", () => ({ startThinking: vi.fn() }));

import { processInbound, type InboundChannel, type InboundMessage } from "./inbound.js";
import { runQueryAgent } from "../agents/query/agent.js";
import {
  getUserPrefs, upsertUserPrefs, getQueue, updateQueueEmotion, appendToQueueHistory,
} from "../db/proxy-client.js";
import { runTranscriberSubagent } from "../agents/transcriber/agent.js";
import { detectLanguage, detectEmotion, detectAudioEmotion, synthesizeSpeech } from "../python-bridge/client.js";
import {
  getActiveSession, getHistory, isClosingMessage, endSession, resetSession, recordRating, appendHistory,
} from "../services/session/manager.js";
import { startThinking } from "./thinking.js";
import { findGuidingSetForQuery } from "../data/knowledge/guiding.js";

const DEFAULT_PREFS = {
  userId: "tg:u1", preferred_lang: "en", voice_enabled: false, speech_rate: 1.0, accessibility_mode: "standard",
};

function makeChannel() {
  return {
    prefix: "tg",
    send: vi.fn(async () => {}),
    sendWithButtons: vi.fn(async () => {}),
    sendVoice: vi.fn(async () => {}),
    editMessage: vi.fn(async () => true),
    deleteMessage: vi.fn(async () => {}),
  };
}
const run = (channel: ReturnType<typeof makeChannel>, msg: Partial<InboundMessage>) =>
  processInbound(channel as unknown as InboundChannel, { userKey: "u1", ...msg } as InboundMessage);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserPrefs).mockResolvedValue({ ...DEFAULT_PREFS } as never);
  vi.mocked(upsertUserPrefs).mockResolvedValue(undefined as never);
  vi.mocked(getQueue).mockResolvedValue([] as never);
  vi.mocked(getActiveSession).mockReturnValue(undefined as never);
  vi.mocked(getHistory).mockReturnValue([] as never);
  vi.mocked(isClosingMessage).mockReturnValue(false);
  vi.mocked(appendHistory).mockReturnValue(undefined as never);
  vi.mocked(detectLanguage).mockResolvedValue("en" as never);
  vi.mocked(detectEmotion).mockResolvedValue({ label: "neutral", score: 0.1 } as never);
  vi.mocked(detectAudioEmotion).mockResolvedValue(null as never);
  vi.mocked(synthesizeSpeech).mockResolvedValue(null as never);
  vi.mocked(updateQueueEmotion).mockResolvedValue(null as never);
  vi.mocked(appendToQueueHistory).mockResolvedValue(undefined as never);
  vi.mocked(findGuidingSetForQuery).mockResolvedValue(null as never);
  vi.mocked(runTranscriberSubagent).mockImplementation(async (input: any) => ({
    normalizedText: input.mode === "text" ? input.text : "what is cpf life",
    text: input.mode === "text" ? input.text : "what is cpf life",
    detectedDialect: undefined, confidence: 0.9,
  }) as never);
  vi.mocked(runQueryAgent).mockResolvedValue({
    content: "Your CPF LIFE payout starts at the payout eligibility age.",
    agentName: "query", confidence: 0.9, requiresHumanReview: false,
    metadata: {}, intent: "general",
  } as never);
  vi.mocked(startThinking).mockResolvedValue({ messageId: "think-1", stop: vi.fn(async () => {}) } as never);
});

describe("processInbound — commands (early-return, no query)", () => {
  it("/start sends a message and does NOT run the query agent", async () => {
    const ch = makeChannel();
    await run(ch, { text: "/start" });
    expect(ch.send).toHaveBeenCalledTimes(1);
    expect(runQueryAgent).not.toHaveBeenCalled();
  });

  it("/help sends a message and does NOT run the query agent", async () => {
    const ch = makeChannel();
    await run(ch, { text: "help" });
    expect(ch.send).toHaveBeenCalledTimes(1);
    expect(runQueryAgent).not.toHaveBeenCalled();
  });

  it("/end with empty history resets and does NOT rate", async () => {
    const ch = makeChannel();
    await run(ch, { text: "/end" });
    expect(resetSession).toHaveBeenCalledWith("tg:u1");
    expect(endSession).not.toHaveBeenCalled();
    expect(runQueryAgent).not.toHaveBeenCalled();
  });

  it("/end with history ends the session as 'satisfied'", async () => {
    vi.mocked(getHistory).mockReturnValue([{ role: "user", content: "hi" }] as never);
    await run(makeChannel(), { text: "/end" });
    expect(endSession).toHaveBeenCalledWith("tg:u1", "satisfied", expect.objectContaining({ lang: "en" }));
  });

  it("voice on enables voice replies", async () => {
    await run(makeChannel(), { text: "voice on" });
    expect(upsertUserPrefs).toHaveBeenCalledWith(expect.objectContaining({ voice_enabled: true }));
    expect(runQueryAgent).not.toHaveBeenCalled();
  });

  it("/dialect cantonese saves the dialect code", async () => {
    await run(makeChannel(), { text: "/dialect cantonese" });
    expect(upsertUserPrefs).toHaveBeenCalledWith(expect.objectContaining({ preferred_dialect: "zh-can" }));
    expect(runQueryAgent).not.toHaveBeenCalled();
  });
});

describe("processInbound — state intercepts (early-return, no query)", () => {
  it("a bare 1–5 while awaiting_rating records the rating", async () => {
    vi.mocked(getActiveSession).mockReturnValue({ status: "awaiting_rating", sessionId: "s1" } as never);
    vi.mocked(recordRating).mockResolvedValue({ ok: true, thankYou: "Thanks!" } as never);
    await run(makeChannel(), { text: "5" });
    expect(recordRating).toHaveBeenCalledWith("tg:u1", "s1", 5);
    expect(runQueryAgent).not.toHaveBeenCalled();
  });

  it("a message while an active queue entry exists is relayed, not answered", async () => {
    vi.mocked(getQueue).mockResolvedValue([{ userId: "tg:u1", status: "assigned", queueId: "q1", preferred_lang: "en" }] as never);
    await run(makeChannel(), { text: "I still need help" });
    expect(appendToQueueHistory).toHaveBeenCalled();
    expect(runQueryAgent).not.toHaveBeenCalled();
  });
});

describe("processInbound — normal query → deliver", () => {
  it("answers a Cat-1 question, appends history, stops thinking, edits the reply in", async () => {
    const ch = makeChannel();
    await run(ch, { text: "What is CPF LIFE?" });
    expect(runQueryAgent).toHaveBeenCalledTimes(1);
    expect(appendHistory).toHaveBeenCalledTimes(1);
    expect(ch.editMessage).toHaveBeenCalled(); // thinking bubble edited into the answer
  });

  it("a high-distress turn (emotion>70) arms the officer offer", async () => {
    vi.mocked(detectEmotion).mockResolvedValue({ label: "anger", score: 0.9 } as never); // → 90 (B1 distress)
    await run(makeChannel(), { text: "this is taking forever and nothing works" });
    expect(upsertUserPrefs).toHaveBeenCalledWith(expect.objectContaining({ pendingOfficerOffer: true }));
  });

  it("empty message with no audio is a no-op", async () => {
    const ch = makeChannel();
    await run(ch, { text: "   " });
    expect(ch.send).not.toHaveBeenCalled();
    expect(runQueryAgent).not.toHaveBeenCalled();
  });

  it("with voice_enabled, synthesizes and sends a voice reply", async () => {
    vi.mocked(getUserPrefs).mockResolvedValue({ ...DEFAULT_PREFS, voice_enabled: true } as never);
    vi.mocked(synthesizeSpeech).mockResolvedValue({ audioBase64: "AAA", mimeType: "audio/mpeg" } as never);
    const ch = makeChannel();
    await run(ch, { text: "What is CPF LIFE?" });
    expect(synthesizeSpeech).toHaveBeenCalled();
    expect(ch.sendVoice).toHaveBeenCalledWith("AAA", "audio/mpeg");
  });
});
