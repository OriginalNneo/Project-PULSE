/**
 * Comprehensive slang seed — covers all languages the PULSE agent supports.
 * Skips any term that already exists (upsert by term+dialect).
 *
 * Dialects / languages covered:
 *   singlish      – Singapore colloquial English particles and phrases
 *   hokkien       – additional entries (CPF / finance / life events)
 *   teochew       – expanded
 *   cantonese     – expanded
 *   hakka         – expanded
 *   hainanese     – new
 *   bazaar-malay  – informal / rojak Malay used across communities
 *   malay         – additional entries
 *   tamil         – additional entries (Singapore Tamil community)
 *   hindi         – Singapore Indian community (Hindi as lingua franca)
 *   malayalam     – Kerala community in Singapore
 *   punjabi       – Punjabi community in Singapore
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

const SOURCE = ["curated-2026-multilang"];

const ENTRIES: SlangEntry[] = [

  // ── SINGLISH (Singapore Colloquial English) ───────────────────────────────
  // Particles
  { term: "lah", dialect: "singlish", normalized_form: "sentence-final particle expressing assertion or emphasis", confidence: 0.99, source: SOURCE },
  { term: "leh", dialect: "singlish", normalized_form: "sentence-final particle expressing mild protest or seeking agreement", confidence: 0.99, source: SOURCE },
  { term: "loh", dialect: "singlish", normalized_form: "sentence-final particle expressing resignation or obviousness", confidence: 0.99, source: SOURCE },
  { term: "lor", dialect: "singlish", normalized_form: "particle expressing acceptance or obvious conclusion", confidence: 0.98, source: SOURCE },
  { term: "mah", dialect: "singlish", normalized_form: "particle asserting something is obvious", confidence: 0.97, source: SOURCE },
  { term: "hor", dialect: "singlish", normalized_form: "particle seeking agreement or confirmation", confidence: 0.97, source: SOURCE },
  { term: "sia", dialect: "singlish", normalized_form: "exclamation expressing surprise or emphasis", confidence: 0.95, source: SOURCE },
  { term: "boh", dialect: "singlish", normalized_form: "question particle meaning 'or not' or 'right?'", confidence: 0.95, source: SOURCE },
  { term: "what", dialect: "singlish", normalized_form: "sentence-final particle expressing mild protest", confidence: 0.90, source: SOURCE },
  // Common phrases
  { term: "can or not", dialect: "singlish", normalized_form: "is it possible or not", confidence: 0.98, source: SOURCE },
  { term: "can anot", dialect: "singlish", normalized_form: "is it possible or not", confidence: 0.95, source: SOURCE },
  { term: "steady lah", dialect: "singlish", normalized_form: "great or well done", confidence: 0.95, source: SOURCE },
  { term: "chope", dialect: "singlish", normalized_form: "reserve or save a seat or spot", confidence: 0.95, source: SOURCE },
  { term: "shiok", dialect: "singlish", normalized_form: "feels great or delicious or satisfying", confidence: 0.95, source: SOURCE },
  { term: "bojio", dialect: "singlish", normalized_form: "did not invite me", confidence: 0.95, source: SOURCE },
  { term: "blur", dialect: "singlish", normalized_form: "confused or clueless", confidence: 0.92, source: SOURCE },
  { term: "blur like sotong", dialect: "singlish", normalized_form: "very confused or clueless", confidence: 0.92, source: SOURCE },
  { term: "last time", dialect: "singlish", normalized_form: "in the past or previously", confidence: 0.88, source: SOURCE },
  { term: "one kind", dialect: "singlish", normalized_form: "strange or unusual", confidence: 0.88, source: SOURCE },
  { term: "action", dialect: "singlish", normalized_form: "show off or pretentious", confidence: 0.88, source: SOURCE },
  { term: "act blur", dialect: "singlish", normalized_form: "pretend not to know", confidence: 0.90, source: SOURCE },
  { term: "kaypoh", dialect: "singlish", normalized_form: "nosy or busybody", confidence: 0.93, source: SOURCE },
  { term: "kaypoh-ness", dialect: "singlish", normalized_form: "nosiness or being a busybody", confidence: 0.88, source: SOURCE },
  { term: "kena", dialect: "singlish", normalized_form: "got or suffered or was subjected to", confidence: 0.95, source: SOURCE },
  { term: "kena sai", dialect: "singlish", normalized_form: "in deep trouble", confidence: 0.88, source: SOURCE },
  { term: "kia su", dialect: "singlish", normalized_form: "afraid to lose or highly competitive", confidence: 0.95, source: SOURCE },
  { term: "kiasu", dialect: "singlish", normalized_form: "afraid to lose or highly competitive", confidence: 0.95, source: SOURCE },
  { term: "kiasi", dialect: "singlish", normalized_form: "afraid to die or overly cautious", confidence: 0.92, source: SOURCE },
  { term: "chao kuan", dialect: "singlish", normalized_form: "very stingy or miserly", confidence: 0.88, source: SOURCE },
  { term: "goondu", dialect: "singlish", normalized_form: "stupid or foolish person", confidence: 0.88, source: SOURCE },
  { term: "ownself check ownself", dialect: "singlish", normalized_form: "self-audit or self-regulation", confidence: 0.88, source: SOURCE },
  { term: "where got", dialect: "singlish", normalized_form: "how is that possible or that is not true", confidence: 0.92, source: SOURCE },
  { term: "how can", dialect: "singlish", normalized_form: "how is that acceptable or that is wrong", confidence: 0.90, source: SOURCE },
  { term: "die die must", dialect: "singlish", normalized_form: "absolutely must or by all means must", confidence: 0.90, source: SOURCE },
  { term: "liddat", dialect: "singlish", normalized_form: "like that", confidence: 0.92, source: SOURCE },
  { term: "liddat one", dialect: "singlish", normalized_form: "it is just like that", confidence: 0.90, source: SOURCE },
  { term: "maciam", dialect: "singlish", normalized_form: "like or as if", confidence: 0.90, source: SOURCE },
  { term: "macam", dialect: "singlish", normalized_form: "like or as if", confidence: 0.92, source: SOURCE },
  { term: "confirm plus chop", dialect: "singlish", normalized_form: "absolutely certain", confidence: 0.90, source: SOURCE },
  { term: "simi", dialect: "singlish", normalized_form: "what", confidence: 0.90, source: SOURCE },
  { term: "simi sai", dialect: "singlish", normalized_form: "what nonsense or what is this", confidence: 0.88, source: SOURCE },
  { term: "tahan", dialect: "singlish", normalized_form: "endure or tolerate", confidence: 0.90, source: SOURCE },
  { term: "atas", dialect: "singlish", normalized_form: "high class or snobbish", confidence: 0.90, source: SOURCE },
  { term: "skali", dialect: "singlish", normalized_form: "maybe or what if", confidence: 0.88, source: SOURCE },
  { term: "sekali", dialect: "singlish", normalized_form: "maybe or suddenly", confidence: 0.88, source: SOURCE },
  { term: "sabo", dialect: "singlish", normalized_form: "sabotage or get someone into trouble", confidence: 0.90, source: SOURCE },
  { term: "jialat", dialect: "singlish", normalized_form: "serious trouble or very bad situation", confidence: 0.92, source: SOURCE },
  { term: "jia lat", dialect: "singlish", normalized_form: "very serious or very bad", confidence: 0.92, source: SOURCE },
  { term: "lobang", dialect: "singlish", normalized_form: "good deal or inside tip or opportunity", confidence: 0.90, source: SOURCE },
  { term: "steady pom pee pee", dialect: "singlish", normalized_form: "very stable or very reliable", confidence: 0.85, source: SOURCE },
  // CPF / finance Singlish
  { term: "draw down", dialect: "singlish", normalized_form: "withdraw from CPF or use savings", confidence: 0.88, source: SOURCE },
  { term: "top up", dialect: "singlish", normalized_form: "add money to CPF or savings account", confidence: 0.90, source: SOURCE },
  { term: "medisave leh", dialect: "singlish", normalized_form: "what about my MediSave account", confidence: 0.88, source: SOURCE },
  { term: "cpf enough anot", dialect: "singlish", normalized_form: "is my CPF sufficient", confidence: 0.88, source: SOURCE },
  { term: "retire liao", dialect: "singlish", normalized_form: "already retired", confidence: 0.90, source: SOURCE },
  { term: "kena retrench", dialect: "singlish", normalized_form: "was retrenched or laid off", confidence: 0.90, source: SOURCE },
  { term: "buy flat use cpf", dialect: "singlish", normalized_form: "purchase HDB using CPF funds", confidence: 0.90, source: SOURCE },
  { term: "payout start liao", dialect: "singlish", normalized_form: "CPF monthly payout has started", confidence: 0.88, source: SOURCE },

  // ── HOKKIEN (additional — finance, CPF, life events) ─────────────────────
  { term: "boh kang zuay", dialect: "hokkien", normalized_form: "no work anymore or out of a job", confidence: 0.88, source: SOURCE },
  { term: "kio pang", dialect: "hokkien", normalized_form: "ask for help", confidence: 0.85, source: SOURCE },
  { term: "tiok pian", dialect: "hokkien", normalized_form: "get cheated or scammed", confidence: 0.88, source: SOURCE },
  { term: "boh mia", dialect: "hokkien", normalized_form: "no life or dying", confidence: 0.85, source: SOURCE },
  { term: "tuak lui", dialect: "hokkien", normalized_form: "withdraw money", confidence: 0.90, source: SOURCE },
  { term: "cun lui", dialect: "hokkien", normalized_form: "save money", confidence: 0.88, source: SOURCE },
  { term: "pang lui", dialect: "hokkien", normalized_form: "lend money or release money", confidence: 0.88, source: SOURCE },
  { term: "boh cheng hu", dialect: "hokkien", normalized_form: "no government support", confidence: 0.85, source: SOURCE },
  { term: "cheng hu pang lui", dialect: "hokkien", normalized_form: "government gives money or grant", confidence: 0.88, source: SOURCE },
  { term: "lau liao", dialect: "hokkien", normalized_form: "old already", confidence: 0.90, source: SOURCE },
  { term: "chao lao", dialect: "hokkien", normalized_form: "very old", confidence: 0.88, source: SOURCE },
  { term: "si liao", dialect: "hokkien", normalized_form: "dead already or finished", confidence: 0.85, source: SOURCE },
  { term: "ua boh lui", dialect: "hokkien", normalized_form: "I have no money", confidence: 0.90, source: SOURCE },
  { term: "boh lui boh peng", dialect: "hokkien", normalized_form: "no money no rights", confidence: 0.85, source: SOURCE },
  { term: "long long", dialect: "hokkien", normalized_form: "long time", confidence: 0.85, source: SOURCE },
  { term: "chak tio", dialect: "hokkien", normalized_form: "checked or confirmed", confidence: 0.85, source: SOURCE },
  { term: "boh song", dialect: "hokkien", normalized_form: "unhappy or dissatisfied", confidence: 0.88, source: SOURCE },
  { term: "boh tai ji", dialect: "hokkien", normalized_form: "no big deal or nothing serious", confidence: 0.85, source: SOURCE },
  { term: "gao lat", dialect: "hokkien", normalized_form: "very powerful or serious", confidence: 0.85, source: SOURCE },
  { term: "sibeh", dialect: "hokkien", normalized_form: "very or extremely", confidence: 0.90, source: SOURCE },
  { term: "si beh", dialect: "hokkien", normalized_form: "very or extremely", confidence: 0.90, source: SOURCE },
  { term: "sibeh jia lat", dialect: "hokkien", normalized_form: "extremely bad or terrible situation", confidence: 0.88, source: SOURCE },
  { term: "boh bian", dialect: "hokkien", normalized_form: "no choice or cannot help it", confidence: 0.90, source: SOURCE },
  { term: "tio kena", dialect: "hokkien", normalized_form: "got hit or suffered", confidence: 0.85, source: SOURCE },
  { term: "zun boh", dialect: "hokkien", normalized_form: "is that correct or true", confidence: 0.85, source: SOURCE },
  { term: "buay zai", dialect: "hokkien", normalized_form: "do not know", confidence: 0.88, source: SOURCE },
  { term: "ah lao", dialect: "hokkien", normalized_form: "old person", confidence: 0.88, source: SOURCE },

  // ── TEOCHEW (expanded) ────────────────────────────────────────────────────
  { term: "bak", dialect: "teochew", normalized_form: "know or understand", confidence: 0.85, source: SOURCE },
  { term: "bak pai", dialect: "teochew", normalized_form: "embarrassed or shy", confidence: 0.85, source: SOURCE },
  { term: "mo lui", dialect: "teochew", normalized_form: "no money", confidence: 0.88, source: SOURCE },
  { term: "yao lui", dialect: "teochew", normalized_form: "have money", confidence: 0.88, source: SOURCE },
  { term: "ke lang", dialect: "teochew", normalized_form: "guest or outsider", confidence: 0.83, source: SOURCE },
  { term: "boi", dialect: "teochew", normalized_form: "cannot or not possible", confidence: 0.85, source: SOURCE },
  { term: "ai", dialect: "teochew", normalized_form: "want or need", confidence: 0.85, source: SOURCE },
  { term: "mai", dialect: "teochew", normalized_form: "do not want or do not", confidence: 0.85, source: SOURCE },
  { term: "sik pa", dialect: "teochew", normalized_form: "eaten full", confidence: 0.85, source: SOURCE },
  { term: "khik", dialect: "teochew", normalized_form: "eat", confidence: 0.83, source: SOURCE },
  { term: "boi bak", dialect: "teochew", normalized_form: "does not know", confidence: 0.83, source: SOURCE },
  { term: "ka ki", dialect: "teochew", normalized_form: "self or oneself", confidence: 0.85, source: SOURCE },
  { term: "png", dialect: "teochew", normalized_form: "rice or meal", confidence: 0.83, source: SOURCE },
  { term: "lao beh kia", dialect: "teochew", normalized_form: "old father's son or close family", confidence: 0.83, source: SOURCE },
  { term: "si mi", dialect: "teochew", normalized_form: "what is it", confidence: 0.85, source: SOURCE },
  { term: "gua", dialect: "teochew", normalized_form: "I or me", confidence: 0.85, source: SOURCE },
  { term: "li", dialect: "teochew", normalized_form: "you", confidence: 0.83, source: SOURCE },
  { term: "in", dialect: "teochew", normalized_form: "they or them", confidence: 0.83, source: SOURCE },
  { term: "chiak pah boh", dialect: "teochew", normalized_form: "have you eaten", confidence: 0.85, source: SOURCE },
  { term: "peh kia", dialect: "teochew", normalized_form: "child or young person", confidence: 0.83, source: SOURCE },
  { term: "ah gong", dialect: "teochew", normalized_form: "grandfather", confidence: 0.88, source: SOURCE },
  { term: "ah ma", dialect: "teochew", normalized_form: "grandmother", confidence: 0.88, source: SOURCE },

  // ── CANTONESE (expanded) ──────────────────────────────────────────────────
  { term: "ho lah", dialect: "cantonese", normalized_form: "okay or agreed", confidence: 0.88, source: SOURCE },
  { term: "gam yeung", dialect: "cantonese", normalized_form: "like that or in that way", confidence: 0.85, source: SOURCE },
  { term: "hai ah", dialect: "cantonese", normalized_form: "yes that is right", confidence: 0.88, source: SOURCE },
  { term: "m hai", dialect: "cantonese", normalized_form: "no or it is not", confidence: 0.88, source: SOURCE },
  { term: "gau dim", dialect: "cantonese", normalized_form: "settled or done", confidence: 0.88, source: SOURCE },
  { term: "hou gwai", dialect: "cantonese", normalized_form: "very expensive", confidence: 0.88, source: SOURCE },
  { term: "peng gwai", dialect: "cantonese", normalized_form: "cheap", confidence: 0.85, source: SOURCE },
  { term: "hou leng", dialect: "cantonese", normalized_form: "very nice or beautiful", confidence: 0.85, source: SOURCE },
  { term: "dak", dialect: "cantonese", normalized_form: "can or okay", confidence: 0.85, source: SOURCE },
  { term: "m dak", dialect: "cantonese", normalized_form: "cannot", confidence: 0.85, source: SOURCE },
  { term: "gei do chin", dialect: "cantonese", normalized_form: "how much money", confidence: 0.88, source: SOURCE },
  { term: "ho do chin", dialect: "cantonese", normalized_form: "a lot of money", confidence: 0.88, source: SOURCE },
  { term: "mou chin", dialect: "cantonese", normalized_form: "no money", confidence: 0.90, source: SOURCE },
  { term: "sau chin", dialect: "cantonese", normalized_form: "collect money or receive payment", confidence: 0.88, source: SOURCE },
  { term: "fong chin", dialect: "cantonese", normalized_form: "lend money or release payment", confidence: 0.85, source: SOURCE },
  { term: "gwai lo", dialect: "cantonese", normalized_form: "foreigner or westerner", confidence: 0.85, source: SOURCE },
  { term: "siu je", dialect: "cantonese", normalized_form: "young woman or miss", confidence: 0.83, source: SOURCE },
  { term: "lo gung", dialect: "cantonese", normalized_form: "husband", confidence: 0.85, source: SOURCE },
  { term: "lo po", dialect: "cantonese", normalized_form: "wife", confidence: 0.85, source: SOURCE },
  { term: "lo dau", dialect: "cantonese", normalized_form: "boss or head", confidence: 0.85, source: SOURCE },
  { term: "tong si", dialect: "cantonese", normalized_form: "colleague or workmate", confidence: 0.85, source: SOURCE },
  { term: "gong yeh", dialect: "cantonese", normalized_form: "work or doing work", confidence: 0.85, source: SOURCE },
  { term: "gong mat", dialect: "cantonese", normalized_form: "what are you saying", confidence: 0.83, source: SOURCE },
  { term: "ting dak mou", dialect: "cantonese", normalized_form: "do you understand or can you hear", confidence: 0.83, source: SOURCE },
  { term: "m ming", dialect: "cantonese", normalized_form: "do not understand", confidence: 0.85, source: SOURCE },
  { term: "lao yeh", dialect: "cantonese", normalized_form: "grandfather or old man", confidence: 0.85, source: SOURCE },
  { term: "lao tai", dialect: "cantonese", normalized_form: "grandmother or old woman", confidence: 0.85, source: SOURCE },
  { term: "bak bak", dialect: "cantonese", normalized_form: "paternal uncle", confidence: 0.83, source: SOURCE },
  { term: "so", dialect: "cantonese", normalized_form: "aunty or older woman", confidence: 0.83, source: SOURCE },
  { term: "tui yau", dialect: "cantonese", normalized_form: "retired or retirement", confidence: 0.88, source: SOURCE },
  { term: "tui sau", dialect: "cantonese", normalized_form: "retire from work", confidence: 0.88, source: SOURCE },
  { term: "sau lei", dialect: "cantonese", normalized_form: "receive benefits or payout", confidence: 0.85, source: SOURCE },
  { term: "chuk fuk", dialect: "cantonese", normalized_form: "good fortune or blessing", confidence: 0.83, source: SOURCE },
  { term: "yat yuet", dialect: "cantonese", normalized_form: "one month", confidence: 0.85, source: SOURCE },
  { term: "mui yuet", dialect: "cantonese", normalized_form: "every month", confidence: 0.85, source: SOURCE },

  // ── HAKKA (expanded) ──────────────────────────────────────────────────────
  { term: "nga", dialect: "hakka", normalized_form: "I or me", confidence: 0.85, source: SOURCE },
  { term: "ngi", dialect: "hakka", normalized_form: "you", confidence: 0.83, source: SOURCE },
  { term: "ki", dialect: "hakka", normalized_form: "go or go to", confidence: 0.83, source: SOURCE },
  { term: "mo chin", dialect: "hakka", normalized_form: "no money", confidence: 0.88, source: SOURCE },
  { term: "yeu chin", dialect: "hakka", normalized_form: "have money", confidence: 0.88, source: SOURCE },
  { term: "ngen", dialect: "hakka", normalized_form: "silver or money", confidence: 0.85, source: SOURCE },
  { term: "fu", dialect: "hakka", normalized_form: "rich or wealthy", confidence: 0.85, source: SOURCE },
  { term: "hong", dialect: "hakka", normalized_form: "house or building", confidence: 0.83, source: SOURCE },
  { term: "kuk", dialect: "hakka", normalized_form: "bank or treasury", confidence: 0.83, source: SOURCE },
  { term: "lau yah", dialect: "hakka", normalized_form: "old man or grandfather", confidence: 0.85, source: SOURCE },
  { term: "lau me", dialect: "hakka", normalized_form: "old mother or grandmother", confidence: 0.85, source: SOURCE },
  { term: "a gung", dialect: "hakka", normalized_form: "grandfather", confidence: 0.85, source: SOURCE },
  { term: "a pho", dialect: "hakka", normalized_form: "grandmother", confidence: 0.85, source: SOURCE },
  { term: "a pa", dialect: "hakka", normalized_form: "father", confidence: 0.85, source: SOURCE },
  { term: "a ma", dialect: "hakka", normalized_form: "mother", confidence: 0.85, source: SOURCE },
  { term: "muk", dialect: "hakka", normalized_form: "eye or vision", confidence: 0.80, source: SOURCE },
  { term: "piang", dialect: "hakka", normalized_form: "sick or ill", confidence: 0.83, source: SOURCE },
  { term: "fong", dialect: "hakka", normalized_form: "room or ward", confidence: 0.80, source: SOURCE },
  { term: "siang", dialect: "hakka", normalized_form: "think or consider", confidence: 0.80, source: SOURCE },
  { term: "m tung", dialect: "hakka", normalized_form: "do not understand", confidence: 0.83, source: SOURCE },
  { term: "tung", dialect: "hakka", normalized_form: "understand", confidence: 0.83, source: SOURCE },
  { term: "sun li", dialect: "hakka", normalized_form: "monthly income or salary", confidence: 0.83, source: SOURCE },
  { term: "theu ngin", dialect: "hakka", normalized_form: "elder or old person", confidence: 0.83, source: SOURCE },

  // ── HAINANESE ────────────────────────────────────────────────────────────
  { term: "kia", dialect: "hainanese", normalized_form: "go or child or person", confidence: 0.83, source: SOURCE },
  { term: "loh", dialect: "hainanese", normalized_form: "inside or in", confidence: 0.80, source: SOURCE },
  { term: "bwoh", dialect: "hainanese", normalized_form: "no or not", confidence: 0.80, source: SOURCE },
  { term: "bwoh lui", dialect: "hainanese", normalized_form: "no money", confidence: 0.83, source: SOURCE },
  { term: "yoh lui", dialect: "hainanese", normalized_form: "have money", confidence: 0.83, source: SOURCE },
  { term: "chiak", dialect: "hainanese", normalized_form: "eat", confidence: 0.83, source: SOURCE },
  { term: "chiak ba", dialect: "hainanese", normalized_form: "eaten full", confidence: 0.83, source: SOURCE },
  { term: "lao nang", dialect: "hainanese", normalized_form: "old person", confidence: 0.85, source: SOURCE },
  { term: "lao peh", dialect: "hainanese", normalized_form: "old father or grandfather", confidence: 0.83, source: SOURCE },
  { term: "ah kong", dialect: "hainanese", normalized_form: "grandfather", confidence: 0.85, source: SOURCE },
  { term: "ah ma", dialect: "hainanese", normalized_form: "grandmother", confidence: 0.85, source: SOURCE },
  { term: "siow", dialect: "hainanese", normalized_form: "crazy", confidence: 0.83, source: SOURCE },
  { term: "hoq", dialect: "hainanese", normalized_form: "good", confidence: 0.80, source: SOURCE },
  { term: "bwoh hoq", dialect: "hainanese", normalized_form: "not good", confidence: 0.80, source: SOURCE },
  { term: "chin chiu", dialect: "hainanese", normalized_form: "very cheap", confidence: 0.80, source: SOURCE },
  { term: "phan kwi", dialect: "hainanese", normalized_form: "expensive", confidence: 0.80, source: SOURCE },
  { term: "siang", dialect: "hainanese", normalized_form: "think or want", confidence: 0.80, source: SOURCE },
  { term: "bwoh siang", dialect: "hainanese", normalized_form: "do not want", confidence: 0.80, source: SOURCE },
  { term: "tong", dialect: "hainanese", normalized_form: "same or together", confidence: 0.80, source: SOURCE },
  { term: "yi lioh", dialect: "hainanese", normalized_form: "doctor or physician", confidence: 0.80, source: SOURCE },
  { term: "piang", dialect: "hainanese", normalized_form: "sick or ill", confidence: 0.83, source: SOURCE },
  { term: "yok", dialect: "hainanese", normalized_form: "medicine", confidence: 0.80, source: SOURCE },
  { term: "ki yi lioh", dialect: "hainanese", normalized_form: "go to doctor", confidence: 0.80, source: SOURCE },

  // ── BAZAAR MALAY (Melayu Pasar — informal cross-community Malay) ──────────
  { term: "sama sama", dialect: "bazaar-malay", normalized_form: "together or same same", confidence: 0.90, source: SOURCE },
  { term: "mana boleh", dialect: "bazaar-malay", normalized_form: "how can that be or not possible", confidence: 0.88, source: SOURCE },
  { term: "boleh lah", dialect: "bazaar-malay", normalized_form: "can or okay fine", confidence: 0.90, source: SOURCE },
  { term: "tak boleh", dialect: "bazaar-malay", normalized_form: "cannot", confidence: 0.90, source: SOURCE },
  { term: "tak ada", dialect: "bazaar-malay", normalized_form: "do not have or there is none", confidence: 0.90, source: SOURCE },
  { term: "ada ke", dialect: "bazaar-malay", normalized_form: "is there or do you have", confidence: 0.88, source: SOURCE },
  { term: "mau apa", dialect: "bazaar-malay", normalized_form: "what do you want", confidence: 0.88, source: SOURCE },
  { term: "mau tak mau", dialect: "bazaar-malay", normalized_form: "want it or not", confidence: 0.88, source: SOURCE },
  { term: "sudah", dialect: "bazaar-malay", normalized_form: "already done or finished", confidence: 0.90, source: SOURCE },
  { term: "sudah habis", dialect: "bazaar-malay", normalized_form: "already finished or used up", confidence: 0.88, source: SOURCE },
  { term: "belum", dialect: "bazaar-malay", normalized_form: "not yet", confidence: 0.90, source: SOURCE },
  { term: "jangan lah", dialect: "bazaar-malay", normalized_form: "please do not", confidence: 0.88, source: SOURCE },
  { term: "betul lah", dialect: "bazaar-malay", normalized_form: "that is correct or true", confidence: 0.88, source: SOURCE },
  { term: "memang lah", dialect: "bazaar-malay", normalized_form: "of course or obviously", confidence: 0.88, source: SOURCE },
  { term: "kasi", dialect: "bazaar-malay", normalized_form: "give or provide", confidence: 0.88, source: SOURCE },
  { term: "kasi tahu", dialect: "bazaar-malay", normalized_form: "let me know or inform", confidence: 0.88, source: SOURCE },
  { term: "pergi", dialect: "bazaar-malay", normalized_form: "go or go to", confidence: 0.88, source: SOURCE },
  { term: "pergi mana", dialect: "bazaar-malay", normalized_form: "where are you going", confidence: 0.85, source: SOURCE },
  { term: "mana tahu", dialect: "bazaar-malay", normalized_form: "who knows or how would I know", confidence: 0.85, source: SOURCE },
  { term: "cincai", dialect: "bazaar-malay", normalized_form: "anything is fine or does not matter", confidence: 0.88, source: SOURCE },
  { term: "habis lah", dialect: "bazaar-malay", normalized_form: "it is finished or in trouble now", confidence: 0.88, source: SOURCE },
  { term: "mana ada", dialect: "bazaar-malay", normalized_form: "there is none or that is not true", confidence: 0.85, source: SOURCE },
  { term: "gostan", dialect: "bazaar-malay", normalized_form: "reverse or go backwards", confidence: 0.83, source: SOURCE },
  { term: "chap", dialect: "bazaar-malay", normalized_form: "mixed or rojak or all sorts", confidence: 0.83, source: SOURCE },
  { term: "rojak", dialect: "bazaar-malay", normalized_form: "mixed or a mix of things", confidence: 0.85, source: SOURCE },
  { term: "duit", dialect: "bazaar-malay", normalized_form: "money", confidence: 0.90, source: SOURCE },
  { term: "duit tak cukup", dialect: "bazaar-malay", normalized_form: "not enough money", confidence: 0.88, source: SOURCE },
  { term: "simpan duit", dialect: "bazaar-malay", normalized_form: "save money", confidence: 0.88, source: SOURCE },
  { term: "ambik duit", dialect: "bazaar-malay", normalized_form: "take or withdraw money", confidence: 0.88, source: SOURCE },
  { term: "berapa", dialect: "bazaar-malay", normalized_form: "how much", confidence: 0.88, source: SOURCE },
  { term: "berapa bulan", dialect: "bazaar-malay", normalized_form: "how many months", confidence: 0.85, source: SOURCE },
  { term: "sebulan sekali", dialect: "bazaar-malay", normalized_form: "once a month or monthly", confidence: 0.88, source: SOURCE },

  // ── MALAY (additional — CPF / retirement / housing specific) ─────────────
  { term: "bersara", dialect: "malay", normalized_form: "retire or retirement", confidence: 0.90, source: SOURCE },
  { term: "wang bersara", dialect: "malay", normalized_form: "retirement money or pension", confidence: 0.90, source: SOURCE },
  { term: "caruman", dialect: "malay", normalized_form: "contribution or levy", confidence: 0.90, source: SOURCE },
  { term: "caruman cpf", dialect: "malay", normalized_form: "CPF contribution", confidence: 0.92, source: SOURCE },
  { term: "simpanan", dialect: "malay", normalized_form: "savings or savings account", confidence: 0.90, source: SOURCE },
  { term: "simpanan cpf", dialect: "malay", normalized_form: "CPF savings", confidence: 0.92, source: SOURCE },
  { term: "akaun cpf", dialect: "malay", normalized_form: "CPF account", confidence: 0.92, source: SOURCE },
  { term: "akaun biasa", dialect: "malay", normalized_form: "ordinary account or OA", confidence: 0.90, source: SOURCE },
  { term: "akaun khas", dialect: "malay", normalized_form: "special account or SA", confidence: 0.90, source: SOURCE },
  { term: "akaun perubatan", dialect: "malay", normalized_form: "medisave account or MA", confidence: 0.90, source: SOURCE },
  { term: "akaun persaraan", dialect: "malay", normalized_form: "retirement account or RA", confidence: 0.90, source: SOURCE },
  { term: "bayaran bulanan", dialect: "malay", normalized_form: "monthly payment or payout", confidence: 0.90, source: SOURCE },
  { term: "bayaran masuk", dialect: "malay", normalized_form: "incoming payment or credited", confidence: 0.88, source: SOURCE },
  { term: "pengeluaran", dialect: "malay", normalized_form: "withdrawal or drawdown", confidence: 0.90, source: SOURCE },
  { term: "pengeluaran cpf", dialect: "malay", normalized_form: "CPF withdrawal", confidence: 0.92, source: SOURCE },
  { term: "pampasan", dialect: "malay", normalized_form: "compensation or payout", confidence: 0.88, source: SOURCE },
  { term: "faedah", dialect: "malay", normalized_form: "interest or benefit", confidence: 0.88, source: SOURCE },
  { term: "kadar faedah", dialect: "malay", normalized_form: "interest rate", confidence: 0.88, source: SOURCE },
  { term: "perumahan", dialect: "malay", normalized_form: "housing or accommodation", confidence: 0.88, source: SOURCE },
  { term: "hdb", dialect: "malay", normalized_form: "HDB public housing flat", confidence: 0.92, source: SOURCE },
  { term: "flat hdb", dialect: "malay", normalized_form: "HDB public housing flat", confidence: 0.92, source: SOURCE },
  { term: "pinjaman perumahan", dialect: "malay", normalized_form: "housing loan", confidence: 0.90, source: SOURCE },
  { term: "singpass", dialect: "malay", normalized_form: "SingPass digital identity login", confidence: 0.92, source: SOURCE },
  { term: "login singpass", dialect: "malay", normalized_form: "log in using SingPass", confidence: 0.92, source: SOURCE },
  { term: "tak faham", dialect: "malay", normalized_form: "do not understand", confidence: 0.90, source: SOURCE },
  { term: "tolong bantu", dialect: "malay", normalized_form: "please help", confidence: 0.90, source: SOURCE },
  { term: "tak tahu macam mana", dialect: "malay", normalized_form: "do not know how", confidence: 0.88, source: SOURCE },
  { term: "dah tua dah", dialect: "malay", normalized_form: "already very old now", confidence: 0.88, source: SOURCE },
  { term: "nak tanya", dialect: "malay", normalized_form: "want to ask", confidence: 0.88, source: SOURCE },
  { term: "nak tahu", dialect: "malay", normalized_form: "want to know", confidence: 0.88, source: SOURCE },
  { term: "berapa banyak", dialect: "malay", normalized_form: "how much or how many", confidence: 0.88, source: SOURCE },

  // ── TAMIL (additional — Singapore Tamil community) ────────────────────────
  { term: "panam", dialect: "tamil", normalized_form: "money", confidence: 0.92, source: SOURCE },
  { term: "panam illa", dialect: "tamil", normalized_form: "no money", confidence: 0.90, source: SOURCE },
  { term: "panam irukku", dialect: "tamil", normalized_form: "have money", confidence: 0.88, source: SOURCE },
  { term: "selavidu", dialect: "tamil", normalized_form: "spend money", confidence: 0.88, source: SOURCE },
  { term: "semippu", dialect: "tamil", normalized_form: "savings", confidence: 0.88, source: SOURCE },
  { term: "bank", dialect: "tamil", normalized_form: "bank", confidence: 0.90, source: SOURCE },
  { term: "vangki", dialect: "tamil", normalized_form: "bank (colloquial)", confidence: 0.88, source: SOURCE },
  { term: "ilam vaduvan", dialect: "tamil", normalized_form: "young person", confidence: 0.83, source: SOURCE },
  { term: "mooppen", dialect: "tamil", normalized_form: "elderly person or elder", confidence: 0.85, source: SOURCE },
  { term: "muthal", dialect: "tamil", normalized_form: "capital or savings or first", confidence: 0.85, source: SOURCE },
  { term: "thirunambam", dialect: "tamil", normalized_form: "scam or fraud", confidence: 0.85, source: SOURCE },
  { term: "enna seyyanum", dialect: "tamil", normalized_form: "what should I do", confidence: 0.88, source: SOURCE },
  { term: "puriyala", dialect: "tamil", normalized_form: "do not understand", confidence: 0.88, source: SOURCE },
  { term: "solla mudiyuma", dialect: "tamil", normalized_form: "can you tell me", confidence: 0.85, source: SOURCE },
  { term: "theriyuma", dialect: "tamil", normalized_form: "do you know", confidence: 0.85, source: SOURCE },
  { term: "theriyathu", dialect: "tamil", normalized_form: "do not know", confidence: 0.88, source: SOURCE },
  { term: "veettu varaiku", dialect: "tamil", normalized_form: "until home or for the family", confidence: 0.83, source: SOURCE },
  { term: "veetu varam", dialect: "tamil", normalized_form: "home ownership or own house", confidence: 0.83, source: SOURCE },
  { term: "kudumba", dialect: "tamil", normalized_form: "family", confidence: 0.85, source: SOURCE },
  { term: "akka", dialect: "tamil", normalized_form: "elder sister or older woman", confidence: 0.88, source: SOURCE },
  { term: "anna", dialect: "tamil", normalized_form: "elder brother or older man", confidence: 0.88, source: SOURCE },
  { term: "thatha", dialect: "tamil", normalized_form: "grandfather", confidence: 0.90, source: SOURCE },
  { term: "paatti", dialect: "tamil", normalized_form: "grandmother", confidence: 0.90, source: SOURCE },
  { term: "appa", dialect: "tamil", normalized_form: "father", confidence: 0.90, source: SOURCE },
  { term: "amma", dialect: "tamil", normalized_form: "mother", confidence: 0.90, source: SOURCE },
  { term: "vayathu", dialect: "tamil", normalized_form: "age", confidence: 0.85, source: SOURCE },
  { term: "mudhu mai", dialect: "tamil", normalized_form: "old age", confidence: 0.85, source: SOURCE },
  { term: "idhu sari thana", dialect: "tamil", normalized_form: "is this correct", confidence: 0.85, source: SOURCE },
  { term: "kadaisi", dialect: "tamil", normalized_form: "last or final", confidence: 0.83, source: SOURCE },
  { term: "oru maadam", dialect: "tamil", normalized_form: "one month", confidence: 0.85, source: SOURCE },
  { term: "maadham maadham", dialect: "tamil", normalized_form: "every month or monthly", confidence: 0.85, source: SOURCE },
  { term: "ottukka mudiyathu", dialect: "tamil", normalized_form: "cannot accept or cannot manage", confidence: 0.83, source: SOURCE },
  { term: "vazhi theriyala", dialect: "tamil", normalized_form: "do not know the way or how to proceed", confidence: 0.83, source: SOURCE },
  { term: "cpf panam", dialect: "tamil", normalized_form: "CPF money or savings", confidence: 0.90, source: SOURCE },
  { term: "udal nalam", dialect: "tamil", normalized_form: "health or body wellness", confidence: 0.85, source: SOURCE },
  { term: "asupathri", dialect: "tamil", normalized_form: "hospital", confidence: 0.88, source: SOURCE },
  { term: "clinic", dialect: "tamil", normalized_form: "clinic or polyclinic", confidence: 0.90, source: SOURCE },
  { term: "medicare", dialect: "tamil", normalized_form: "medisave or healthcare savings", confidence: 0.85, source: SOURCE },

  // ── HINDI (Singapore Indian community) ───────────────────────────────────
  // Core vocab
  { term: "paisa", dialect: "hindi", normalized_form: "money", confidence: 0.92, source: SOURCE },
  { term: "paise", dialect: "hindi", normalized_form: "money", confidence: 0.92, source: SOURCE },
  { term: "paise nahi", dialect: "hindi", normalized_form: "no money", confidence: 0.90, source: SOURCE },
  { term: "paise hai", dialect: "hindi", normalized_form: "have money", confidence: 0.88, source: SOURCE },
  { term: "kitne paise", dialect: "hindi", normalized_form: "how much money", confidence: 0.88, source: SOURCE },
  { term: "rupaya", dialect: "hindi", normalized_form: "rupee or money", confidence: 0.85, source: SOURCE },
  { term: "bachat", dialect: "hindi", normalized_form: "savings", confidence: 0.92, source: SOURCE },
  { term: "bachat khata", dialect: "hindi", normalized_form: "savings account", confidence: 0.90, source: SOURCE },
  { term: "jama", dialect: "hindi", normalized_form: "deposited or credited", confidence: 0.85, source: SOURCE },
  { term: "nikalna", dialect: "hindi", normalized_form: "withdraw or take out", confidence: 0.88, source: SOURCE },
  { term: "nikalo", dialect: "hindi", normalized_form: "withdraw it", confidence: 0.85, source: SOURCE },
  { term: "jama karo", dialect: "hindi", normalized_form: "deposit or put in", confidence: 0.85, source: SOURCE },
  { term: "byaj", dialect: "hindi", normalized_form: "interest on savings", confidence: 0.88, source: SOURCE },
  { term: "byaaj", dialect: "hindi", normalized_form: "interest rate", confidence: 0.88, source: SOURCE },
  { term: "faida", dialect: "hindi", normalized_form: "benefit or profit or interest", confidence: 0.88, source: SOURCE },
  { term: "kharcha", dialect: "hindi", normalized_form: "expenditure or expense", confidence: 0.88, source: SOURCE },
  { term: "karz", dialect: "hindi", normalized_form: "debt or loan", confidence: 0.88, source: SOURCE },
  { term: "loan", dialect: "hindi", normalized_form: "loan", confidence: 0.90, source: SOURCE },
  { term: "ghar", dialect: "hindi", normalized_form: "house or home", confidence: 0.92, source: SOURCE },
  { term: "ghar khareedna", dialect: "hindi", normalized_form: "buy a house", confidence: 0.88, source: SOURCE },
  { term: "ghar ka loan", dialect: "hindi", normalized_form: "housing loan", confidence: 0.88, source: SOURCE },
  // Healthcare
  { term: "dawa", dialect: "hindi", normalized_form: "medicine", confidence: 0.92, source: SOURCE },
  { term: "dawai", dialect: "hindi", normalized_form: "medicine", confidence: 0.90, source: SOURCE },
  { term: "doctor ke paas", dialect: "hindi", normalized_form: "go to doctor", confidence: 0.90, source: SOURCE },
  { term: "hospital", dialect: "hindi", normalized_form: "hospital", confidence: 0.92, source: SOURCE },
  { term: "bimari", dialect: "hindi", normalized_form: "illness or disease", confidence: 0.90, source: SOURCE },
  { term: "bukhar", dialect: "hindi", normalized_form: "fever", confidence: 0.88, source: SOURCE },
  { term: "dard", dialect: "hindi", normalized_form: "pain or ache", confidence: 0.88, source: SOURCE },
  { term: "sehat", dialect: "hindi", normalized_form: "health", confidence: 0.90, source: SOURCE },
  { term: "theek", dialect: "hindi", normalized_form: "fine or okay or recovered", confidence: 0.88, source: SOURCE },
  { term: "theek nahi", dialect: "hindi", normalized_form: "not well or not fine", confidence: 0.88, source: SOURCE },
  // Retirement / age
  { term: "budhapa", dialect: "hindi", normalized_form: "old age", confidence: 0.90, source: SOURCE },
  { term: "budha", dialect: "hindi", normalized_form: "old man", confidence: 0.88, source: SOURCE },
  { term: "budhi", dialect: "hindi", normalized_form: "old woman", confidence: 0.88, source: SOURCE },
  { term: "pension", dialect: "hindi", normalized_form: "pension or retirement income", confidence: 0.92, source: SOURCE },
  { term: "retire", dialect: "hindi", normalized_form: "retire or retirement", confidence: 0.92, source: SOURCE },
  { term: "naukri chali gayi", dialect: "hindi", normalized_form: "lost the job or retrenched", confidence: 0.88, source: SOURCE },
  { term: "umra", dialect: "hindi", normalized_form: "age", confidence: 0.88, source: SOURCE },
  { term: "umar", dialect: "hindi", normalized_form: "age", confidence: 0.88, source: SOURCE },
  { term: "mahina", dialect: "hindi", normalized_form: "month", confidence: 0.88, source: SOURCE },
  { term: "har mahine", dialect: "hindi", normalized_form: "every month or monthly", confidence: 0.88, source: SOURCE },
  // Family
  { term: "dada", dialect: "hindi", normalized_form: "paternal grandfather", confidence: 0.90, source: SOURCE },
  { term: "dadi", dialect: "hindi", normalized_form: "paternal grandmother", confidence: 0.90, source: SOURCE },
  { term: "nana", dialect: "hindi", normalized_form: "maternal grandfather", confidence: 0.88, source: SOURCE },
  { term: "nani", dialect: "hindi", normalized_form: "maternal grandmother", confidence: 0.88, source: SOURCE },
  { term: "maa", dialect: "hindi", normalized_form: "mother", confidence: 0.92, source: SOURCE },
  { term: "baap", dialect: "hindi", normalized_form: "father", confidence: 0.88, source: SOURCE },
  { term: "bhai", dialect: "hindi", normalized_form: "brother", confidence: 0.88, source: SOURCE },
  { term: "behen", dialect: "hindi", normalized_form: "sister", confidence: 0.88, source: SOURCE },
  { term: "parivar", dialect: "hindi", normalized_form: "family", confidence: 0.90, source: SOURCE },
  // CPF-specific
  { term: "cpf ka paisa", dialect: "hindi", normalized_form: "CPF money", confidence: 0.90, source: SOURCE },
  { term: "cpf account", dialect: "hindi", normalized_form: "CPF account", confidence: 0.92, source: SOURCE },
  { term: "singpass se login", dialect: "hindi", normalized_form: "log in with SingPass", confidence: 0.90, source: SOURCE },
  { term: "account mein kitna hai", dialect: "hindi", normalized_form: "how much is in the account", confidence: 0.88, source: SOURCE },
  { term: "paisa nikalna hai", dialect: "hindi", normalized_form: "need to withdraw money", confidence: 0.88, source: SOURCE },
  { term: "samajh nahi aaya", dialect: "hindi", normalized_form: "did not understand", confidence: 0.88, source: SOURCE },
  { term: "kya karna hoga", dialect: "hindi", normalized_form: "what needs to be done", confidence: 0.88, source: SOURCE },
  { term: "kaisa apply kare", dialect: "hindi", normalized_form: "how to apply", confidence: 0.88, source: SOURCE },
  { term: "theek hai", dialect: "hindi", normalized_form: "okay or alright", confidence: 0.90, source: SOURCE },
  { term: "thik hai", dialect: "hindi", normalized_form: "okay or alright", confidence: 0.90, source: SOURCE },
  { term: "acha", dialect: "hindi", normalized_form: "okay or good or I see", confidence: 0.90, source: SOURCE },
  { term: "haan", dialect: "hindi", normalized_form: "yes", confidence: 0.92, source: SOURCE },
  { term: "nahi", dialect: "hindi", normalized_form: "no", confidence: 0.92, source: SOURCE },
  { term: "pata nahi", dialect: "hindi", normalized_form: "do not know", confidence: 0.90, source: SOURCE },
  { term: "mujhe samjhao", dialect: "hindi", normalized_form: "please explain to me", confidence: 0.88, source: SOURCE },
  { term: "help chahiye", dialect: "hindi", normalized_form: "need help", confidence: 0.90, source: SOURCE },
  { term: "dhoka", dialect: "hindi", normalized_form: "scam or fraud or being cheated", confidence: 0.88, source: SOURCE },
  { term: "thagi", dialect: "hindi", normalized_form: "cheating or scam", confidence: 0.85, source: SOURCE },

  // ── MALAYALAM (Kerala community in Singapore) ─────────────────────────────
  // Money / finance
  { term: "kaasum", dialect: "malayalam", normalized_form: "money (colloquial)", confidence: 0.90, source: SOURCE },
  { term: "panam", dialect: "malayalam", normalized_form: "money", confidence: 0.92, source: SOURCE },
  { term: "panam illa", dialect: "malayalam", normalized_form: "no money", confidence: 0.90, source: SOURCE },
  { term: "panam und", dialect: "malayalam", normalized_form: "have money", confidence: 0.88, source: SOURCE },
  { term: "ella panam", dialect: "malayalam", normalized_form: "all the money", confidence: 0.85, source: SOURCE },
  { term: "mudhalkkoottuka", dialect: "malayalam", normalized_form: "invest money or top up savings", confidence: 0.85, source: SOURCE },
  { term: "pali", dialect: "malayalam", normalized_form: "interest on savings", confidence: 0.85, source: SOURCE },
  { term: "bank account", dialect: "malayalam", normalized_form: "bank account", confidence: 0.90, source: SOURCE },
  { term: "maasamthoorum", dialect: "malayalam", normalized_form: "every month or monthly", confidence: 0.85, source: SOURCE },
  { term: "oru maasam", dialect: "malayalam", normalized_form: "one month", confidence: 0.85, source: SOURCE },
  { term: "edukka", dialect: "malayalam", normalized_form: "withdraw or take out", confidence: 0.85, source: SOURCE },
  { term: "iduka", dialect: "malayalam", normalized_form: "deposit or put in", confidence: 0.83, source: SOURCE },
  { term: "kadan", dialect: "malayalam", normalized_form: "debt or loan", confidence: 0.85, source: SOURCE },
  { term: "home loan", dialect: "malayalam", normalized_form: "housing loan", confidence: 0.88, source: SOURCE },
  // Healthcare
  { term: "maru", dialect: "malayalam", normalized_form: "medicine", confidence: 0.88, source: SOURCE },
  { term: "marunnu", dialect: "malayalam", normalized_form: "medicine or medication", confidence: 0.88, source: SOURCE },
  { term: "doctor", dialect: "malayalam", normalized_form: "doctor", confidence: 0.92, source: SOURCE },
  { term: "hospital", dialect: "malayalam", normalized_form: "hospital", confidence: 0.92, source: SOURCE },
  { term: "rogi", dialect: "malayalam", normalized_form: "patient or sick person", confidence: 0.85, source: SOURCE },
  { term: "aswastham", dialect: "malayalam", normalized_form: "unwell or not healthy", confidence: 0.83, source: SOURCE },
  { term: "sukham", dialect: "malayalam", normalized_form: "health or wellbeing", confidence: 0.85, source: SOURCE },
  { term: "vedana", dialect: "malayalam", normalized_form: "pain or ache", confidence: 0.85, source: SOURCE },
  // Age / retirement
  { term: "pension", dialect: "malayalam", normalized_form: "pension or retirement income", confidence: 0.92, source: SOURCE },
  { term: "vivrantham", dialect: "malayalam", normalized_form: "retired or retirement", confidence: 0.85, source: SOURCE },
  { term: "vayassu", dialect: "malayalam", normalized_form: "age", confidence: 0.90, source: SOURCE },
  { term: "muthassanum", dialect: "malayalam", normalized_form: "grandfather", confidence: 0.85, source: SOURCE },
  { term: "muthassiyum", dialect: "malayalam", normalized_form: "grandmother", confidence: 0.85, source: SOURCE },
  { term: "achan", dialect: "malayalam", normalized_form: "father", confidence: 0.90, source: SOURCE },
  { term: "amma", dialect: "malayalam", normalized_form: "mother", confidence: 0.92, source: SOURCE },
  { term: "chechi", dialect: "malayalam", normalized_form: "elder sister", confidence: 0.88, source: SOURCE },
  { term: "chetta", dialect: "malayalam", normalized_form: "elder brother", confidence: 0.88, source: SOURCE },
  { term: "kochu mole", dialect: "malayalam", normalized_form: "little girl or daughter", confidence: 0.83, source: SOURCE },
  { term: "kochu mon", dialect: "malayalam", normalized_form: "little boy or son", confidence: 0.83, source: SOURCE },
  // CPF / Singapore-specific
  { term: "cpf panam", dialect: "malayalam", normalized_form: "CPF money", confidence: 0.90, source: SOURCE },
  { term: "ariyilla", dialect: "malayalam", normalized_form: "do not know", confidence: 0.88, source: SOURCE },
  { term: "manasilaayilla", dialect: "malayalam", normalized_form: "did not understand", confidence: 0.88, source: SOURCE },
  { term: "samharichu", dialect: "malayalam", normalized_form: "collected or received", confidence: 0.83, source: SOURCE },
  { term: "entha cheyyano", dialect: "malayalam", normalized_form: "what should be done", confidence: 0.85, source: SOURCE },
  { term: "enthu", dialect: "malayalam", normalized_form: "what", confidence: 0.85, source: SOURCE },
  { term: "enthu panam", dialect: "malayalam", normalized_form: "how much money", confidence: 0.85, source: SOURCE },
  { term: "thettiyathano", dialect: "malayalam", normalized_form: "is this wrong or incorrect", confidence: 0.83, source: SOURCE },
  { term: "sheriyano", dialect: "malayalam", normalized_form: "is this correct", confidence: 0.85, source: SOURCE },
  { term: "haa", dialect: "malayalam", normalized_form: "yes", confidence: 0.90, source: SOURCE },
  { term: "illa", dialect: "malayalam", normalized_form: "no or there is none", confidence: 0.90, source: SOURCE },
  { term: "und", dialect: "malayalam", normalized_form: "yes there is or have", confidence: 0.88, source: SOURCE },
  { term: "veedu", dialect: "malayalam", normalized_form: "house or home", confidence: 0.90, source: SOURCE },
  { term: "veedu vaangichu", dialect: "malayalam", normalized_form: "bought a house", confidence: 0.85, source: SOURCE },
  { term: "sahayichu", dialect: "malayalam", normalized_form: "please help", confidence: 0.85, source: SOURCE },
  { term: "fraud", dialect: "malayalam", normalized_form: "scam or fraud", confidence: 0.88, source: SOURCE },
  { term: "cheathichu", dialect: "malayalam", normalized_form: "cheated or scammed", confidence: 0.85, source: SOURCE },

  // ── PUNJABI (Singapore Punjabi / Sikh community) ──────────────────────────
  // Money / finance
  { term: "paise", dialect: "punjabi", normalized_form: "money", confidence: 0.92, source: SOURCE },
  { term: "daulat", dialect: "punjabi", normalized_form: "wealth or riches", confidence: 0.88, source: SOURCE },
  { term: "paisa nahi", dialect: "punjabi", normalized_form: "no money", confidence: 0.90, source: SOURCE },
  { term: "paisa hai", dialect: "punjabi", normalized_form: "have money", confidence: 0.88, source: SOURCE },
  { term: "kitna paisa", dialect: "punjabi", normalized_form: "how much money", confidence: 0.88, source: SOURCE },
  { term: "bachat", dialect: "punjabi", normalized_form: "savings", confidence: 0.90, source: SOURCE },
  { term: "bachat khata", dialect: "punjabi", normalized_form: "savings account", confidence: 0.88, source: SOURCE },
  { term: "viyaaj", dialect: "punjabi", normalized_form: "interest on savings or loan", confidence: 0.88, source: SOURCE },
  { term: "sood", dialect: "punjabi", normalized_form: "interest rate", confidence: 0.85, source: SOURCE },
  { term: "karz", dialect: "punjabi", normalized_form: "debt or loan", confidence: 0.88, source: SOURCE },
  { term: "kadna", dialect: "punjabi", normalized_form: "withdraw or take out", confidence: 0.85, source: SOURCE },
  { term: "paise kadna", dialect: "punjabi", normalized_form: "withdraw money", confidence: 0.85, source: SOURCE },
  { term: "jama karna", dialect: "punjabi", normalized_form: "deposit or contribute", confidence: 0.85, source: SOURCE },
  // Housing
  { term: "makan", dialect: "punjabi", normalized_form: "house or home", confidence: 0.90, source: SOURCE },
  { term: "ghar", dialect: "punjabi", normalized_form: "house or home", confidence: 0.92, source: SOURCE },
  { term: "ghar lena", dialect: "punjabi", normalized_form: "buy a house", confidence: 0.88, source: SOURCE },
  { term: "ghar da karz", dialect: "punjabi", normalized_form: "housing loan", confidence: 0.85, source: SOURCE },
  // Healthcare
  { term: "dawa", dialect: "punjabi", normalized_form: "medicine", confidence: 0.92, source: SOURCE },
  { term: "dawai", dialect: "punjabi", normalized_form: "medicine", confidence: 0.88, source: SOURCE },
  { term: "bimari", dialect: "punjabi", normalized_form: "illness or sickness", confidence: 0.90, source: SOURCE },
  { term: "thandrust", dialect: "punjabi", normalized_form: "healthy or in good health", confidence: 0.85, source: SOURCE },
  { term: "hospital", dialect: "punjabi", normalized_form: "hospital", confidence: 0.92, source: SOURCE },
  { term: "doctor", dialect: "punjabi", normalized_form: "doctor", confidence: 0.92, source: SOURCE },
  // Age / retirement / family
  { term: "pension", dialect: "punjabi", normalized_form: "pension or retirement money", confidence: 0.92, source: SOURCE },
  { term: "buddha", dialect: "punjabi", normalized_form: "old man", confidence: 0.88, source: SOURCE },
  { term: "buddhi", dialect: "punjabi", normalized_form: "old woman", confidence: 0.88, source: SOURCE },
  { term: "umar", dialect: "punjabi", normalized_form: "age", confidence: 0.88, source: SOURCE },
  { term: "bujhurg", dialect: "punjabi", normalized_form: "elderly person", confidence: 0.88, source: SOURCE },
  { term: "dada", dialect: "punjabi", normalized_form: "paternal grandfather", confidence: 0.90, source: SOURCE },
  { term: "dadi", dialect: "punjabi", normalized_form: "paternal grandmother", confidence: 0.90, source: SOURCE },
  { term: "nana", dialect: "punjabi", normalized_form: "maternal grandfather", confidence: 0.88, source: SOURCE },
  { term: "nani", dialect: "punjabi", normalized_form: "maternal grandmother", confidence: 0.88, source: SOURCE },
  { term: "pitaji", dialect: "punjabi", normalized_form: "father (respectful)", confidence: 0.88, source: SOURCE },
  { term: "mataji", dialect: "punjabi", normalized_form: "mother (respectful)", confidence: 0.88, source: SOURCE },
  { term: "bhai sahib", dialect: "punjabi", normalized_form: "elder brother or respected man", confidence: 0.88, source: SOURCE },
  { term: "pene", dialect: "punjabi", normalized_form: "family or relatives", confidence: 0.83, source: SOURCE },
  // CPF / Singapore
  { term: "cpf da paisa", dialect: "punjabi", normalized_form: "CPF money", confidence: 0.90, source: SOURCE },
  { term: "pata nahi", dialect: "punjabi", normalized_form: "do not know", confidence: 0.90, source: SOURCE },
  { term: "samajh nahi ayi", dialect: "punjabi", normalized_form: "did not understand", confidence: 0.88, source: SOURCE },
  { term: "ki karna peega", dialect: "punjabi", normalized_form: "what needs to be done", confidence: 0.85, source: SOURCE },
  { term: "ki karna chahida", dialect: "punjabi", normalized_form: "what should I do", confidence: 0.85, source: SOURCE },
  { term: "kive apply karna", dialect: "punjabi", normalized_form: "how to apply", confidence: 0.85, source: SOURCE },
  { term: "han", dialect: "punjabi", normalized_form: "yes", confidence: 0.92, source: SOURCE },
  { term: "nahi", dialect: "punjabi", normalized_form: "no", confidence: 0.92, source: SOURCE },
  { term: "thik hai", dialect: "punjabi", normalized_form: "okay or alright", confidence: 0.90, source: SOURCE },
  { term: "dhokha", dialect: "punjabi", normalized_form: "scam or fraud or cheated", confidence: 0.88, source: SOURCE },
  { term: "madat", dialect: "punjabi", normalized_form: "help", confidence: 0.88, source: SOURCE },
  { term: "madat karo", dialect: "punjabi", normalized_form: "please help", confidence: 0.88, source: SOURCE },
  { term: "singpass naal login", dialect: "punjabi", normalized_form: "log in with SingPass", confidence: 0.88, source: SOURCE },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db("pulse").collection("slang_dictionary");

  // Ensure index for fast term lookups
  await col.createIndex({ term: 1, dialect: 1 }, { unique: true, background: true });
  await col.createIndex({ term: 1 });

  let inserted = 0;
  let skipped = 0;

  for (const entry of ENTRIES) {
    const result = await col.updateOne(
      { term: entry.term, dialect: entry.dialect },
      { $setOnInsert: entry },
      { upsert: true },
    );
    if (result.upsertedCount > 0) {
      inserted++;
    } else {
      skipped++;
    }
  }

  const total = await col.countDocuments();
  console.log(`\nDone. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
  console.log(`Total slang_dictionary docs: ${total}`);

  // Summary by dialect
  const dialects = await col.distinct("dialect");
  console.log("\nCounts by dialect:");
  for (const d of dialects.sort()) {
    const count = await col.countDocuments({ dialect: d });
    console.log(`  ${d.padEnd(16)} ${count}`);
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
