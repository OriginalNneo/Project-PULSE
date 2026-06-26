"use client";

import dynamic from "next/dynamic";

interface DotFieldProps {
  dotRadius?: number;
  dotSpacing?: number;
  cursorRadius?: number;
  cursorForce?: number;
  bulgeOnly?: boolean;
  bulgeStrength?: number;
  glowRadius?: number;
  sparkle?: boolean;
  waveAmplitude?: number;
  gradientFrom?: string;
  gradientTo?: string;
  glowColor?: string;
}

const DotField = dynamic<DotFieldProps>(() => import("@/components/DotField"), { ssr: false });

// ── Forest-tech color palette ─────────────────────────────────────────────────
const F = {
  bg0:    "#050D07",   // hero bg — near-black forest
  bg1:    "#07120A",   // features bg
  bg2:    "#060E08",   // demos bg
  card:   "rgba(255,255,255,.03)",
  border: "rgba(74,222,128,.12)",
  borderHover: "rgba(74,222,128,.42)",
  lime:   "#4ADE80",   // primary accent — bright lime
  emerald:"#10B981",   // secondary accent
  teal:   "#2DD4BF",   // tertiary highlight
  textPrimary:   "#E8F5E3",
  textSecondary: "rgba(232,245,227,.55)",
  textMuted:     "rgba(232,245,227,.32)",
  navText:       "rgba(232,245,227,.72)",
} as const;

const NAV_LINKS = [
  { label: "Chat",              href: "/chat" },
  { label: "CPF Portal",        href: "/cpf" },
  { label: "Officer Dashboard", href: "/dashboard" },
  { label: "Text Us Demo",      href: "/textus" },
];

const FEATURES = [
  {
    icon: "🌐",
    title: "Multilingual by default",
    desc: "English, Mandarin, Malay, Tamil, and seven dialects. Responds in the language the citizen writes in.",
    accent: F.lime,
  },
  {
    icon: "🤖",
    title: "AI-powered answers",
    desc: "Retrieves from the CPF knowledge base and generates concise, accurate replies — not canned responses.",
    accent: F.emerald,
  },
  {
    icon: "📡",
    title: "Omnichannel reach",
    desc: "Works across web chat, WhatsApp Text Us, and Telegram — one backend serving every channel.",
    accent: F.teal,
  },
  {
    icon: "🧑‍💼",
    title: "Officer escalation",
    desc: "Detects frustration and complexity in real time, and hands off to a live officer with full context.",
    accent: F.lime,
  },
];

const DEMOS = [
  {
    label: "Simulated CPF Portal",
    desc:  "See PULSE embedded as a chatbot inside a mock CPF member portal.",
    href:  "/cpf",
    cta:   "Open portal →",
    accent: "#22C55E",
    icon:  "🏛️",
  },
  {
    label: "Officer Dashboard",
    desc:  "Live queue, WebSocket updates, AI-generated case summaries, and translation.",
    href:  "/dashboard",
    cta:   "Open dashboard →",
    accent: "#2DD4BF",
    icon:  "🖥️",
  },
  {
    label: "WhatsApp Text Us",
    desc:  "Simulates the CPF Board Text Us flow including pre-filled message validation.",
    href:  "/textus",
    cta:   "Open demo →",
    accent: "#86EFAC",
    icon:  "📱",
  },
  {
    label: "Chat Interface",
    desc:  "Standalone citizen chat — multilingual, voice notes, and escalation flow.",
    href:  "/chat",
    cta:   "Open chat →",
    accent: "#34D399",
    icon:  "💬",
  },
];

