export type QueryToolName =
  | "cpf_search"
  | "cpf_navigate"
  | "hyperlink_lookup"
  | "service_lookup"
  | "validate_output"
  | "format_response";

export type QueryIntent =
  | "service"        // user asks about a specific CPF service
  | "navigate"       // user asks where to find something
  | "general"        // general CPF question
  | "personal_data"; // user asks about their own balance/payout — redirect to hotline

export const SERVICE_KEYWORDS: ReadonlySet<string> = new Set([
  "cpf life", "retirement", "medisave", "home protection scheme", "hps",
  "housing grant", "ahg", "shg", "edusave", "cpf investment", "cpfis",
  "ordinary account", "special account", "retirement account", "medisave account",
  "silver support", "workfare", "matched retirement savings", "mrss",
]);

export const NAVIGATION_KEYWORDS: ReadonlySet<string> = new Set([
  "where", "how to find", "how do i go", "link", "page", "website", "url",
  "apply", "apply for", "login", "log in", "singpass", "portal",
  "form", "download form", "e-service", "online",
]);

export const PERSONAL_DATA_KEYWORDS: ReadonlySet<string> = new Set([
  "my balance", "my cpf", "how much do i have", "my account balance",
  "my contribution", "my payout", "check my", "view my", "what is my",
  "my ordinary", "my special", "my retirement", "my medisave",
]);

export const PIPELINE_SERVICE: QueryToolName[] = [
  "service_lookup", "validate_output",
];

export const PIPELINE_NAVIGATE: QueryToolName[] = [
  "hyperlink_lookup", "cpf_navigate", "validate_output",
];

export const PIPELINE_GENERAL: QueryToolName[] = [
  "cpf_search", "validate_output",
];

export const PIPELINE_PERSONAL_DATA: QueryToolName[] = [
  "validate_output",
];
