import { describe, it, expect } from "vitest";
import {
  isClosingMessage,
  isSessionExpired,
  touchSession,
  getActiveSession,
  sweepIdleSessions,
  recordRating,
} from "./manager.js";

describe("isClosingMessage — customer-satisfied sign-off detection", () => {
  it("detects pure sign-offs", () => {
    for (const t of ["thanks", "thank you", "Thank you so much", "thanks!", "ok thanks", "that's all", "no more questions", "I'm done", "bye", "no thanks", "all good"]) {
      expect(isClosingMessage(t)).toBe(true);
    }
  });

  it("does NOT fire on questions or thanks-with-a-follow-up", () => {
    for (const t of [
      "thanks, but what about my MediSave?", // gratitude + a real question
      "how do I withdraw at 55?",
      "what is the Full Retirement Sum?",
      "can you explain CPF LIFE?",
      "thanks for nothing, why is this so hard?", // has interrogative
      "", // empty
    ]) {
      expect(isClosingMessage(t)).toBe(false);
    }
  });

  it("ignores long messages (real queries that happen to start with 'thanks')", () => {
    expect(isClosingMessage("thanks I wanted to also understand the housing withdrawal limits please")).toBe(false);
  });
});

describe("isSessionExpired — 24h inactivity predicate", () => {
  const DAY = 24 * 60 * 60 * 1000;
  it("is true at/after the TTL and false before it", () => {
    const t0 = 1_000_000_000_000;
    expect(isSessionExpired(t0, t0 + DAY)).toBe(true);
    expect(isSessionExpired(t0, t0 + DAY + 1)).toBe(true);
    expect(isSessionExpired(t0, t0 + DAY - 1)).toBe(false);
    expect(isSessionExpired(t0, t0)).toBe(false);
  });
});

describe("session lifecycle (hermetic, no network)", () => {
  it("touchSession creates then refreshes an active session", () => {
    const u = "tg:test-touch-1";
    const s1 = touchSession(u, "tg");
    expect(s1.status).toBe("active");
    expect(getActiveSession(u)?.sessionId).toBe(s1.sessionId);
    const s2 = touchSession(u, "tg");
    expect(s2.sessionId).toBe(s1.sessionId); // same session, refreshed
  });

  it("sweepIdleSessions resets a session idle for >24h", async () => {
    const u = "tg:test-sweep-1";
    touchSession(u, "tg");
    expect(getActiveSession(u)).not.toBeNull();
    const reset = await sweepIdleSessions(Date.now() + 25 * 60 * 60 * 1000);
    expect(reset).toBeGreaterThanOrEqual(1);
    expect(getActiveSession(u)).toBeNull(); // session dropped
  });

  it("recordRating rejects a tap with no open rating window", async () => {
    const r = await recordRating("tg:test-norating-1", "nonexistent-session", 5);
    expect(r.ok).toBe(false);
  });
});
