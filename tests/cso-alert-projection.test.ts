import { describe, expect, it } from "vitest";

import {
  makeCorrespondence,
  makeFrictionEvent,
  makeVulnerabilityProfile,
  projectCsoAlerts,
  summarizeFriction,
} from "../src/testing/pulseTestHarness.js";

describe("CSO alert projection behavior", () => {
  it("projects critical correspondence users to the immediate queue", () => {
    const alerts = projectCsoAlerts(
      [makeVulnerabilityProfile({ userId: "user-critical", tier: "guided" })],
      [],
      [makeCorrespondence({ userId: "user-critical", urgency: "critical" })],
    );

    expect(alerts).toEqual([
      {
        userId: "user-critical",
        severity: "critical",
        queue: "immediate",
        reasons: ["critical correspondence"],
      },
    ]);
  });

  it("projects high-touch profiles with assist friction to outreach", () => {
    const friction = summarizeFriction([
      makeFrictionEvent({ userId: "user-assisted", type: "message_bounce" }),
      makeFrictionEvent({ userId: "user-assisted", type: "idle_time" }),
    ]);

    const alerts = projectCsoAlerts(
      [makeVulnerabilityProfile({ userId: "user-assisted", tier: "high-touch" })],
      friction,
      [],
    );

    expect(alerts).toEqual([
      {
        userId: "user-assisted",
        severity: "warning",
        queue: "outreach",
        reasons: ["high-touch profile", "assist friction"],
      },
    ]);
  });

  it("sorts critical alerts ahead of warning alerts", () => {
    const friction = summarizeFriction([
      makeFrictionEvent({ userId: "user-warning", type: "message_bounce" }),
      makeFrictionEvent({ userId: "user-warning", type: "idle_time" }),
      makeFrictionEvent({ userId: "user-critical", type: "login_failure" }),
      makeFrictionEvent({ userId: "user-critical", type: "message_bounce" }),
      makeFrictionEvent({ userId: "user-critical", type: "proxy_request" }),
    ]);

    const alerts = projectCsoAlerts(
      [
        makeVulnerabilityProfile({ userId: "user-warning", tier: "guided" }),
        makeVulnerabilityProfile({ userId: "user-critical", tier: "guided" }),
      ],
      friction,
      [],
    );

    expect(alerts.map((alert) => [alert.userId, alert.severity, alert.queue])).toEqual([
      ["user-critical", "critical", "immediate"],
      ["user-warning", "warning", "outreach"],
    ]);
  });
});
