/**
 * Seed the slang_dictionary collection in MongoDB (pulse database).
 * Run with: npx tsx src/scripts/seed-slang.ts
 *
 * Covers:
 *   - Singlish particles & expressions
 *   - Hokkien loanwords common in Singapore
 *   - Cantonese loanwords common in Singapore
 *   - Bazaar Malay / colloquial Malay
 *   - Spoken Tamil (Singaporean variety)
 *   - CPF-specific colloquial phrasings
 */

import "dotenv/config";
import { MongoClient } from "mongodb";

interface SlangEntry {
  term: string;
  dialect: string;
  normalized_form: string;
  confidence: number;
  source: string[];
}

const SLANG_DATA: SlangEntry[] = [
  // ── Singlish particles (stripped during normalisation — empty normalized_form) ──
  { term: "lah",           dialect: "singlish",      normalized_form: "",                          confidence: 1.0,  source: ["seed"] },
  { term: "lor",           dialect: "singlish",      normalized_form: "",                          confidence: 1.0,  source: ["seed"] },
  { term: "leh",           dialect: "singlish",      normalized_form: "",                          confidence: 1.0,  source: ["seed"] },
  { term: "meh",           dialect: "singlish",      normalized_form: "",                          confidence: 1.0,  source: ["seed"] },
  { term: "sia",           dialect: "singlish",      normalized_form: "",                          confidence: 1.0,  source: ["seed"] },
  { term: "hor",           dialect: "singlish",      normalized_form: "",                          confidence: 1.0,  source: ["seed"] },
  { term: "wor",           dialect: "singlish",      normalized_form: "",                          confidence: 1.0,  source: ["seed"] },
  { term: "one",           dialect: "singlish",      normalized_form: "",                          confidence: 0.7,  source: ["seed"] },
  { term: "ah",            dialect: "singlish",      normalized_form: "",                          confidence: 0.9,  source: ["seed"] },
  { term: "mah",           dialect: "singlish",      normalized_form: "",                          confidence: 1.0,  source: ["seed"] },
  { term: "liao",          dialect: "hokkien",       normalized_form: "already",                   confidence: 1.0,  source: ["seed"] },
  { term: "already",       dialect: "singlish",      normalized_form: "already",                   confidence: 0.6,  source: ["seed"] },

  // ── Singlish expressions ──────────────────────────────────────────────────────
  { term: "aiyo",          dialect: "singlish",      normalized_form: "oh no",                     confidence: 0.9,  source: ["seed"] },
  { term: "aiyoh",         dialect: "singlish",      normalized_form: "oh no",                     confidence: 0.9,  source: ["seed"] },
  { term: "aiyah",         dialect: "singlish",      normalized_form: "oh no",                     confidence: 0.9,  source: ["seed"] },
  { term: "wah",           dialect: "singlish",      normalized_form: "wow",                       confidence: 0.9,  source: ["seed"] },
  { term: "wah lao",       dialect: "hokkien",       normalized_form: "oh my goodness",            confidence: 0.95, source: ["seed"] },
  { term: "walao",         dialect: "hokkien",       normalized_form: "oh my goodness",            confidence: 0.95, source: ["seed"] },
  { term: "wah lau",       dialect: "hokkien",       normalized_form: "oh my goodness",            confidence: 0.95, source: ["seed"] },
  { term: "blur",          dialect: "singlish",      normalized_form: "confused",                  confidence: 0.85, source: ["seed"] },
  { term: "blur like sotong", dialect: "singlish",   normalized_form: "very confused",             confidence: 0.95, source: ["seed"] },
  { term: "steady",        dialect: "singlish",      normalized_form: "capable or reliable",       confidence: 0.85, source: ["seed"] },
  { term: "steady bom pi pi", dialect: "singlish",   normalized_form: "excellent",                 confidence: 0.9,  source: ["seed"] },
  { term: "can or not",    dialect: "singlish",      normalized_form: "is it possible",            confidence: 0.95, source: ["seed"] },
  { term: "cannot",        dialect: "singlish",      normalized_form: "not possible",              confidence: 0.8,  source: ["seed"] },
  { term: "where got",     dialect: "singlish",      normalized_form: "that is not true",          confidence: 0.9,  source: ["seed"] },
  { term: "how can",       dialect: "singlish",      normalized_form: "that is not right",         confidence: 0.85, source: ["seed"] },
  { term: "last time",     dialect: "singlish",      normalized_form: "previously",                confidence: 0.8,  source: ["seed"] },
  { term: "confirm plus chop", dialect: "singlish",  normalized_form: "absolutely certain",        confidence: 0.95, source: ["seed"] },
  { term: "confirm",       dialect: "singlish",      normalized_form: "definitely",                confidence: 0.7,  source: ["seed"] },
  { term: "got",           dialect: "singlish",      normalized_form: "have",                      confidence: 0.6,  source: ["seed"] },
  { term: "no need",       dialect: "singlish",      normalized_form: "not necessary",             confidence: 0.8,  source: ["seed"] },
  { term: "so how",        dialect: "singlish",      normalized_form: "so what should we do",      confidence: 0.85, source: ["seed"] },
  { term: "never mind",    dialect: "singlish",      normalized_form: "it does not matter",        confidence: 0.7,  source: ["seed"] },
  { term: "talk cock",     dialect: "singlish",      normalized_form: "talking nonsense",          confidence: 0.85, source: ["seed"] },
  { term: "catch no ball", dialect: "singlish",      normalized_form: "do not understand",         confidence: 0.9,  source: ["seed"] },
  { term: "suka suka",     dialect: "bazaar-melayu", normalized_form: "as you wish",               confidence: 0.9,  source: ["seed"] },
  { term: "go and die",    dialect: "singlish",      normalized_form: "go away",                   confidence: 0.8,  source: ["seed"] },
  { term: "like that",     dialect: "singlish",      normalized_form: "in that case",              confidence: 0.6,  source: ["seed"] },
  { term: "is it",         dialect: "singlish",      normalized_form: "really",                    confidence: 0.6,  source: ["seed"] },
  { term: "correct or not", dialect: "singlish",     normalized_form: "is that right",             confidence: 0.9,  source: ["seed"] },
  { term: "later",         dialect: "singlish",      normalized_form: "afterwards",                confidence: 0.6,  source: ["seed"] },
  { term: "one time",      dialect: "singlish",      normalized_form: "at the same time",          confidence: 0.7,  source: ["seed"] },
  { term: "act blur",      dialect: "singlish",      normalized_form: "pretend not to know",       confidence: 0.9,  source: ["seed"] },
  { term: "action",        dialect: "singlish",      normalized_form: "show-off",                  confidence: 0.75, source: ["seed"] },
  { term: "alamak",        dialect: "bazaar-melayu", normalized_form: "oh no",                     confidence: 0.95, source: ["seed"] },
  { term: "best",          dialect: "singlish",      normalized_form: "great",                     confidence: 0.6,  source: ["seed"] },

  // ── Hokkien loanwords ─────────────────────────────────────────────────────────
  { term: "sian",          dialect: "hokkien",       normalized_form: "bored or tired",            confidence: 0.9,  source: ["seed"] },
  { term: "sian half",     dialect: "hokkien",       normalized_form: "very bored",                confidence: 0.9,  source: ["seed"] },
  { term: "shiok",         dialect: "hokkien",       normalized_form: "great or satisfying",       confidence: 0.95, source: ["seed"] },
  { term: "buay tahan",    dialect: "hokkien",       normalized_form: "cannot tolerate",           confidence: 0.95, source: ["seed"] },
  { term: "paiseh",        dialect: "hokkien",       normalized_form: "embarrassed or sorry",      confidence: 0.95, source: ["seed"] },
  { term: "kiasu",         dialect: "hokkien",       normalized_form: "afraid to lose out",        confidence: 1.0,  source: ["seed"] },
  { term: "kiasi",         dialect: "hokkien",       normalized_form: "afraid to die or coward",   confidence: 0.95, source: ["seed"] },
  { term: "boh liao",      dialect: "hokkien",       normalized_form: "nothing to do",             confidence: 0.9,  source: ["seed"] },
  { term: "gao dim",       dialect: "hokkien",       normalized_form: "settled done",              confidence: 0.85, source: ["seed"] },
  { term: "ka na sai",     dialect: "hokkien",       normalized_form: "bad luck",                  confidence: 0.85, source: ["seed"] },
  { term: "lim kopi",      dialect: "hokkien",       normalized_form: "have a chat or drink coffee", confidence: 0.9, source: ["seed"] },
  { term: "pang sai",      dialect: "hokkien",       normalized_form: "use toilet",                confidence: 0.85, source: ["seed"] },
  { term: "huat ah",       dialect: "hokkien",       normalized_form: "prosper",                   confidence: 0.9,  source: ["seed"] },
  { term: "simi",          dialect: "hokkien",       normalized_form: "what",                      confidence: 0.9,  source: ["seed"] },
  { term: "simi sai",      dialect: "hokkien",       normalized_form: "what is that",              confidence: 0.9,  source: ["seed"] },
  { term: "bo jio",        dialect: "hokkien",       normalized_form: "did not invite me",         confidence: 0.9,  source: ["seed"] },
  { term: "bo",            dialect: "hokkien",       normalized_form: "no or without",             confidence: 0.85, source: ["seed"] },
  { term: "bochup",        dialect: "hokkien",       normalized_form: "do not care",               confidence: 0.9,  source: ["seed"] },
  { term: "bo chup",       dialect: "hokkien",       normalized_form: "do not care",               confidence: 0.9,  source: ["seed"] },
  { term: "jialat",        dialect: "hokkien",       normalized_form: "serious trouble",           confidence: 0.95, source: ["seed"] },
  { term: "jia lat",       dialect: "hokkien",       normalized_form: "serious trouble",           confidence: 0.95, source: ["seed"] },
  { term: "chio",          dialect: "hokkien",       normalized_form: "pretty",                    confidence: 0.85, source: ["seed"] },
  { term: "pek chek",      dialect: "hokkien",       normalized_form: "frustrated or anxious",     confidence: 0.95, source: ["seed"] },
  { term: "pek cek",       dialect: "hokkien",       normalized_form: "frustrated or anxious",     confidence: 0.95, source: ["seed"] },
  { term: "limpeh",        dialect: "hokkien",       normalized_form: "I or me",                   confidence: 0.85, source: ["seed"] },
  { term: "goondu",        dialect: "hokkien",       normalized_form: "foolish person",            confidence: 0.9,  source: ["seed"] },
  { term: "kena",          dialect: "bazaar-melayu", normalized_form: "got or suffered",           confidence: 0.95, source: ["seed"] },
  { term: "kena sai",      dialect: "singlish",      normalized_form: "got into trouble",          confidence: 0.9,  source: ["seed"] },
  { term: "chao kuan",     dialect: "hokkien",       normalized_form: "smelly stingy person",      confidence: 0.85, source: ["seed"] },
  { term: "hong kan",      dialect: "hokkien",       normalized_form: "finished or ruined",        confidence: 0.85, source: ["seed"] },
  { term: "buay hiao bai", dialect: "hokkien",       normalized_form: "shameless",                 confidence: 0.9,  source: ["seed"] },
  { term: "tok kong",      dialect: "hokkien",       normalized_form: "outstanding or the best",   confidence: 0.9,  source: ["seed"] },
  { term: "angmo",         dialect: "hokkien",       normalized_form: "western person",            confidence: 0.95, source: ["seed"] },
  { term: "ang moh",       dialect: "hokkien",       normalized_form: "western person",            confidence: 0.95, source: ["seed"] },
  { term: "lau kui",       dialect: "hokkien",       normalized_form: "embarrassing",              confidence: 0.85, source: ["seed"] },
  { term: "mai tu liao",   dialect: "hokkien",       normalized_form: "do not delay anymore",      confidence: 0.9,  source: ["seed"] },
  { term: "bao toh",       dialect: "hokkien",       normalized_form: "betray or report someone",  confidence: 0.9,  source: ["seed"] },
  { term: "chope",         dialect: "singlish",      normalized_form: "reserve a seat",            confidence: 0.95, source: ["seed"] },
  { term: "sabo",          dialect: "singlish",      normalized_form: "sabotage",                  confidence: 0.95, source: ["seed"] },
  { term: "buay paiseh",   dialect: "hokkien",       normalized_form: "not embarrassed or shameless", confidence: 0.9, source: ["seed"] },

  // ── Cantonese loanwords ───────────────────────────────────────────────────────
  { term: "swee",          dialect: "cantonese",     normalized_form: "nice or good",              confidence: 0.9,  source: ["seed"] },
  { term: "gila",          dialect: "bazaar-melayu", normalized_form: "crazy",                     confidence: 0.9,  source: ["seed"] },
  { term: "yaya papaya",   dialect: "singlish",      normalized_form: "arrogant",                  confidence: 0.9,  source: ["seed"] },
  { term: "yaya",          dialect: "singlish",      normalized_form: "arrogant",                  confidence: 0.85, source: ["seed"] },
  { term: "tikam",         dialect: "bazaar-melayu", normalized_form: "gamble or guess",           confidence: 0.9,  source: ["seed"] },
  { term: "lepak",         dialect: "bazaar-melayu", normalized_form: "hang out and relax",        confidence: 0.95, source: ["seed"] },
  { term: "gostan",        dialect: "bazaar-melayu", normalized_form: "reverse or go back",        confidence: 0.9,  source: ["seed"] },
  { term: "wayang",        dialect: "bazaar-melayu", normalized_form: "pretend or put on a show",  confidence: 0.95, source: ["seed"] },
  { term: "cheem",         dialect: "hokkien",       normalized_form: "complicated or deep",       confidence: 0.95, source: ["seed"] },
  { term: "orh",           dialect: "singlish",      normalized_form: "I see",                     confidence: 0.85, source: ["seed"] },
  { term: "orh hor",       dialect: "singlish",      normalized_form: "caught or in trouble",      confidence: 0.9,  source: ["seed"] },
  { term: "habis",         dialect: "bazaar-melayu", normalized_form: "finished or done",          confidence: 0.9,  source: ["seed"] },
  { term: "boleh",         dialect: "bazaar-melayu", normalized_form: "can or possible",           confidence: 0.9,  source: ["seed"] },
  { term: "makan",         dialect: "bazaar-melayu", normalized_form: "eat",                       confidence: 0.95, source: ["seed"] },
  { term: "jalan",         dialect: "bazaar-melayu", normalized_form: "walk or go",                confidence: 0.9,  source: ["seed"] },
  { term: "bodoh",         dialect: "bazaar-melayu", normalized_form: "foolish",                   confidence: 0.85, source: ["seed"] },
  { term: "cepat",         dialect: "bazaar-melayu", normalized_form: "fast or hurry",             confidence: 0.9,  source: ["seed"] },
  { term: "susah",         dialect: "bazaar-melayu", normalized_form: "difficult",                 confidence: 0.9,  source: ["seed"] },
  { term: "senang",        dialect: "bazaar-melayu", normalized_form: "easy or comfortable",       confidence: 0.9,  source: ["seed"] },
  { term: "power",         dialect: "singlish",      normalized_form: "impressive or powerful",    confidence: 0.8,  source: ["seed"] },
  { term: "power one",     dialect: "singlish",      normalized_form: "very impressive",           confidence: 0.85, source: ["seed"] },

  // ── Bazaar Malay / colloquial Malay ───────────────────────────────────────────
  { term: "manyak",        dialect: "bazaar-melayu", normalized_form: "banyak or many",            confidence: 0.9,  source: ["seed"] },
  { term: "talak",         dialect: "bazaar-melayu", normalized_form: "tidak or no",               confidence: 0.9,  source: ["seed"] },
  { term: "tak boleh",     dialect: "bazaar-melayu", normalized_form: "cannot",                    confidence: 0.9,  source: ["seed"] },
  { term: "tak ada",       dialect: "bazaar-melayu", normalized_form: "no or do not have",         confidence: 0.9,  source: ["seed"] },
  { term: "tiada",         dialect: "bazaar-melayu", normalized_form: "no or none",                confidence: 0.85, source: ["seed"] },
  { term: "mana boleh",    dialect: "bazaar-melayu", normalized_form: "how is that possible",      confidence: 0.9,  source: ["seed"] },
  { term: "ingat",         dialect: "bazaar-melayu", normalized_form: "remember",                  confidence: 0.85, source: ["seed"] },
  { term: "paham",         dialect: "bazaar-melayu", normalized_form: "understand",                confidence: 0.85, source: ["seed"] },
  { term: "faham",         dialect: "bazaar-melayu", normalized_form: "understand",                confidence: 0.85, source: ["seed"] },
  { term: "bayar",         dialect: "bazaar-melayu", normalized_form: "pay",                       confidence: 0.9,  source: ["seed"] },
  { term: "duit",          dialect: "bazaar-melayu", normalized_form: "money",                     confidence: 0.9,  source: ["seed"] },
  { term: "kerja",         dialect: "bazaar-melayu", normalized_form: "work",                      confidence: 0.9,  source: ["seed"] },
  { term: "gaji",          dialect: "bazaar-melayu", normalized_form: "salary",                    confidence: 0.95, source: ["seed"] },
  { term: "simpan",        dialect: "bazaar-melayu", normalized_form: "save or keep",              confidence: 0.9,  source: ["seed"] },
  { term: "tolong",        dialect: "bazaar-melayu", normalized_form: "please help",               confidence: 0.9,  source: ["seed"] },
  { term: "tanya",         dialect: "bazaar-melayu", normalized_form: "ask",                       confidence: 0.85, source: ["seed"] },
  { term: "tahu",          dialect: "bazaar-melayu", normalized_form: "know",                      confidence: 0.85, source: ["seed"] },
  { term: "macam mana",    dialect: "bazaar-melayu", normalized_form: "how or what should I do",   confidence: 0.95, source: ["seed"] },
  { term: "macam",         dialect: "bazaar-melayu", normalized_form: "like or as if",             confidence: 0.8,  source: ["seed"] },
  { term: "sekarang",      dialect: "bazaar-melayu", normalized_form: "now",                       confidence: 0.9,  source: ["seed"] },
  { term: "bila",          dialect: "bazaar-melayu", normalized_form: "when",                      confidence: 0.85, source: ["seed"] },
  { term: "berapa",        dialect: "bazaar-melayu", normalized_form: "how much",                  confidence: 0.9,  source: ["seed"] },
  { term: "wang",          dialect: "bazaar-melayu", normalized_form: "money",                     confidence: 0.85, source: ["seed"] },
  { term: "cabut",         dialect: "bazaar-melayu", normalized_form: "leave or run away",         confidence: 0.85, source: ["seed"] },
  { term: "potong",        dialect: "bazaar-melayu", normalized_form: "cut or deduct",             confidence: 0.85, source: ["seed"] },

  // ── Spoken Tamil (Singaporean variety) ───────────────────────────────────────
  { term: "romba",         dialect: "spoken-tamil",  normalized_form: "very much",                 confidence: 0.9,  source: ["seed"] },
  { term: "sollu",         dialect: "spoken-tamil",  normalized_form: "tell me",                   confidence: 0.9,  source: ["seed"] },
  { term: "enna",          dialect: "spoken-tamil",  normalized_form: "what",                      confidence: 0.9,  source: ["seed"] },
  { term: "enna achu",     dialect: "spoken-tamil",  normalized_form: "what happened",             confidence: 0.9,  source: ["seed"] },
  { term: "seri",          dialect: "spoken-tamil",  normalized_form: "ok or fine",                confidence: 0.9,  source: ["seed"] },
  { term: "theriyum",      dialect: "spoken-tamil",  normalized_form: "I know",                    confidence: 0.85, source: ["seed"] },
  { term: "theriyaathu",   dialect: "spoken-tamil",  normalized_form: "I do not know",             confidence: 0.85, source: ["seed"] },
  { term: "puriyala",      dialect: "spoken-tamil",  normalized_form: "I do not understand",       confidence: 0.85, source: ["seed"] },
  { term: "paesu",         dialect: "spoken-tamil",  normalized_form: "speak or tell",             confidence: 0.85, source: ["seed"] },
  { term: "vaanga",        dialect: "spoken-tamil",  normalized_form: "please come",               confidence: 0.85, source: ["seed"] },
  { term: "epdi",          dialect: "spoken-tamil",  normalized_form: "how",                       confidence: 0.85, source: ["seed"] },
  { term: "evlo",          dialect: "spoken-tamil",  normalized_form: "how much",                  confidence: 0.9,  source: ["seed"] },
  { term: "kadaisi",       dialect: "spoken-tamil",  normalized_form: "last or finally",           confidence: 0.85, source: ["seed"] },
  { term: "mukkiyam",      dialect: "spoken-tamil",  normalized_form: "important",                 confidence: 0.85, source: ["seed"] },
  { term: "paisa",         dialect: "spoken-tamil",  normalized_form: "money",                     confidence: 0.9,  source: ["seed"] },
  { term: "kedaikku",      dialect: "spoken-tamil",  normalized_form: "to the office or place",    confidence: 0.8,  source: ["seed"] },
  { term: "enga",          dialect: "spoken-tamil",  normalized_form: "where",                     confidence: 0.85, source: ["seed"] },
  { term: "enkitta",       dialect: "spoken-tamil",  normalized_form: "with me or from me",        confidence: 0.85, source: ["seed"] },

  // ── CPF-specific colloquial phrasings ─────────────────────────────────────────
  // These map casual ways users refer to CPF accounts and services
  { term: "cpf money",     dialect: "singlish",      normalized_form: "CPF savings",               confidence: 0.95, source: ["seed"] },
  { term: "my cpf",        dialect: "singlish",      normalized_form: "my CPF account",            confidence: 0.95, source: ["seed"] },
  { term: "retirement money", dialect: "singlish",   normalized_form: "CPF retirement savings",    confidence: 0.95, source: ["seed"] },
  { term: "medisave money", dialect: "singlish",     normalized_form: "MediSave balance",          confidence: 0.95, source: ["seed"] },
  { term: "cpf top up",    dialect: "singlish",      normalized_form: "CPF voluntary top-up",      confidence: 0.95, source: ["seed"] },
  { term: "top up cpf",    dialect: "singlish",      normalized_form: "CPF voluntary top-up",      confidence: 0.95, source: ["seed"] },
  { term: "cpf take out",  dialect: "singlish",      normalized_form: "CPF withdrawal",            confidence: 0.95, source: ["seed"] },
  { term: "take out cpf",  dialect: "singlish",      normalized_form: "CPF withdrawal",            confidence: 0.95, source: ["seed"] },
  { term: "withdraw cpf",  dialect: "singlish",      normalized_form: "CPF withdrawal",            confidence: 0.95, source: ["seed"] },
  { term: "cpf payout",    dialect: "singlish",      normalized_form: "CPF monthly payout",        confidence: 0.95, source: ["seed"] },
  { term: "how much cpf",  dialect: "singlish",      normalized_form: "CPF balance enquiry",       confidence: 0.95, source: ["seed"] },
  { term: "cpf enough or not", dialect: "singlish",  normalized_form: "is my CPF sufficient",      confidence: 0.95, source: ["seed"] },
  { term: "cpf not enough", dialect: "singlish",     normalized_form: "insufficient CPF savings",  confidence: 0.95, source: ["seed"] },
  { term: "use cpf for house", dialect: "singlish",  normalized_form: "use CPF for housing",       confidence: 0.95, source: ["seed"] },
  { term: "use cpf buy flat", dialect: "singlish",   normalized_form: "use CPF to buy HDB flat",   confidence: 0.95, source: ["seed"] },
  { term: "55 already can take", dialect: "singlish", normalized_form: "can withdraw CPF at age 55", confidence: 0.9, source: ["seed"] },
  { term: "55 take out cpf", dialect: "singlish",    normalized_form: "CPF withdrawal at age 55",  confidence: 0.95, source: ["seed"] },
  { term: "special account interest", dialect: "singlish", normalized_form: "CPF Special Account interest rate", confidence: 0.9, source: ["seed"] },
  { term: "oa sa",         dialect: "singlish",      normalized_form: "Ordinary Account Special Account", confidence: 0.9, source: ["seed"] },
  { term: "retirement sum",dialect: "singlish",      normalized_form: "CPF retirement sum",        confidence: 0.9,  source: ["seed"] },
  { term: "brs frs ers",   dialect: "singlish",      normalized_form: "Basic Full Enhanced Retirement Sum", confidence: 0.9, source: ["seed"] },
  { term: "cpf life payout", dialect: "singlish",    normalized_form: "CPF LIFE monthly payout",   confidence: 0.95, source: ["seed"] },
  { term: "nominate cpf",  dialect: "singlish",      normalized_form: "CPF nomination",            confidence: 0.95, source: ["seed"] },
  { term: "cpf nominee",   dialect: "singlish",      normalized_form: "CPF nomination beneficiary", confidence: 0.95, source: ["seed"] },
  { term: "after die cpf", dialect: "singlish",      normalized_form: "CPF after death nomination", confidence: 0.9, source: ["seed"] },
  { term: "cpf die already", dialect: "singlish",    normalized_form: "CPF after death",           confidence: 0.9,  source: ["seed"] },
  { term: "employer cpf",  dialect: "singlish",      normalized_form: "employer CPF contribution", confidence: 0.95, source: ["seed"] },
  { term: "boss cpf",      dialect: "singlish",      normalized_form: "employer CPF contribution", confidence: 0.9,  source: ["seed"] },
  { term: "cpf cut",       dialect: "singlish",      normalized_form: "CPF deduction from salary", confidence: 0.9,  source: ["seed"] },
  { term: "cpf deduct",    dialect: "singlish",      normalized_form: "CPF salary deduction",      confidence: 0.9,  source: ["seed"] },
  { term: "cpf singapore", dialect: "singlish",      normalized_form: "CPF Board Singapore",       confidence: 0.8,  source: ["seed"] },
  { term: "cpf board",     dialect: "singlish",      normalized_form: "CPF Board",                 confidence: 0.85, source: ["seed"] },
  { term: "singpass login cpf", dialect: "singlish", normalized_form: "login to CPF with SingPass", confidence: 0.95, source: ["seed"] },
  { term: "check cpf singpass", dialect: "singlish", normalized_form: "check CPF balance via SingPass", confidence: 0.95, source: ["seed"] },
  { term: "cpf got bonus", dialect: "singlish",      normalized_form: "CPF interest or bonus",     confidence: 0.9,  source: ["seed"] },
  { term: "cpf interest rate", dialect: "singlish",  normalized_form: "CPF account interest rate", confidence: 0.95, source: ["seed"] },
  { term: "hdb cpf",       dialect: "singlish",      normalized_form: "use CPF for HDB flat",      confidence: 0.95, source: ["seed"] },
  { term: "medisave use",  dialect: "singlish",      normalized_form: "use MediSave",              confidence: 0.9,  source: ["seed"] },
  { term: "medisave top up", dialect: "singlish",    normalized_form: "top up MediSave",           confidence: 0.95, source: ["seed"] },
  { term: "workfare",      dialect: "singlish",      normalized_form: "Workfare Income Supplement", confidence: 0.9, source: ["seed"] },
  { term: "silver support", dialect: "singlish",     normalized_form: "Silver Support Scheme",     confidence: 0.9,  source: ["seed"] },
  { term: "matched retirement", dialect: "singlish", normalized_form: "Matched Retirement Savings Scheme", confidence: 0.9, source: ["seed"] },
  { term: "careshield",    dialect: "singlish",      normalized_form: "CareShield Life",           confidence: 0.9,  source: ["seed"] },
  { term: "medishield",    dialect: "singlish",      normalized_form: "MediShield Life",           confidence: 0.9,  source: ["seed"] },
  { term: "eldershield",   dialect: "singlish",      normalized_form: "ElderShield disability insurance", confidence: 0.9, source: ["seed"] },
  { term: "cpf investment", dialect: "singlish",     normalized_form: "CPF Investment Scheme",     confidence: 0.9,  source: ["seed"] },
  { term: "cpfis",         dialect: "singlish",      normalized_form: "CPF Investment Scheme",     confidence: 0.95, source: ["seed"] },
  { term: "rstu",          dialect: "singlish",      normalized_form: "Retirement Sum Topping-Up Scheme", confidence: 0.95, source: ["seed"] },
  { term: "bhs",           dialect: "singlish",      normalized_form: "Basic Healthcare Sum MediSave", confidence: 0.95, source: ["seed"] },
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? "pulse";

  if (!uri) {
    console.error("MONGODB_URI not set in environment");
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    console.log(`Connected to MongoDB — database: pulse_tools`);

    const col = client.db("pulse_tools").collection("slang_dictionary");
    const existing = await col.countDocuments();
    console.log(`Existing slang entries: ${existing}`);

    // Upsert by term to avoid duplicates on re-runs
    let inserted = 0;
    let updated = 0;
    for (const entry of SLANG_DATA) {
      const result = await col.updateOne(
        { term: entry.term },
        { $set: entry },
        { upsert: true },
      );
      if (result.upsertedCount > 0) inserted++;
      else if (result.modifiedCount > 0) updated++;
    }

    const total = await col.countDocuments();
    console.log(`Done — inserted: ${inserted}, updated: ${updated}, total: ${total}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
