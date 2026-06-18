import {
  SERVICE_KEYWORDS,
  NAVIGATION_KEYWORDS,
  PERSONAL_DATA_KEYWORDS,
  PIPELINE_SERVICE,
  PIPELINE_NAVIGATE,
  PIPELINE_GENERAL,
  PIPELINE_PERSONAL_DATA,
  type QueryIntent,
  type QueryToolName,
} from "./routes.js";

export function detectQueryIntent(message: string): QueryIntent {
  const text = message.toLowerCase();

  for (const kw of PERSONAL_DATA_KEYWORDS) {
    if (text.includes(kw)) return "personal_data";
  }
  for (const kw of SERVICE_KEYWORDS) {
    if (text.includes(kw)) return "service";
  }
  for (const kw of NAVIGATION_KEYWORDS) {
    if (text.includes(kw)) return "navigate";
  }

  return "general";
}

export function selectQueryPipeline(message: string): { intent: QueryIntent; pipeline: QueryToolName[] } {
  const intent = detectQueryIntent(message);

  switch (intent) {
    case "service":       return { intent, pipeline: PIPELINE_SERVICE };
    case "navigate":      return { intent, pipeline: PIPELINE_NAVIGATE };
    case "personal_data": return { intent, pipeline: PIPELINE_PERSONAL_DATA };
    default:              return { intent, pipeline: PIPELINE_GENERAL };
  }
}
