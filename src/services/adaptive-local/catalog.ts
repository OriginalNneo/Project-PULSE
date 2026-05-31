import type { ActionKey, PageKey } from "./types.js";

export const knownPageKeys = [
  "home",
  "check_medisave_balance",
  "retirement_payout_planner",
  "update_contact_details",
  "nomination_status",
  "transaction_review",
] as const satisfies readonly PageKey[];

export const knownEventTypes = [
  "page_view",
  "heartbeat",
  "idle_tick",
  "click_attempt",
  "repeated_click",
  "rage_click",
  "backtrack",
  "form_error",
  "assistance_hover",
  "assistance_click",
  "navigation_abandon",
] as const;

export const pageTasks: Record<PageKey, string> = {
  home: "Review CPF account overview",
  check_medisave_balance: "Check MediSave balance",
  retirement_payout_planner: "View estimated monthly retirement payout",
  update_contact_details: "Update contact details",
  nomination_status: "Review nomination status",
  transaction_review: "Review and submit transaction",
};

export const transactionalPageKeys = new Set<PageKey>([
  "check_medisave_balance",
  "retirement_payout_planner",
  "update_contact_details",
  "nomination_status",
  "transaction_review",
]);

export const defaultRecommendedActions: ActionKey[] = [
  "check_medisave_balance",
  "view_retirement_payout",
  "request_assistance",
];
