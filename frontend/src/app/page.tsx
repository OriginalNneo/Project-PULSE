"use client";

import { useEffect, useState } from "react";

// ── Palette ──────────────────────────────────────────────────────────────────
// Cream page background + teal ink, with a small set of pastel accents standing
// in for the old neon-glow treatment.
const C = {
  bg:      "#fffcf5",
  bgAlt:   "#faf6ec",
  surface: "#ffffff",
  teal:    "#0b6160",
  tealSoft:  "rgba(11,97,96,0.72)",
  tealFaint: "rgba(11,97,96,0.48)",
  border:      "rgba(11,97,96,0.14)",
  borderHover: "rgba(11,97,96,0.32)",
} as const;

const PASTELS = [
  { bg: "#e8f1e4", fg: "#4f7358" }, // sage
  { bg: "#fbe9d7", fg: "#b06a34" }, // peach
  { bg: "#fbe3e3", fg: "#b1524f" }, // blush
  { bg: "#ece3f7", fg: "#6d59a0" }, // lavender
] as const;

const FONT_HEADING = "var(--font-heading), Georgia, 'Times New Roman', serif";
const FONT_BODY = "var(--font-body), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const NAV_LINKS = [
  { label: "Chat",              href: "/chat" },
  { label: "CPF Portal",        href: "/cpf" },
  { label: "Officer Dashboard", href: "/dashboard" },
  { label: "Text Us Demo",      href: "/textus" },
];

// Small hand-drawn line icons (no icon library) — used in place of emoji.
function Icon({ path, size = 20 }: { path: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
}

const ICONS = {
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" />
      <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
      <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
    </>
  ),
  handoff: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M1 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <polyline points="17 11 19 13 23 9" />
    </>
  ),
  bank: (
    <>
      <polygon points="12 3 3 8 21 8 12 3" />
      <line x1="4" y1="8" x2="4" y2="20" />
      <line x1="9" y1="8" x2="9" y2="20" />
      <line x1="15" y1="8" x2="15" y2="20" />
      <line x1="20" y1="8" x2="20" y2="20" />
      <line x1="2" y1="21" x2="22" y2="21" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </>
  ),
  chat: (
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
} as const;

// Research summaries are placeholders — real numbers from a quick pass of public
// sources, flagged for you to swap in exact citations before this ships.
const FEATURES = [
  {
    icon: ICONS.globe,
    title: "Multilingual by default",
    desc: "Responds in your language, automatically.",
    research: {
      heading: "Why language-first matters",
      body: "In Singapore's 2020 Census, English was the language most frequently spoken at home for 48.3% of residents aged 5+, followed by Mandarin and other Chinese varieties (38.6%), Malay (9.2%), other Chinese dialects — Hokkien, Cantonese, Teochew, Hakka (8.7%), and Tamil (2.5%). PULSE is built to meet citizens in whichever of these they're most comfortable in.",
      source: "SingStat, Census of Population 2020 — placeholder, confirm exact citation.",
    },
  },
  {
    icon: ICONS.spark,
    title: "AI-powered answers",
    desc: "Accurate answers, not canned replies.",
    research: {
      heading: "Why AI-native self-service works",
      body: "Industry benchmarks show AI-native self-service platforms reaching 55–70% first-contact resolution, versus roughly 14% for traditional self-service tools. It's cheaper too — Gartner puts the median cost per contact at $1.84 for self-service versus $13.50 for agent-assisted interactions, a 7x difference PULSE is designed to capture without sacrificing accuracy.",
      source: "Gartner benchmarks, via 2026 AI customer-service industry roundups — placeholder, swap in a primary source.",
    },
  },
  {
    icon: ICONS.radio,
    title: "Omnichannel reach",
    desc: "Meets citizens where they already chat.",
    research: {
      heading: "Where Singapore already messages",
      body: "WhatsApp is used by over 84% of Singapore's internet users — the country's most-used messaging app — and Telegram reaches roughly 38–49%. Altogether, 97% of Singapore's internet users use a chat or messaging app regularly, which is why PULSE meets citizens on WhatsApp and Telegram instead of asking them to download something new.",
      source: "We Are Social, Digital 2024/2025 Singapore report — placeholder, confirm latest figures.",
    },
  },
  {
    icon: ICONS.handoff,
    title: "Officer escalation",
    desc: "Knows when a human should step in.",
    research: {
      heading: "Why automated frustration-detection matters",
      body: "Contact-centre research finds most organisations manually review only 2–3% of conversations, so frustration signals often go undetected until a monthly report surfaces them. Real-time sentiment detection — reading word choice, tone, and pacing — lets a system flag frustration and hand off to an officer with full context before it escalates further.",
      source: "Contact-centre sentiment analysis industry research, 2026 — placeholder, cite a specific study.",
    },
  },
];

