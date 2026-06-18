/**
 * Reply formatter — cleans LLM output and bolds important CPF terms.
 *
 * Two output modes:
 *   "html"  — wraps bold terms in <b>...</b>, safe for Telegram parse_mode: HTML
 *   "plain" — strips all markup, returns clean readable text
 */

export type FormatMode = "html" | "plain";

// ── CPF vocabulary to bold ────────────────────────────────────────────────────

// Ordered longest-first so overlapping phrases match the more specific one.
const BOLD_TERMS: RegExp[] = [
  // Retirement sums
  /\bEnhanced Retirement Sum\b/gi,
  /\bFull Retirement Sum\b/gi,
  /\bBasic Retirement Sum\b/gi,
  /\bRetirement Sum\b/gi,
  // Account names (full)
  /\bOrdinary Account\b/gi,
  /\bSpecial Account\b/gi,
  /\bMedisave Account\b/gi,
  /\bRetirement Account\b/gi,
  // Account abbreviations (standalone — not mid-word)
  /\b(OA|SA|MA|RA)\b/g,
  /\b(BRS|FRS|ERS|BHS)\b/g,
  /\bCPFIS\b/gi,
  /\bRSTU\b/gi,
  // Scheme & product names
  /\bCPF LIFE\b/gi,
  /\bCPF Life\b/gi,
  /\bMediShield Life\b/gi,
  /\bCareShield Life\b/gi,
  /\bElderShield\b/gi,
  /\bHome Protection Scheme\b/gi,
  /\bHPS\b/g,
  /\bMediSave\b/gi,
  /\bWorkfare\b/gi,
  /\bSilver Support\b/gi,
  /\bMatched Retirement Savings Scheme\b/gi,
  /\bMRSS\b/g,
  /\bSingPass\b/gi,
  /\bMyCPF\b/gi,
  // Key ages & thresholds
  /\bage\s+(?:55|60|65|70)\b/gi,
  /\bat\s+(?:55|65)\b/gi,
  // Dollar amounts  e.g. $20,000  $1,600/month  $99.50
  /\$[\d,]+(?:\.\d{1,2})?(?:\/month|\/year|\/mth)?/g,
  // Percentages  e.g. 4%  2.5%  up to 6%
  /\b\d+(?:\.\d+)?%/g,
  // "up to X%" or "interest rate of X%"
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip LLM-generated HTML tags and markdown emphasis markers. */
function stripMarkdown(text: string): string {
  return text
    .replace(/<\/?(b|i|u|s|em|strong|code|pre|br)[^>]*>/gi, "") // strip HTML tags the LLM emits
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") // unescape any HTML entities
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "");
}

/**
 * Convert LLM structure into clean, readable Telegram text:
 * - Markdown headings / bold-header lines → kept as section labels (bolded later)
 * - Numbered list items and bullet lists get proper spacing
 * - Blank lines are normalised to single separators
 */
function structureText(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]!.trimEnd();

    // Numbered list item — ensure a leading blank line for separation
    if (/^\d+\.\s+/.test(line)) {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      out.push(line);
      continue;
    }

    // Bullet — normalise to • with consistent spacing
    if (/^[-–—*•]\s+/.test(line)) {
      if (out.length > 0 && out[out.length - 1] !== "" && !/^[-–—*•]\s+/.test(out[out.length - 1] ?? "")) {
        out.push("");
      }
      out.push("• " + line.replace(/^[-–—*•]\s+/, ""));
      continue;
    }

    out.push(line);
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")   // collapse excessive blank lines
    .trim();
}

/** Collapse runs of blank lines down to a single blank line. */
function normaliseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Wrap CPF terms and section header lines in <b>…</b> in a single pass.
 * All text is HTML-escaped here — this is the only place escaping happens,
 * so there is no risk of double-escaping from a prior step.
 */
function applyHtmlBold(text: string): string {
  // Section-header pattern: a standalone line (no leading whitespace) that is
  // short, starts with a capital letter, and ends with a colon.
  const HEADER_RE = /^([A-Z][^\n]{0,60}:)$/gm;

  const regions: Array<{ start: number; end: number; content: string }> = [];

  // Collect CPF-term regions
  for (const pattern of BOLD_TERMS) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (!regions.some((r) => start < r.end && end > r.start)) {
        regions.push({ start, end, content: m[0] });
      }
    }
  }

  // Collect section-header regions
  let hm: RegExpExecArray | null;
  while ((hm = HEADER_RE.exec(text)) !== null) {
    const start = hm.index;
    const end = start + hm[0].length;
    if (!regions.some((r) => start < r.end && end > r.start)) {
      regions.push({ start, end, content: hm[0] });
    }
  }

  if (regions.length === 0) {
    // No bold regions — still need to escape for HTML mode
    return escapeHtml(text);
  }

  regions.sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const { start, end, content } of regions) {
    out += escapeHtml(text.slice(cursor, start));
    out += `<b>${escapeHtml(content)}</b>`;
    cursor = end;
  }
  out += escapeHtml(text.slice(cursor));
  return out;
}

/** Escape characters that have special meaning in Telegram HTML mode. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Format a bot reply for delivery.
 *
 * @param text  Raw LLM output (may contain markdown)
 * @param mode  "html" for Telegram, "plain" for TTS / plain-text channels
 */
export function formatReply(text: string, mode: FormatMode = "html"): string {
  const clean = normaliseWhitespace(structureText(stripMarkdown(text)));
  if (mode === "plain") return clean;
  // applyHtmlBold handles both CPF-term bolding and section-header bolding
  // in a single pass, with correct HTML escaping throughout.
  return applyHtmlBold(clean);
}

/** True when the string contains any HTML tags (i.e. formatReply bolded something). */
export function containsHtml(text: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(text);
}
