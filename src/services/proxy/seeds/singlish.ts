import { getToolsDb } from "../connections.js";
import { createServiceLogger } from "../../../shared/logger.js";

const log = createServiceLogger("seed-singlish");

const SINGLISH_SEED = [
  { term: "lah",        dialect: "singlish", normalized_form: "",                    confidence: 1.0  },
  { term: "lor",        dialect: "singlish", normalized_form: "",                    confidence: 1.0  },
  { term: "leh",        dialect: "singlish", normalized_form: "",                    confidence: 1.0  },
  { term: "meh",        dialect: "singlish", normalized_form: "",                    confidence: 1.0  },
  { term: "sia",        dialect: "singlish", normalized_form: "",                    confidence: 1.0  },
  { term: "hor",        dialect: "singlish", normalized_form: "",                    confidence: 1.0  },
  { term: "wor",        dialect: "singlish", normalized_form: "",                    confidence: 1.0  },
  { term: "aiyo",       dialect: "singlish", normalized_form: "oh no",              confidence: 0.9  },
  { term: "wah",        dialect: "singlish", normalized_form: "wow",                confidence: 0.9  },
  { term: "sian",       dialect: "hokkien",  normalized_form: "bored or tired",     confidence: 0.9  },
  { term: "shiok",      dialect: "hokkien",  normalized_form: "great",              confidence: 0.95 },
  { term: "buay tahan", dialect: "hokkien",  normalized_form: "cannot stand it",    confidence: 0.95 },
  { term: "paiseh",     dialect: "hokkien",  normalized_form: "embarrassed",        confidence: 0.95 },
  { term: "kiasu",      dialect: "hokkien",  normalized_form: "afraid to lose out", confidence: 1.0  },
  { term: "blur",       dialect: "singlish", normalized_form: "confused",           confidence: 0.85 },
  { term: "steady",     dialect: "singlish", normalized_form: "cool or capable",    confidence: 0.85 },
  { term: "can or not", dialect: "singlish", normalized_form: "is it possible",     confidence: 0.95 },
  { term: "where got",  dialect: "singlish", normalized_form: "that is not true",   confidence: 0.9  },
  { term: "how can",    dialect: "singlish", normalized_form: "that is not right",  confidence: 0.85 },
  { term: "last time",  dialect: "singlish",      normalized_form: "previously",        confidence: 0.8  },
  { term: "wa lao",    dialect: "hokkien",       normalized_form: "oh my goodness",    confidence: 0.95 },
  { term: "boh liao",  dialect: "hokkien",       normalized_form: "nothing to do",     confidence: 0.9  },
  { term: "gao dim",   dialect: "hokkien",       normalized_form: "settled done",      confidence: 0.85 },
  { term: "manyak",    dialect: "bazaar-melayu", normalized_form: "banyak",            confidence: 0.9  },
  { term: "talak",     dialect: "bazaar-melayu", normalized_form: "tidak",             confidence: 0.9  },
  { term: "romba",     dialect: "spoken-tamil",  normalized_form: "very much",         confidence: 0.9  },
  { term: "sollu",     dialect: "spoken-tamil",  normalized_form: "tell me",           confidence: 0.9  },
];

export async function seedSinglish(): Promise<void> {
  const col = getToolsDb().collection("slang_dictionary");
  const count = await col.countDocuments();
  if (count > 0) {
    log.info("Slang dictionary already seeded, skipping");
    return;
  }
  await col.insertMany(SINGLISH_SEED.map((s) => ({ ...s, source: ["seed"] })));
  log.info({ count: SINGLISH_SEED.length }, "Singlish seed inserted into toolsDb");
}
