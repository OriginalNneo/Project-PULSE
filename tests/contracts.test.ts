import { describe, expect, it } from "vitest";

import {
  apiResponseContract,
  correspondenceContract,
  makeApiResponse,
  makeCorrespondence,
  makeVulnerabilityProfile,
  makeVulnerabilitySignal,
  vulnerabilityProfileContract,
} from "../src/testing/pulseTestHarness.js";

describe("shared contract fixtures", () => {
  it("keeps the ApiResponse success envelope stable", () => {
    expect(apiResponseContract.parse(makeApiResponse({ ok: true }))).toEqual({
      data: { ok: true },
    });
  });

  it("rejects an empty ApiResponse envelope", () => {
    expect(() => apiResponseContract.parse({})).toThrow(/either data or error/);
  });

  it("validates correspondence fixtures against the deployment contract", () => {
    const correspondence = makeCorrespondence({
      channels: ["sms", "voice"],
      urgency: "critical",
      language: "ta",
    });

    expect(correspondenceContract.parse(correspondence)).toMatchObject({
      channels: ["sms", "voice"],
      urgency: "critical",
      language: "ta",
    });
  });

  it("rejects drift in required correspondence fields", () => {
    const correspondence = makeCorrespondence({ title: "" });

    expect(() => correspondenceContract.parse(correspondence)).toThrow();
  });

  it("validates vulnerability profile signals used by telemetry tests", () => {
    const profile = makeVulnerabilityProfile({
      tier: "guided",
      signals: [makeVulnerabilitySignal({ type: "login_failure", value: "3" })],
    });

    expect(vulnerabilityProfileContract.parse(profile)).toMatchObject({
      tier: "guided",
      signals: [{ type: "login_failure", value: "3" }],
    });
  });
});
