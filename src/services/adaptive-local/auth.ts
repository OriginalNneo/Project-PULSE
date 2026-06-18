import { createMemberSession } from "./sessions.js";
import { nextId, store } from "./store.js";
import { resolveUiProfile } from "./profiles.js";
import type { AdaptiveUserProfile, AgeBracket, LoginResult, VulnerabilityMarker } from "./types.js";

const simulatedDirectory: Record<string, Omit<AdaptiveUserProfile, "id" | "singpassSubject">> = {
  S1234567A: {
    displayName: "Tan Mei Ling",
    ageBracket: "65_plus",
    preferredLanguage: "en",
    vulnerabilityMarkers: [{ type: "senior_age_bracket", value: "65_plus", confidence: 1 }],
  },
  S7654321B: {
    displayName: "Rahim Bin Salleh",
    ageBracket: "55_to_64",
    preferredLanguage: "ms",
    vulnerabilityMarkers: [{ type: "low_digital_confidence", value: "self_reported", confidence: 0.7 }],
    accessibilityPreference: "assisted",
  },
  S2468101C: {
    displayName: "Lim Hui Wen",
    ageBracket: "35_to_54",
    preferredLanguage: "zh",
    vulnerabilityMarkers: [],
  },
};

export function simulateSingpassLogin(singpassSubject: string): LoginResult {
  const normalizedSubject = singpassSubject.trim().toUpperCase();
  const existingUser = store.usersBySubject.get(normalizedSubject);
  const user = existingUser ?? createUserFromSubject(normalizedSubject);
  const session = createMemberSession(user);
  const uiProfile = resolveUiProfile(user);
  const { singpassSubject: _subject, ...safeUser } = user;

  return {
    user: safeUser,
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
    },
    uiProfile,
  };
}

export function getUserById(userId: string): AdaptiveUserProfile | undefined {
  return store.usersById.get(userId);
}

function createUserFromSubject(singpassSubject: string): AdaptiveUserProfile {
  const directoryProfile = simulatedDirectory[singpassSubject] ?? createDefaultProfile(singpassSubject);
  const user: AdaptiveUserProfile = {
    id: nextId("usr"),
    singpassSubject,
    ...directoryProfile,
  };

  store.usersBySubject.set(singpassSubject, user);
  store.usersById.set(user.id, user);
  return user;
}

function createDefaultProfile(singpassSubject: string): Omit<AdaptiveUserProfile, "id" | "singpassSubject"> {
  const finalChar = singpassSubject.at(-1) ?? "A";
  const ageBracket: AgeBracket = finalChar < "H" ? "65_plus" : "35_to_54";
  const vulnerabilityMarkers: VulnerabilityMarker[] = ageBracket === "65_plus"
    ? [{ type: "senior_age_bracket", value: "65_plus", confidence: 1 }]
    : [];

  return {
    displayName: `Simulated Member ${singpassSubject.slice(-4)}`,
    ageBracket,
    preferredLanguage: "en",
    vulnerabilityMarkers,
  };
}
