import { defaultRecommendedActions } from "./catalog.js";
import type { AdaptiveUserProfile, UiProfile } from "./types.js";

export function resolveUiProfile(user: AdaptiveUserProfile): UiProfile {
  if (user.accessibilityPreference === "high_contrast") {
    return {
      mode: "high_contrast",
      recommendedActions: [...defaultRecommendedActions],
      reasons: ["accessibility_preference"],
    };
  }

  if (user.accessibilityPreference === "assisted") {
    return {
      mode: "assisted",
      recommendedActions: [...defaultRecommendedActions],
      reasons: ["accessibility_preference", "assisted_support_preferred"],
    };
  }

  const hasSeniorMarker = user.vulnerabilityMarkers.some((marker) => marker.type === "senior_age_bracket");
  if (hasSeniorMarker) {
    return {
      mode: "simplified",
      recommendedActions: [...defaultRecommendedActions],
      reasons: ["senior_age_bracket"],
    };
  }

  return {
    mode: "standard",
    recommendedActions: ["check_medisave_balance", "update_contact_details", "review_nomination_status"],
    reasons: [],
  };
}
