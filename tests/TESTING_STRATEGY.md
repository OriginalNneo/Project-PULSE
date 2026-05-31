# Project-PULSE Local Testing Strategy

This scaffold is the local pre-VPS deployment gate for Worker D. It intentionally owns only `tests/**` and `src/testing/**` so feature workers can continue changing backend and frontend modules without merge churn.

## Current Gate

Run from the repository root:

```bash
npm test
```

The current suite covers:

- Shared contract fixtures for API envelopes, correspondence, vulnerability profiles, and signals.
- UI profile resolution expectations for locale, dialect, accessibility sizing, assisted mode, and voice-first routing.
- Telemetry friction scenarios for login failure, idle time, delivery bounce, proxy request, and completed-action recovery.
- Hermes transport boundary behavior that rejects local endpoints unless explicit test mode is enabled.
- CSO alert projection behavior for critical correspondence, high-touch profiles, accumulated friction, severity, queue, and sort order.

## Expansion Path

As feature modules become stable, replace TODO fixtures in `src/testing/pulseTestHarness.ts` with thin imports around exported pure helpers from production modules. Keep production side effects behind stubs or adapters in tests so `npm test` remains fast, deterministic, and safe to run before VPS deployment.

Recommended next layers:

- Add route-level contract tests with mocked auth and storage boundaries.
- Add frontend component tests once UI profile resolution is exported from the app layer.
- Add one smoke test that composes telemetry, alert projection, and notification dispatch with all external systems stubbed.
- Add deployment readiness checks for required environment variables without contacting live services.