const DEMOS = [
  {
    label: "Simulated CPF Portal",
    desc:  "See PULSE embedded as a chatbot inside a mock CPF member portal.",
    href:  "/cpf",
    cta:   "Open portal →",
    icon:  ICONS.bank,
  },
  {
    label: "Officer Dashboard",
    desc:  "Live queue, WebSocket updates, AI-generated case summaries, and translation.",
    href:  "/dashboard",
    cta:   "Open dashboard →",
    icon:  ICONS.monitor,
  },
  {
    label: "WhatsApp Text Us",
    desc:  "Simulates the CPF Board Text Us flow including pre-filled message validation.",
    href:  "/textus",
    cta:   "Open demo →",
    icon:  ICONS.phone,
  },
  {
    label: "Chat Interface",
    desc:  "Standalone citizen chat — multilingual, voice notes, and escalation flow.",
    href:  "/chat",
    cta:   "Open chat →",
    icon:  ICONS.chat,
  },
];

const STATS = [
  { stat: "4+",    label: "Languages supported" },
  { stat: "< 2s",  label: "Average response time" },
  { stat: "3",     label: "Active channels" },
  { stat: "24/7",  label: "AI availability" },
];

export default function HomePage() {
  // Scroll hint: visible at rest, fades out (slowly) once the visitor scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [openFeature, setOpenFeature] = useState<number | null>(null);

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.bg, color: C.teal, minHeight: "100vh" }}>

      {/* ── Top nav — its own band, clearly separated by a rule + shadow ── */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, boxShadow: "0 1px 0 rgba(11,97,96,.04)" }}>
        <nav aria-label="Site navigation" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 52px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: C.bg, fontWeight: 700, fontSize: 14, fontFamily: FONT_HEADING }}>P</span>
            </div>
            <span style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 19, letterSpacing: 1, color: C.teal }}>PULSE</span>
          </div>

          <ul style={{ display: "flex", gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}
                  style={{ color: C.tealSoft, textDecoration: "none", fontSize: 14, fontWeight: 600, padding: "8px 14px", borderRadius: 8, transition: "background .15s, color .15s", display: "block" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(11,97,96,.07)"; el.style.color = C.teal; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = C.tealSoft; }}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: "relative", overflow: "hidden", background: C.bg }}>
        {/* Soft pastel blobs — decorative, not particle animation */}
        <div style={{ position: "absolute", top: -140, right: -120, width: 480, height: 480, borderRadius: "50%", background: `radial-gradient(circle, ${PASTELS[1].bg} 0%, transparent 70%)`, opacity: 0.7, filter: "blur(10px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -160, left: -100, width: 420, height: 420, borderRadius: "50%", background: `radial-gradient(circle, ${PASTELS[0].bg} 0%, transparent 70%)`, opacity: 0.7, filter: "blur(10px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", left: "58%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${PASTELS[3].bg} 0%, transparent 70%)`, opacity: 0.55, filter: "blur(10px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px", minHeight: "calc(100vh - 78px)", maxWidth: 1280, margin: "0 auto", boxSizing: "border-box" as const }}>

          {/* Pill badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: PASTELS[0].bg, borderRadius: 100, padding: "7px 18px", fontSize: 12, fontWeight: 700, letterSpacing: 1.3, color: PASTELS[0].fg, marginBottom: 32, textTransform: "uppercase" as const }}>
            People-centric Framework for Correspondence
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: "clamp(34px, 5.6vw, 84px)", fontWeight: 600, lineHeight: 1.1, letterSpacing: -0.6, color: C.teal, marginBottom: 24 }}>
            <span style={{ display: "block", whiteSpace: "nowrap" as const }}>Government correspondence,</span>
            <span style={{ display: "block", whiteSpace: "nowrap" as const }}>made human</span>
          </h1>

          {/* Subheading */}
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: C.tealSoft, maxWidth: 560, lineHeight: 1.75, marginBottom: 44 }}>
            PULSE helps Singapore citizens understand CPF and government correspondence in their own language — with AI, live officer escalation, and full accessibility.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" as const, justifyContent: "center" }}>
            <a href="/chat"
              style={{ background: C.teal, color: C.bg, textDecoration: "none", padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 15, boxShadow: "0 4px 18px rgba(11,97,96,.22)", transition: "transform .15s, box-shadow .15s, background .15s", display: "block" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.background = "#094f4e"; el.style.boxShadow = "0 8px 24px rgba(11,97,96,.3)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.background = C.teal; el.style.boxShadow = "0 4px 18px rgba(11,97,96,.22)"; }}>
              Try the chatbot
            </a>
            <a href="#demos"
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.teal, textDecoration: "none", padding: "14px 32px", borderRadius: 10, fontWeight: 600, fontSize: 15, transition: "background .15s, border-color .15s", display: "block" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(11,97,96,.05)"; el.style.borderColor = C.borderHover; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = C.surface; el.style.borderColor = C.border; }}>
              See our demos
            </a>
          </div>
        </div>

      </section>

      {/* Scroll hint — pinned to the viewport so it's visible on first load
          regardless of hero content height; fades out slowly once scrolled. */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed", bottom: 36, left: "50%", zIndex: 40, transform: `translateX(-50%) translateY(${scrolled ? 10 : 0}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          opacity: scrolled ? 0 : 1, pointerEvents: scrolled ? "none" : "auto",
          transition: "opacity .8s ease, transform .8s ease",
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: PASTELS[0].bg, boxShadow: "0 4px 16px rgba(11,97,96,.16)", display: "flex", alignItems: "center", justifyContent: "center", animation: "bounce 2.2s ease-in-out infinite" }}>
          <Icon size={18} path={<polyline points="6 9 12 15 18 9" />} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.tealFaint, textTransform: "uppercase" as const, background: C.bg, padding: "2px 8px", borderRadius: 6 }}>Scroll</span>
      </div>

      {/* ── Features ── */}
      <section aria-labelledby="features-heading" style={{ padding: "96px 52px", background: C.bgAlt }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 2, color: C.tealFaint, marginBottom: 12 }}>Core capabilities</p>
          <h2 id="features-heading" style={{ fontFamily: FONT_HEADING, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, color: C.teal, marginBottom: 12, letterSpacing: -0.3 }}>
            Built for real people
          </h2>
          <div style={{ width: 44, height: 3, background: C.teal, borderRadius: 2, marginBottom: 56, opacity: 0.5 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => {
              const p = PASTELS[i % PASTELS.length];
              return (
                <button key={f.title} type="button" onClick={() => setOpenFeature(i)}
                  style={{ textAlign: "left", cursor: "pointer", font: "inherit", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "30px 26px", transition: "border-color .2s, box-shadow .2s, transform .2s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.borderHover; el.style.boxShadow = "0 12px 28px rgba(11,97,96,.08)"; el.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.boxShadow = "none"; el.style.transform = "translateY(0)"; }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: p.bg, color: p.fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <Icon path={f.icon} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.teal, marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ fontSize: 14.5, fontWeight: 500, color: C.tealSoft, lineHeight: 1.5, marginBottom: 16 }}>{f.desc}</p>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: p.fg }}>View research →</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Demo links ── */}
      <section id="demos" aria-labelledby="demos-heading" style={{ padding: "96px 52px", background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 2, color: C.tealFaint, marginBottom: 12 }}>Live demos</p>
          <h2 id="demos-heading" style={{ fontFamily: FONT_HEADING, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, color: C.teal, marginBottom: 12, letterSpacing: -0.3 }}>
            Explore the system
          </h2>
          <div style={{ width: 44, height: 3, background: C.teal, borderRadius: 2, marginBottom: 56, opacity: 0.5 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
            {DEMOS.map((d, i) => {
              const p = PASTELS[i % PASTELS.length];
              return (
                <a key={d.href} href={d.href}
                  style={{ display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "26px 22px", textDecoration: "none", color: "inherit", transition: "transform .18s, border-color .18s, box-shadow .18s" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-4px)"; el.style.borderColor = C.borderHover; el.style.boxShadow = "0 14px 32px rgba(11,97,96,.1)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.borderColor = C.border; el.style.boxShadow = "none"; }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: p.bg, color: p.fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                    <Icon size={18} path={d.icon} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.teal, marginBottom: 10 }}>{d.label}</h3>
                  <p style={{ fontSize: 13.5, color: C.tealSoft, lineHeight: 1.68, flex: 1, marginBottom: 20 }}>{d.desc}</p>
                  <span style={{ fontSize: 13, fontWeight: 700, color: p.fg }}>{d.cta}</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{ background: C.bgAlt, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "48px 52px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 32, textAlign: "center" as const }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div style={{ fontFamily: FONT_HEADING, fontSize: 36, fontWeight: 600, color: C.teal, letterSpacing: -0.5, marginBottom: 8 }}>{s.stat}</div>
              <div style={{ fontSize: 13, color: C.tealSoft, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "40px 52px", background: C.bg, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: C.bg, fontWeight: 700, fontSize: 12, fontFamily: FONT_HEADING }}>P</span>
          </div>
          <span style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 15, letterSpacing: 0.5, color: C.tealFaint }}>PULSE</span>
        </div>
        <span style={{ fontSize: 13, color: C.tealFaint }}>People-centric Framework for Correspondence · Singapore</span>
        <div style={{ display: "flex", gap: 6 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} style={{ fontSize: 13, color: C.tealFaint, textDecoration: "none", padding: "4px 10px", borderRadius: 6, transition: "color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.teal)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.tealFaint)}>
              {l.label}
            </a>
          ))}
        </div>
      </footer>

      {/* ── Capability research popup ── */}
      {openFeature !== null && (() => {
        const f = FEATURES[openFeature];
        const p = PASTELS[openFeature % PASTELS.length];
        return (
          <div
            role="dialog" aria-modal="true" aria-labelledby="research-modal-heading"
            onClick={() => setOpenFeature(null)}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(11,97,96,.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: C.bg, borderRadius: 20, maxWidth: 520, width: "100%", padding: "36px 32px", boxShadow: "0 24px 64px rgba(11,97,96,.28)", position: "relative" }}
            >
              <button type="button" aria-label="Close" onClick={() => setOpenFeature(null)}
                style={{ position: "absolute", top: 18, right: 18, width: 32, height: 32, borderRadius: "50%", border: "none", background: C.bgAlt, color: C.teal, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} path={<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>} />
              </button>

              <div style={{ width: 46, height: 46, borderRadius: 12, background: p.bg, color: p.fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <Icon path={f.icon} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.5, color: p.fg, marginBottom: 8 }}>{f.title}</p>
              <h3 id="research-modal-heading" style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 600, color: C.teal, marginBottom: 16, letterSpacing: -0.2 }}>
                {f.research.heading}
              </h3>
              <p style={{ fontSize: 14.5, color: C.tealSoft, lineHeight: 1.75, marginBottom: 18 }}>{f.research.body}</p>
              <p style={{ fontSize: 12.5, color: C.tealFaint, lineHeight: 1.6, fontStyle: "italic" as const, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>{f.research.source}</p>
            </div>
          </div>
        );
      })()}

      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
}
