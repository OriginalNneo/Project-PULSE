import { describe, expect, it } from "vitest";

import { makeFrictionEvent, summarizeFriction } from "../src/testing/pulseTestHarness.js";

describe("telemetry friction scenarios", () => {
  it("escalates repeated login and delivery failures to assist", () => {
    const [scenario] = summarizeFriction([
      makeFrictionEvent({ type: "login_failure" }),
      makeFrictionEvent({ type: "message_bounce" }),
    ]);

    expect(scenario).toMatchObject({
      userId: "user-1",
      frictionScore: 5,
      escalation: "assist",
      reasons: ["login_failure", "message_bounce"],
    });
  });

  it("marks urgent friction when multiple barriers accumulate", () => {
    const [scenario] = summarizeFriction([
      makeFrictionEvent({ type: "login_failure" }),
      makeFrictionEvent({ type: "message_bounce" }),
      makeFrictionEvent({ type: "proxy_request" }),
    ]);

    expect(scenario?.escalation).toBe("urgent");
    expect(scenario?.frictionScore).toBe(7);
  });

  it("reduces friction after successful action completion", () => {
    const [scenario] = summarizeFriction([
      makeFrictionEvent({ type: "message_bounce" }),
      makeFrictionEvent({ type: "action_completed" }),
    ]);

    expect(scenario).toMatchObject({
      frictionScore: 0,
      escalation: "none",
      reasons: ["message_bounce"],
    });
  });
});
