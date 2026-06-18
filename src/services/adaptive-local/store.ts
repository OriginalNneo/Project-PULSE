import type { AdaptiveUserProfile, CsoAlert, FrictionEvent, MemberSession, TelemetryEvent } from "./types.js";

interface AdaptiveLocalStore {
  usersBySubject: Map<string, AdaptiveUserProfile>;
  usersById: Map<string, AdaptiveUserProfile>;
  sessions: Map<string, MemberSession>;
  telemetryEvents: TelemetryEvent[];
  frictionEvents: FrictionEvent[];
  alerts: CsoAlert[];
  escalationDedupe: Map<string, number>;
  counters: Map<string, number>;
}

export const store: AdaptiveLocalStore = {
  usersBySubject: new Map(),
  usersById: new Map(),
  sessions: new Map(),
  telemetryEvents: [],
  frictionEvents: [],
  alerts: [],
  escalationDedupe: new Map(),
  counters: new Map(),
};

export function nextId(prefix: string): string {
  const nextValue = (store.counters.get(prefix) ?? 0) + 1;
  store.counters.set(prefix, nextValue);
  return `${prefix}_${nextValue.toString().padStart(4, "0")}`;
}

export function resetAdaptiveLocalStore(): void {
  store.usersBySubject.clear();
  store.usersById.clear();
  store.sessions.clear();
  store.telemetryEvents.length = 0;
  store.frictionEvents.length = 0;
  store.alerts.length = 0;
  store.escalationDedupe.clear();
  store.counters.clear();
}
