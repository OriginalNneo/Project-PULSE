import type { Language } from "../../shared/types/index.js";

/**
 * Scope guard for the CPF-only assistant.
 *
 * Before this existed, refusal was purely *emergent*: BASE_SYSTEM_PROMPT told the model to
 * "answer using ONLY the retrieved CPF information", and the model decided at generation time
 * whether a question was in scope. Moonshot benchmarking (docs/PULSE_Moonshot_Evaluation.md §6)
 * showed that this leaks badly and, worse, leaks as a function of prompt *format*: open questions
 * were refused 50–74% of the time, but prompts demanding a bare TRUE/FALSE were refused only
 * 9–39%. A constrained output instruction simply overrode the guard. Overall PULSE answered 63%
 * of out-of-scope questions, including issuing verdicts on Singapore government POFMA statements.
 *
 * The root cause was retrieval, not the model: searchKnowledge() keeps any document with
 * score > 0, so a single incidental token match ("station" appearing somewhere in a CPF page)
 * returned a document, which set confidence to 0.9, which told the LLM the topic was covered.
 *
 * So the guard here is deterministic and runs BEFORE generation: if the citizen's question
 * barely overlaps the knowledge base, we refuse with fixed text and never call the LLM at all.
 * That removes the model's opportunity to be talked out of refusing, and costs no tokens.
 */

/** Relevance evidence extracted from retrieval, independent of any model judgement. */
export interface ScopeSignal {
  /** Best raw score from searchKnowledge (4/title, 3/topic, 2/body, 1/tag per token). */
  topScore: number;
  /** Fraction of the question's meaningful tokens that matched the best document, 0..1. */
  coverage: number;
}

/**
 * Minimum share of the question's own tokens that must appear in the best-matching document.
 * "What is the CPF contribution rate at 40?" covers nearly all of its tokens; "Which MRT station
 * is the interchange for the East-West line?" covers almost none even when it scrapes a match.
 */
export const MIN_COVERAGE = 0.34;

/** Minimum raw score. One incidental body hit scores 2; a real topical match scores well above. */
export const MIN_TOP_SCORE = 6;

/**
 * True when retrieval found nothing that genuinely covers the question.
 *
 * Deliberately conservative: BOTH signals must be weak. A short question ("CPF LIFE?") can have
 * low coverage but a high score, and a long rambling one the reverse; refusing on either alone
 * would reject legitimate CPF questions. §5.3 of the evaluation found a real CPF document
 * (cpf-medifund) that retrieval already fails to reach, so an over-eager floor would convert a
 * retrieval bug into a refusal shown to real citizens.
 */
export function isOutOfScope(signal: ScopeSignal | undefined, mentionsCpfTerm = false): boolean {
  if (!signal) return false; // no evidence either way — let the normal path run
  // A question that names CPF vocabulary is CPF business even when retrieval fails to answer
  // it. Refusing here would tell a citizen their real CPF question is off-topic — see
  // mentionsKnownCpfTerm() and evaluation §5.3 (cpf-medifund is indexed but unreachable).
  if (mentionsCpfTerm) return false;
  return signal.coverage < MIN_COVERAGE && signal.topScore < MIN_TOP_SCORE;
}

/**
 * Canonical refusal text, per language.
 *
 * Fixed wording rather than model-improvised phrasing, for three reasons: it cannot drift into
 * the wrong language (evaluation defect D4 — an English question drew a Chinese refusal), it
 * cannot be reworded into a partial answer, and it makes refusal measurable by exact match
 * instead of by regex.
 */
const REFUSALS: Record<string, string> = {
  en: "ℹ️ I can only help with CPF matters, so I'm not able to answer that. Ask me about CPF accounts, contributions, retirement, housing or healthcare — I'll be glad to help.",
  zh: "ℹ️ 我只能协助公积金（CPF）相关的事务，所以无法回答这个问题。您可以问我关于公积金账户、缴交、退休、住房或医疗方面的问题，我很乐意帮忙。",
  ms: "ℹ️ Saya hanya boleh membantu dengan perkara berkaitan CPF, jadi saya tidak dapat menjawab soalan itu. Tanya saya tentang akaun CPF, caruman, persaraan, perumahan atau penjagaan kesihatan — saya sedia membantu.",
  ta: "ℹ️ என்னால் CPF தொடர்பான விஷயங்களில் மட்டுமே உதவ முடியும், எனவே அதற்கு பதிலளிக்க இயலவில்லை. CPF கணக்குகள், பங்களிப்புகள், ஓய்வூதியம், வீட்டுவசதி அல்லது சுகாதாரம் குறித்து கேளுங்கள் — உதவ மகிழ்ச்சி.",
};

export function refusalText(language: Language): string {
  return REFUSALS[language] ?? REFUSALS.en!;
}
