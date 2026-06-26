import { describe, it, expect, vi, beforeEach } from "vitest";

// B6: with HF_TRANSLATE_MODEL empty (the new default — vitest does not load .env),
// translateText must go straight to the LLM (GLM) and never call the de-listed HF
// SeamlessM4T model. The hfJson mock throws so any HF call would fail the test loudly.
vi.mock("../services/ai/llmClient.js", () => ({
  chatComplete: vi.fn(async () => ({ content: "你好" })),
}));
vi.mock("../shared/hf/client.js", () => ({
  hfJson: vi.fn(async () => {
    throw new Error("HF translate model should not be called by default (B6)");
  }),
  hfBinary: vi.fn(),
  hfRawOut: vi.fn(),
}));

import { translateText } from "./client.js";
import { chatComplete } from "../services/ai/llmClient.js";
import { hfJson } from "../shared/hf/client.js";

describe("translateText — GLM-first by default (B6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits identical source/target with no network call", async () => {
    const r = await translateText("hello", "en", "en");
    expect(r.translated_text).toBe("hello");
    expect(chatComplete).not.toHaveBeenCalled();
    expect(hfJson).not.toHaveBeenCalled();
  });

  it("short-circuits empty text", async () => {
    const r = await translateText("   ", "en", "zh");
    expect(r.translated_text).toBe("   ");
    expect(hfJson).not.toHaveBeenCalled();
  });

  it("translates via the LLM and never calls the de-listed HF model", async () => {
    const r = await translateText("hello", "en", "zh");
    expect(r.translated_text).toBe("你好");
    expect(chatComplete).toHaveBeenCalledTimes(1);
    expect(hfJson).not.toHaveBeenCalled();
  });
});
