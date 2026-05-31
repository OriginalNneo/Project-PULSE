import { describe, expect, it } from "vitest";

import { createHermesBoundary } from "../src/testing/pulseTestHarness.js";

describe("Hermes transport boundary", () => {
  it("rejects localhost endpoints when local transports are disabled", () => {
    const hermes = createHermesBoundary({
      endpoint: "http://localhost:4318/v1/traces",
      allowLocalTransports: false,
    });

    expect(() => hermes.dispatch({ event: "test" })).toThrow(/must not use a local endpoint/);
  });

  it("allows localhost only in explicit test mode", () => {
    const hermes = createHermesBoundary({
      endpoint: "http://127.0.0.1:4318/v1/traces",
      allowLocalTransports: true,
    });

    expect(hermes.dispatch({ event: "test" })).toEqual({
      endpoint: "http://127.0.0.1:4318/v1/traces",
      payload: { event: "test" },
      queued: true,
    });
  });

  it("allows remote Hermes endpoints for deployment-like tests", () => {
    const hermes = createHermesBoundary({
      endpoint: "https://hermes.example.gov.sg/v1/traces",
      allowLocalTransports: false,
    });

    expect(hermes.dispatch({ event: "deployment-check" })).toMatchObject({
      endpoint: "https://hermes.example.gov.sg/v1/traces",
      queued: true,
    });
  });
});
