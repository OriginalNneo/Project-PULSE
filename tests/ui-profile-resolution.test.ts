import { describe, expect, it } from "vitest";

import { resolveUiProfile } from "../src/testing/pulseTestHarness.js";

describe("UI profile resolution expectations", () => {
  it("defaults self-service English users to compact in-app Singapore English", () => {
    expect(
      resolveUiProfile({
        language: "en",
        vulnerabilityTier: "self_service",
      }),
    ).toEqual({
      locale: "en-SG",
      copyLanguage: "en",
      dialect: undefined,
      primaryChannel: "in-app",
      assistedMode: false,
      voiceFirst: false,
      fontScale: 1,
    });
  });

  it("preserves dialect-specific locale while keeping base copy language", () => {
    expect(
      resolveUiProfile({
        language: "zh",
        dialect: "zh-hok",
        vulnerabilityTier: "guided",
        requestedChannels: ["sms", "in-app"],
      }),
    ).toMatchObject({
      locale: "zh-Hant-SG-x-hokkien",
      copyLanguage: "zh",
      dialect: "zh-hok",
      primaryChannel: "sms",
      assistedMode: true,
      fontScale: 1.15,
    });
  });

  it("promotes high-touch profiles to voice-first when voice is available", () => {
    expect(
      resolveUiProfile({
        language: "ta",
        dialect: "ta-sin",
        vulnerabilityTier: "high_touch",
        requestedChannels: ["sms", "voice", "in-app"],
      }),
    ).toMatchObject({
      locale: "ta-SG-x-singapore",
      primaryChannel: "voice",
      assistedMode: true,
      voiceFirst: true,
      fontScale: 1.3,
    });
  });
});
