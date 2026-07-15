"use client";

import { useState, useRef } from "react";
import BackHomeButton from "@/components/BackHomeButton";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

// ── CPF brand tokens (mirrors /cpf) ─────────────────────────────────────────
const CPF = {
  teal:   "#0a6160",
  darkCyan: "#0e7c78",
  lime:   "#a5cf4c",
  bg:     "#f7f7f7",
  white:  "#ffffff",
  ftText: "#e6eded",
  text:   "#1a1a1a",
  mid:    "#555555",
  light:  "#888888",
  border: "#dddddd",
} as const;
const FONT = "'Montserrat','Segoe UI',Arial,sans-serif";

function Icon({ path, size = 20 }: { path: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
}

const ICONS = {
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
  chevronDown: <polyline points="6 9 12 15 18 9" />,
  wallet: (
    <>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18" />
      <path d="M5 8l-3 6a3 3 0 0 0 6 0z" />
      <path d="M19 8l-3 6a3 3 0 0 0 6 0z" />
      <path d="M5 8h14" />
      <path d="M8 21h8" />
    </>
  ),
  shield: <path d="M12 2l8 3v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5z" />,
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </>
  ),
  refresh: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="11" x2="8" y2="11.01" />
      <line x1="12" y1="11" x2="12" y2="11.01" />
      <line x1="16" y1="11" x2="16" y2="11.01" />
    </>
  ),
} as const;

// ── Content ──────────────────────────────────────────────────────────────────
const USES = [
  { icon: ICONS.wallet, title: "Downpayment", body: "Pay part of the purchase price upfront when you buy an HDB flat, private property, or vacant land you're building on." },
  { icon: ICONS.calendar, title: "Monthly loan instalments", body: "Service your HDB loan or bank loan instalments directly from your Ordinary Account each month." },
  { icon: ICONS.scale, title: "Stamp & legal fees", body: "Cover stamp duty, legal fees, and other costs incurred in the purchase of your home." },
  { icon: ICONS.shield, title: "Home Protection Scheme", body: "Pay the premiums that insure your outstanding HDB loan against death, terminal illness, or total permanent disability." },
];

const GRANTS = [
  { name: "Family Grant", amount: "Up to $50,000", body: "For eligible families buying a resale HDB flat, subject to household income and flat-type criteria." },
  { name: "Enhanced Housing Grant (EHG)", amount: "Up to $30,000", body: "For first-timer families and singles, with the amount tapering based on household income." },
  { name: "Proximity Housing Grant (PHG)", amount: "Up to $30,000", body: "For buying a resale flat to live with, or near, your parents or married child." },
  { name: "Singles Grant", amount: "Up to $25,000", body: "For eligible singles buying a resale flat on their own or jointly with another singles-scheme buyer." },
];

const FAQS = [
  { q: "What's the maximum CPF savings I can use to buy my home?", a: "You can use your Ordinary Account savings up to the Withdrawal Limit — 120% of your property's Valuation Limit — provided the Basic Retirement Sum set-aside requirement is met if you're financing the purchase with a bank loan." },
  { q: "How much do I need to refund when I sell my flat?", a: "You'll need to refund the CPF principal amount you withdrew, plus the accrued interest those savings would have earned had they remained in your CPF account, back into your Ordinary and Special/Retirement Accounts." },
  { q: "Do I need to buy the Home Protection Scheme (HPS)?", a: "Yes — if you're using CPF savings to service an HDB loan, you're required to be covered under HPS, which insures your outstanding loan against death, terminal illness, or total permanent disability." },
  { q: "Can I still use my CPF for housing after I turn 55?", a: "Yes. From age 55 you'll first need to set aside your Full Retirement Sum in your Retirement Account — in cash, CPF savings, or by pledging your property for the shortfall — before using further CPF savings on housing." },
];

const TOOLS = [
  { icon: ICONS.calculator, label: "Housing Usage Calculator", body: "Estimate how much CPF you can use for your next home." },
  { icon: ICONS.home, label: "Home Purchase Planner", body: "Plan your budget across cash, CPF, and loan instalments." },
  { icon: ICONS.wallet, label: "Home Ownership Dashboard", body: "Track your CPF housing usage and refund obligations." },
];