export default function HomePage() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: F.bg0, color: F.textPrimary, minHeight: "100vh" }}>

      {/* ── Hero ── */}
      <section style={{ position: "relative", height: "100vh", minHeight: 620, overflow: "hidden", background: F.bg0 }}>

        {/* DotField — green bioluminescent particles */}
        <div style={{ position: "absolute", inset: 0 }}>
          <DotField
            dotRadius={1.4}
            dotSpacing={13}
            bulgeStrength={80}
            glowRadius={200}
            sparkle={false}
            waveAmplitude={0}
            gradientFrom="rgba(34, 197, 94, 0.32)"
            gradientTo="rgba(16, 185, 129, 0.18)"
            glowColor={F.bg0}
          />
        </div>

        {/* Radial vignette */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 25%, #050D07 100%)", pointerEvents: "none" }} />

        {/* Atmospheric forest floor glow — bottom edge */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 180, background: "linear-gradient(to top, rgba(16,185,129,.08) 0%, transparent 100%)", pointerEvents: "none" }} />

        {/* Nav */}
        <nav aria-label="Site navigation" style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px 52px" }}>
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#22C55E,#10B981)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(34,197,94,.4)" }}>
              <span style={{ color: "#050D07", fontWeight: 900, fontSize: 13, letterSpacing: 0.5 }}>P</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: 2, color: F.textPrimary }}>PULSE</span>
          </div>

          <ul style={{ display: "flex", gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}
                  style={{ color: F.navText, textDecoration: "none", fontSize: 14, fontWeight: 500, padding: "8px 14px", borderRadius: 8, transition: "background .15s, color .15s, box-shadow .15s", display: "block" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(74,222,128,.1)"; el.style.color = F.lime; el.style.boxShadow = `0 0 12px rgba(74,222,128,.15)`; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "transparent"; el.style.color = F.navText; el.style.boxShadow = "none"; }}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100% - 90px)", textAlign: "center", padding: "0 24px" }}>

          {/* Pill badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.28)", borderRadius: 100, padding: "6px 18px", fontSize: 12, fontWeight: 600, letterSpacing: 1.5, color: F.lime, marginBottom: 32, textTransform: "uppercase" as const }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: F.lime, boxShadow: `0 0 8px ${F.lime}`, display: "inline-block" }} />
            People-centric Framework for Correspondence
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(46px, 8vw, 86px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: F.textPrimary, marginBottom: 24, maxWidth: 920 }}>
            Government correspondence,{" "}
            <span style={{ background: "linear-gradient(135deg, #4ADE80, #10B981, #2DD4BF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              made human
            </span>
          </h1>

          {/* Subheading */}
          <p style={{ fontSize: "clamp(15px, 2vw, 19px)", color: F.textSecondary, maxWidth: 560, lineHeight: 1.75, marginBottom: 48 }}>
            PULSE helps Singapore citizens understand CPF and government correspondence in their own language — with AI, live officer escalation, and full accessibility.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" as const, justifyContent: "center" }}>
            <a href="/chat"
              style={{ background: "linear-gradient(135deg, #22C55E, #10B981)", color: "#050D07", textDecoration: "none", padding: "14px 34px", borderRadius: 10, fontWeight: 800, fontSize: 15, boxShadow: "0 4px 28px rgba(34,197,94,.4)", transition: "transform .15s, box-shadow .15s", display: "block" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 36px rgba(34,197,94,.55)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 4px 28px rgba(34,197,94,.4)"; }}>
              Try the chatbot
            </a>
            <a href="/cpf"
              style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(74,222,128,.25)", color: F.lime, textDecoration: "none", padding: "14px 34px", borderRadius: 10, fontWeight: 600, fontSize: 15, backdropFilter: "blur(8px)", transition: "background .15s, border-color .15s, box-shadow .15s", display: "block" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(74,222,128,.1)"; el.style.borderColor = "rgba(74,222,128,.5)"; el.style.boxShadow = "0 0 20px rgba(74,222,128,.15)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,.05)"; el.style.borderColor = "rgba(74,222,128,.25)"; el.style.boxShadow = "none"; }}>
              See CPF portal demo
            </a>
          </div>

          {/* Scroll hint */}
          <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: F.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" as const, animation: "bounce 2.2s ease-in-out infinite" }}>
            <span>Scroll</span>
            <span style={{ fontSize: 16, color: F.emerald }}>↓</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section aria-labelledby="features-heading" style={{ padding: "96px 52px", background: F.bg1, position: "relative", overflow: "hidden" }}>
        {/* Subtle canopy glow top-right */}
        <div style={{ position: "absolute", top: -120, right: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          {/* Section label */}
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 2, color: F.emerald, marginBottom: 12 }}>Core capabilities</p>
          <h2 id="features-heading" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: F.textPrimary, marginBottom: 12, letterSpacing: -0.5 }}>
            Built for real people
          </h2>
          <div style={{ width: 48, height: 4, background: "linear-gradient(90deg,#4ADE80,#10B981)", borderRadius: 2, marginBottom: 56 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title}
                style={{ background: F.card, border: `1px solid ${F.border}`, borderRadius: 14, padding: "30px 26px", transition: "border-color .2s, background .2s, box-shadow .2s", position: "relative", overflow: "hidden" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${f.accent}55`; el.style.background = `${f.accent}08`; el.style.boxShadow = `0 8px 32px ${f.accent}18`; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = F.border; el.style.background = F.card; el.style.boxShadow = "none"; }}>
                {/* Subtle corner glow */}
                <div style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${f.accent}14 0%, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ fontSize: 34, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: F.textPrimary, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: F.textSecondary, lineHeight: 1.72 }}>{f.desc}</p>
                <div style={{ width: 32, height: 3, background: f.accent, borderRadius: 2, marginTop: 20, opacity: 0.7 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo links ── */}
      <section aria-labelledby="demos-heading" style={{ padding: "96px 52px", background: F.bg2, position: "relative", overflow: "hidden" }}>
        {/* Bottom-left glow */}
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 2, color: F.lime, marginBottom: 12 }}>Live demos</p>
          <h2 id="demos-heading" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, color: F.textPrimary, marginBottom: 12, letterSpacing: -0.5 }}>
            Explore the system
          </h2>
          <div style={{ width: 48, height: 4, background: "linear-gradient(90deg,#4ADE80,#2DD4BF)", borderRadius: 2, marginBottom: 56 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
            {DEMOS.map((d) => (
              <a key={d.href} href={d.href}
                style={{ display: "flex", flexDirection: "column", background: F.card, border: `1px solid ${F.border}`, borderRadius: 14, padding: "26px 22px", textDecoration: "none", color: "inherit", transition: "transform .18s, border-color .18s, box-shadow .18s, background .18s", position: "relative", overflow: "hidden" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-5px)"; el.style.borderColor = `${d.accent}55`; el.style.boxShadow = `0 16px 48px ${d.accent}20`; el.style.background = `${d.accent}06`; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(0)"; el.style.borderColor = F.border; el.style.boxShadow = "none"; el.style.background = F.card; }}>
                {/* Corner glow */}
                <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${d.accent}18 0%, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ fontSize: 30, marginBottom: 16 }}>{d.icon}</div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.accent, boxShadow: `0 0 10px ${d.accent}`, marginBottom: 16 }} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: F.textPrimary, marginBottom: 10 }}>{d.label}</h3>
                <p style={{ fontSize: 13.5, color: F.textSecondary, lineHeight: 1.68, flex: 1, marginBottom: 20 }}>{d.desc}</p>
                <span style={{ fontSize: 13, fontWeight: 700, color: d.accent }}>{d.cta}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{ background: F.bg1, borderTop: `1px solid ${F.border}`, borderBottom: `1px solid ${F.border}`, padding: "48px 52px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 32, textAlign: "center" as const }}>
          {[
            { stat: "4+",    label: "Languages supported",     accent: F.lime },
            { stat: "< 2s",  label: "Average response time",   accent: F.emerald },
            { stat: "3",     label: "Active channels",         accent: F.teal },
            { stat: "24/7",  label: "AI availability",         accent: F.lime },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 38, fontWeight: 800, color: s.accent, letterSpacing: -1, marginBottom: 8 }}>{s.stat}</div>
              <div style={{ fontSize: 13, color: F.textSecondary, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "40px 52px", background: F.bg0, borderTop: `1px solid ${F.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg,#22C55E,#10B981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#050D07", fontWeight: 900, fontSize: 11 }}>P</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 2, color: F.textMuted }}>PULSE</span>
        </div>
        <span style={{ fontSize: 13, color: F.textMuted }}>People-centric Framework for Correspondence · Singapore</span>
        <div style={{ display: "flex", gap: 6 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} style={{ fontSize: 13, color: F.textMuted, textDecoration: "none", padding: "4px 10px", borderRadius: 6, transition: "color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = F.lime)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = F.textMuted)}>
              {l.label}
            </a>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(7px); }
        }
      `}</style>
    </div>
  );
}