function Accordion({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: `1px solid ${CPF.border}` }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "none", border: "none", padding: "16px 4px", cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: CPF.text }}>{q}</span>
        <span style={{ color: CPF.teal, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <Icon size={18} path={ICONS.chevronDown} />
        </span>
      </button>
      {open && <p style={{ fontSize: 14, color: CPF.mid, lineHeight: 1.7, padding: "0 4px 18px" }}>{a}</p>}
    </div>
  );
}

// ── PULSE chat widget (mirrors /cpf) ────────────────────────────────────────
type Role = "user" | "agent";
interface Msg { role: Role; content: string; }
const CHAT_LANGS = [{ l: "EN", c: "en" }, { l: "中文", c: "zh" }, { l: "BM", c: "ms" }, { l: "த", c: "ta" }];

function PulseWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "agent", content: "Hi! I'm PULSE, CPF Board's virtual assistant. Ask me anything about using your CPF for housing, or CPF schemes, contributions, and account services." }]);
  const [text, setText] = useState("");
  const [lang, setLang] = useState("en");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  async function send() {
    const t = text.trim(); if (!t || busy) return;
    setText(""); setErr(null);
    setMsgs((p) => [...p, { role: "user", content: t }]);
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/query`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, conversationHistory: msgs, language: lang }) });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setMsgs((p) => [...p, { role: "agent", content: j?.data?.content ?? "Sorry, I couldn't get a response." }]);
    } catch { setErr("Couldn't reach PULSE — please try again."); }
    finally { setBusy(false); setTimeout(() => logRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 50); }
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", fontFamily: FONT }}>
      {open && (
        <div style={{ width: 360, height: 500, background: CPF.white, borderRadius: 10, boxShadow: "0 8px 40px rgba(0,0,0,.22)", display: "flex", flexDirection: "column", overflow: "hidden", marginBottom: 12 }}>
          <div style={{ background: CPF.teal, borderBottom: `4px solid ${CPF.lime}`, color: CPF.white, padding: "11px 14px", display: "flex", alignItems: "center", gap: 9, flexShrink: 0, whiteSpace: "nowrap" }}>
            <img src="https://www.cpf.gov.sg/Failover-NS/image/cpf-logo.svg" alt="CPF" height="22" style={{ filter: "brightness(0) invert(1)", flexShrink: 0 }} />
            <div style={{ flex: 1, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>PULSE Virtual Assistant</div>
            <button aria-label="Close chat" onClick={() => setOpen(false)}
              style={{ appearance: "none", WebkitAppearance: "none", boxSizing: "border-box", width: 30, height: 30, padding: 0, margin: 0, flexShrink: 0, borderRadius: "50%", border: "2px solid rgba(255,255,255,.5)", background: "rgba(255,255,255,.16)", color: CPF.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.16)"; }}>
              <Icon size={14} path={ICONS.close} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderBottom: `1px solid ${CPF.border}`, background: CPF.white, flexShrink: 0 }}>
            {CHAT_LANGS.map((x) => (
              <button key={x.c} onClick={() => setLang(x.c)} style={{ background: lang === x.c ? CPF.teal : CPF.bg, color: lang === x.c ? CPF.white : CPF.mid, border: `1px solid ${lang === x.c ? CPF.teal : CPF.border}`, borderRadius: 14, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{x.l}</button>
            ))}
          </div>
          <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 9, background: "#f4f5f6" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", padding: "9px 12px", borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", background: m.role === "user" ? CPF.teal : CPF.white, color: m.role === "user" ? CPF.white : CPF.text, fontSize: 13, lineHeight: 1.55, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>{m.content}</div>
              </div>
            ))}
            {busy && <div style={{ alignSelf: "flex-start", background: CPF.white, borderRadius: "12px 12px 12px 3px", padding: "9px 14px", fontSize: 18, letterSpacing: 3, color: "#bbb", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>···</div>}
            {err && <p style={{ color: "#c00", fontSize: 12, textAlign: "center" }}>{err}</p>}
          </div>
          <div style={{ flexShrink: 0, padding: "9px 11px", borderTop: `1px solid ${CPF.border}`, display: "flex", gap: 8, background: CPF.white }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="Type your question…" rows={2} disabled={busy}
              style={{ flex: 1, resize: "none", border: `1.5px solid ${CPF.border}`, borderRadius: 6, padding: "7px 9px", fontSize: 13, fontFamily: FONT, outline: "none" }} />
            <button onClick={() => void send()} disabled={busy || !text.trim()} style={{ appearance: "none", WebkitAppearance: "none", boxSizing: "border-box", width: 38, height: 38, padding: 0, margin: 0, flexShrink: 0, borderRadius: "50%", border: "none", background: busy || !text.trim() ? "#ccc" : CPF.teal, color: CPF.white, cursor: busy || !text.trim() ? "default" : "pointer", alignSelf: "flex-end", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={16} path={ICONS.send} /></button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} style={{ appearance: "none", WebkitAppearance: "none", boxSizing: "border-box", width: 56, height: 56, padding: 0, margin: 0, flexShrink: 0, borderRadius: "50%", border: `3px solid ${CPF.lime}`, background: CPF.teal, color: CPF.white, cursor: "pointer", boxShadow: "0 4px 16px rgba(10,97,96,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={open ? 20 : 22} path={open ? ICONS.close : ICONS.chat} />
      </button>
    </div>
  );
}

export default function CpfHousingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showLogin, setShowLogin] = useState(false);
  const [search, setSearch] = useState("");

  function demo(msg: string) { alert(msg + "\n\n(PULSE demo — full service is available at cpf.gov.sg)"); }
  function go(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{background:${CPF.bg};font-family:${FONT};}
      ` }} />

      <BackHomeButton />

      {showLogin && (
        <div onClick={() => setShowLogin(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: CPF.white, borderRadius: 8, padding: "32px 36px", maxWidth: 400, width: "90%", borderTop: `6px solid ${CPF.lime}` }}>
            <img src="https://www.cpf.gov.sg/Failover-NS/image/cpf-logo.svg" alt="CPF" height="34" style={{ filter: `sepia(1) saturate(3) hue-rotate(130deg) brightness(0.5)` }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: CPF.teal, margin: "18px 0 8px" }}>Log in to my cpf</h2>
            <p style={{ fontSize: 13, color: CPF.mid, marginBottom: 20, lineHeight: 1.65 }}>In the real portal, you authenticate via Singpass. This is a PULSE demonstration — click below to continue as a demo user.</p>
            <button onClick={() => setShowLogin(false)} style={{ width: "100%", background: CPF.teal, color: CPF.white, border: "none", borderRadius: 4, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer", borderBottom: `4px solid ${CPF.lime}`, marginBottom: 8 }}>
              Continue as Demo User →
            </button>
            <button onClick={() => setShowLogin(false)} style={{ width: "100%", background: "transparent", color: CPF.mid, border: `1px solid ${CPF.border}`, borderRadius: 4, padding: "10px", fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ fontFamily: FONT, background: CPF.bg, minHeight: "100vh", color: CPF.text, fontSize: 16 }}>

        {/* Government masthead */}
        <div style={{ background: CPF.white, borderBottom: `1px solid ${CPF.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "7px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: CPF.mid }}>
              <svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#5B21B6" /><text x="10" y="14" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">SG</text></svg>
              A Singapore Government Agency Website
            </div>
          </div>
        </div>

        {/* Header */}
        <header style={{ background: CPF.teal, borderBottom: `7px solid ${CPF.lime}`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,.18)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 18px", display: "flex", alignItems: "stretch" }}>
            <a href="/cpf" style={{ display: "flex", alignItems: "center", padding: "10px 28px 10px 0", borderRight: `1px solid rgba(255,255,255,.15)` }}>
              <img src="https://www.cpf.gov.sg/Failover-NS/image/cpf-logo.svg" alt="CPF Board" height="34" style={{ filter: "brightness(0) invert(1)" }} />
            </a>
            <nav style={{ display: "flex", flex: 1 }}>
              {([["overview", "Overview"], ["limits", "Withdrawal Limits"], ["grants", "Grants"], ["faqs", "FAQs"]] as [string, string][]).map(([id, lbl]) => (
                <button key={id} onClick={() => go(id)} style={{ background: "none", border: "none", borderBottom: "3px solid transparent", color: "rgba(255,255,255,.9)", padding: "0 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "border-color .15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = CPF.lime)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}>
                  {lbl}
                </button>
              ))}
            </nav>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
              <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,.12)", borderRadius: 10, overflow: "hidden" }}>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
                  onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) demo(`Searching for: "${search.trim()}"`); }}
                  style={{ background: "transparent", border: "none", color: CPF.white, padding: "8px 12px", fontSize: 13, fontFamily: FONT, outline: "none", width: 150 }} />
                <button onClick={() => search.trim() && demo(`Searching for: "${search.trim()}"`)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}><Icon size={16} path={ICONS.search} /></button>
              </div>
              <button onClick={() => setShowLogin(true)} style={{ background: CPF.lime, color: "#1a3a00", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                Log in to my cpf
              </button>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div style={{ background: CPF.white, borderBottom: `1px solid ${CPF.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 18px", fontSize: 13, color: CPF.mid, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <a href="/cpf" style={{ color: CPF.teal, textDecoration: "none", fontWeight: 600 }}>cpf.gov.sg</a>
            <span>›</span>
            <span>Member</span>
            <span>›</span>
            <a href="/cpf#topics" style={{ color: CPF.teal, textDecoration: "none", fontWeight: 600 }}>Home Ownership</a>
            <span>›</span>
            <span style={{ color: CPF.text, fontWeight: 600 }}>Using your CPF to buy a home</span>
          </div>
        </div>

        {/* Hero */}
        <section id="overview" style={{ background: "#c1d9d2" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 18px", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.55)", color: CPF.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={30} path={ICONS.home} />
            </div>
            <div style={{ maxWidth: 700 }}>
              <h1 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 800, color: CPF.text, lineHeight: 1.2, marginBottom: 12, letterSpacing: "-0.5px" }}>
                Using your CPF to buy a home
              </h1>
              <p style={{ fontSize: 16, color: "rgba(26,26,26,.8)", lineHeight: 1.7 }}>
                Buy a home that you can afford, and adopt the right mortgage repayment strategy — one that balances your cash flow today with the retirement savings you'll need tomorrow.
              </p>
            </div>
          </div>
        </section>

        {/* What you can use CPF for */}
        <section style={{ padding: "48px 18px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ fontSize: 14.5, color: CPF.mid, lineHeight: 1.8, marginBottom: 32, maxWidth: 820 }}>
              You can use your Ordinary Account (OA) savings to help finance the purchase of an HDB flat, a private residential property, or vacant land that you're building on. Your CPF savings can go towards:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 18 }}>
              {USES.map((u) => (
                <div key={u.title} style={{ background: CPF.white, border: `1px solid ${CPF.border}`, borderRadius: 10, padding: "22px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e8f5e9", color: "#1a5c2a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon size={20} path={u.icon} />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: CPF.text, marginBottom: 8 }}>{u.title}</h3>
                  <p style={{ fontSize: 13.5, color: CPF.mid, lineHeight: 1.65 }}>{u.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Withdrawal limits */}
        <section id="limits" style={{ background: CPF.white, padding: "48px 18px", borderTop: `1px solid ${CPF.border}`, borderBottom: `1px solid ${CPF.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: CPF.teal, marginBottom: 8, letterSpacing: "-0.5px" }}>Know your CPF withdrawal limits</h2>
            <div style={{ width: 56, height: 5, background: CPF.lime, borderRadius: 3, marginBottom: 24 }} />
            <p style={{ fontSize: 14.5, color: CPF.mid, lineHeight: 1.8, marginBottom: 28, maxWidth: 820 }}>
              Two limits determine how much of your CPF OA savings you and your co-owners can put towards your property.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20, marginBottom: 28 }}>
              <div style={{ border: `1.5px solid ${CPF.teal}`, borderRadius: 10, padding: "22px 24px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, color: CPF.teal, marginBottom: 10 }}>Valuation Limit (VL)</p>
                <p style={{ fontSize: 14, color: CPF.mid, lineHeight: 1.75 }}>The lower of your property's purchase price or its market value at the time of purchase. You can use your OA savings up to this amount.</p>
              </div>
              <div style={{ border: `1.5px solid ${CPF.teal}`, borderRadius: 10, padding: "22px 24px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, color: CPF.teal, marginBottom: 10 }}>Withdrawal Limit (WL)</p>
                <p style={{ fontSize: 14, color: CPF.mid, lineHeight: 1.75 }}>120% of the Valuation Limit. This is the maximum CPF savings you and your co-owners can use for the property, including the loan.</p>
              </div>
            </div>

            {/* Example box */}
            <div style={{ background: CPF.bg, border: `1px dashed ${CPF.border}`, borderRadius: 10, padding: "20px 24px", marginBottom: 24, maxWidth: 560 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, color: CPF.light, marginBottom: 12 }}>Worked example</p>
              {[
                ["Purchase price / market value", "$500,000"],
                ["Valuation Limit", "$500,000"],
                ["Withdrawal Limit (120%)", "$600,000"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
                  <span style={{ color: CPF.mid }}>{k}</span>
                  <span style={{ fontWeight: 700, color: CPF.text }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#fff8e1", border: "1px solid #f0dfa0", borderRadius: 10, padding: "16px 20px", maxWidth: 820 }}>
              <span style={{ color: "#7a4a00", flexShrink: 0, marginTop: 2 }}><Icon size={18} path={ICONS.scale} /></span>
              <p style={{ fontSize: 13.5, color: "#5c3a00", lineHeight: 1.7 }}>
                If you're taking a <strong>bank loan</strong> and wish to use CPF savings beyond the Valuation Limit (up to the Withdrawal Limit), you'll first need to set aside the prevailing <strong>Basic Retirement Sum</strong> in your CPF accounts.
              </p>
            </div>
          </div>
        </section>

        {/* Rainy day tip */}
        <section style={{ padding: "40px 18px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "#e3f2fd", border: "1px solid #b3d8f5", borderRadius: 10, padding: "22px 24px" }}>
              <span style={{ color: "#1a4a6e", flexShrink: 0 }}><Icon size={22} path={ICONS.wallet} /></span>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a4a6e", marginBottom: 6 }}>Keep enough for a rainy day</h3>
                <p style={{ fontSize: 14, color: CPF.mid, lineHeight: 1.75 }}>
                  Consider keeping around $20,000 in your Ordinary Account as a buffer for future monthly instalments, and think carefully about how much cash versus CPF savings to use upfront. The more CPF you use now, the less you'll have earning interest for retirement later.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Grants */}
        <section id="grants" style={{ background: CPF.white, padding: "48px 18px", borderTop: `1px solid ${CPF.border}`, borderBottom: `1px solid ${CPF.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: CPF.teal, marginBottom: 8, letterSpacing: "-0.5px" }}>CPF Housing Grants</h2>
            <div style={{ width: 56, height: 5, background: CPF.lime, borderRadius: 3, marginBottom: 24 }} />
            <p style={{ fontSize: 14.5, color: CPF.mid, lineHeight: 1.8, marginBottom: 28, maxWidth: 820 }}>
              If you're buying a resale HDB flat, you may qualify for one or more housing grants on top of your CPF savings — these are disbursed directly into your CPF Ordinary Account.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 18 }}>
              {GRANTS.map((g) => (
                <div key={g.name} style={{ border: `1px solid ${CPF.border}`, borderRadius: 10, padding: "20px 20px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ color: "#7a4a00" }}><Icon size={22} path={ICONS.gift} /></span>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: CPF.text }}>{g.name}</h3>
                  <p style={{ fontSize: 18, fontWeight: 800, color: CPF.teal }}>{g.amount}</p>
                  <p style={{ fontSize: 13, color: CPF.mid, lineHeight: 1.65, flex: 1 }}>{g.body}</p>
                  <button onClick={() => demo(`Opening: ${g.name} eligibility details`)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: CPF.teal, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginTop: 4 }}>Check eligibility →</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Refund */}
        <section style={{ padding: "48px 18px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 24 }}>
            <div>
              <span style={{ color: CPF.teal, display: "inline-flex", marginBottom: 12 }}><Icon size={26} path={ICONS.refresh} /></span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: CPF.text, marginBottom: 10 }}>Refunding your CPF savings</h3>
              <p style={{ fontSize: 14, color: CPF.mid, lineHeight: 1.8 }}>
                When you sell your property, you'll need to refund the CPF savings you withdrew — plus the accrued interest those savings would have earned — back into your CPF accounts. This restores your retirement savings. Any amount pledged to meet your Retirement Sum will also need to be refunded, or topped up in cash.
              </p>
            </div>
            <div>
              <span style={{ color: CPF.teal, display: "inline-flex", marginBottom: 12 }}><Icon size={26} path={ICONS.calendar} /></span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: CPF.text, marginBottom: 10 }}>Using CPF for housing after 55</h3>
              <p style={{ fontSize: 14, color: CPF.mid, lineHeight: 1.8 }}>
                From age 55, a Retirement Account is created and you'll first need to set aside your Full Retirement Sum — in cash, CPF savings, or by pledging your property for the shortfall — before using further CPF savings on housing.
              </p>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section style={{ background: CPF.white, padding: "44px 18px", borderTop: `1px solid ${CPF.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: CPF.mid, marginBottom: 16 }}>Tools & services</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {TOOLS.map((tl) => (
                <button key={tl.label} onClick={() => demo(`Opening: ${tl.label}`)}
                  style={{ display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left", background: CPF.bg, border: `1px solid ${CPF.border}`, borderRadius: 12, padding: "16px 20px", fontFamily: FONT, cursor: "pointer", minWidth: 240, flex: "1 1 240px", transition: "all .15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = CPF.teal; (e.currentTarget as HTMLButtonElement).style.borderColor = CPF.teal; e.currentTarget.querySelectorAll("span,p").forEach((el) => ((el as HTMLElement).style.color = CPF.white)); }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = CPF.bg; (e.currentTarget as HTMLButtonElement).style.borderColor = CPF.border; (e.currentTarget.querySelector("span") as HTMLElement).style.color = CPF.teal; (e.currentTarget.querySelector("p") as HTMLElement).style.color = CPF.mid; }}>
                  <span style={{ color: CPF.teal, flexShrink: 0 }}><Icon size={22} path={tl.icon} /></span>
                  <span>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: CPF.text, marginBottom: 4 }}>{tl.label}</span>
                    <p style={{ fontSize: 12.5, color: CPF.mid, lineHeight: 1.5, margin: 0 }}>{tl.body}</p>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section id="faqs" style={{ padding: "48px 18px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: CPF.teal, marginBottom: 8, letterSpacing: "-0.5px" }}>Frequently asked questions</h2>
            <div style={{ width: 56, height: 5, background: CPF.lime, borderRadius: 3, marginBottom: 12 }} />
            <div style={{ background: CPF.white, border: `1px solid ${CPF.border}`, borderRadius: 10, padding: "4px 20px" }}>
              {FAQS.map((f, i) => (
                <Accordion key={f.q} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq((cur) => (cur === i ? null : i))} />
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: CPF.teal, borderTop: `7px solid ${CPF.lime}`, color: CPF.ftText, padding: "36px 18px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ marginBottom: 24 }}>
              <img src="https://www.cpf.gov.sg/Failover-NS/image/cpf-logo.svg" alt="CPF Board" height="30" style={{ filter: "brightness(0) invert(1)", opacity: .8 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 24, marginBottom: 28 }}>
              {[
                { h: "CPF Board", links: ["About CPF Board", "Board members", "Careers", "Press releases", "Legislation"] },
                { h: "Home Ownership", links: ["Home Purchase Planner", "CPF Housing Grants", "Home buying guide (below 55)", "Home buying guide (above 55)"] },
                { h: "Useful Links", links: ["Contact us", "Feedback", "Report a scam", "Sitemap", "Accessibility"] },
                { h: "Connect with us", links: ["Facebook", "Instagram", "YouTube", "LinkedIn", "WhatsApp", "Telegram"] },
              ].map((col) => (
                <div key={col.h}>
                  <p style={{ color: CPF.lime, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: .8, marginBottom: 12 }}>{col.h}</p>
                  {col.links.map((lk) => (
                    <button key={lk} onClick={() => demo(`Opening: ${lk}`)}
                      style={{ display: "block", background: "none", border: "none", color: CPF.ftText, fontSize: 13, marginBottom: 8, cursor: "pointer", opacity: .82, fontFamily: FONT, textAlign: "left", padding: 0 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = CPF.lime)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = CPF.ftText)}>
                      {lk}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(230,237,237,.5)" }}>© 2025, Government of Singapore · Last Updated 17 Jan 2025</span>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {["Privacy Statement", "Terms of Use", "Security Practices", "Accessibility"].map((lk) => (
                  <button key={lk} onClick={() => demo(`Opening: ${lk}`)} style={{ background: "none", border: "none", color: "rgba(230,237,237,.5)", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>{lk}</button>
                ))}
              </div>
            </div>
          </div>
        </footer>

        {/* Demo disclaimer */}
        <div style={{ background: "#111", padding: "12px 18px", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
            <strong style={{ color: "rgba(255,255,255,.65)" }}>Demo only.</strong>
            Simulated CPF portal for research purposes. No real CPF data. Visit{" "}
            <a href="https://www.cpf.gov.sg" target="_blank" rel="noopener noreferrer" style={{ color: CPF.lime }}>cpf.gov.sg</a> for your actual account.
          </p>
        </div>
      </div>

      <PulseWidget />
    </>
  );
}
