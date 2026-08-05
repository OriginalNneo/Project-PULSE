"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import BackHomeButton from "@/components/BackHomeButton";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

// ── CPF brand tokens ──────────────────────────────────────────────────────────
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

// Small hand-drawn line icons (no icon library) — used in place of emoji.
function Icon({ path, size = 20 }: { path: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
}

const ICONS = {
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
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  heart: (
    <>
      <path d="M12 21s-7-4.35-9.5-8.5A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6.5C19 16.65 12 21 12 21z" />
      <line x1="9.5" y1="11" x2="14.5" y2="11" />
      <line x1="12" y1="8.5" x2="12" y2="13.5" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="11" x2="8" y2="11.01" />
      <line x1="12" y1="11" x2="12" y2="11.01" />
      <line x1="16" y1="11" x2="16" y2="11.01" />
      <line x1="8" y1="15" x2="8" y2="15.01" />
      <line x1="12" y1="15" x2="12" y2="15.01" />
      <line x1="16" y1="15" x2="16" y2="15.01" />
      <line x1="8" y1="18.5" x2="8" y2="18.51" />
      <line x1="12" y1="18.5" x2="12" y2="18.51" />
      <line x1="16" y1="18.5" x2="16" y2="18.51" />
    </>
  ),
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>
  ),
  clipboard: (
    <>
      <rect x="4" y="4" width="16" height="18" rx="2" />
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v10M15 9.8c0-1.4-1.4-1.8-3-1.8s-3 .8-3 2c0 2.6 6 1 6 3.6 0 1.2-1.4 2-3 2s-3-.4-3-1.8" />
    </>
  ),
  family: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 4 2 5 5 0 0 1 4-2h2a5 5 0 0 1 5 5v1" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  trending: (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
  chat: (
    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  chevronLeft: <polyline points="15 18 9 12 15 6" />,
  chevronRight: <polyline points="9 18 15 12 9 6" />,
  alertTriangle: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
} as const;

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    h1t:"Saving for your golden years", h1s:"Find out how much you need for retirement and how CPF can help you get there.", h1c:"Retirement Planning",
    h2t:"Your home, your CPF",          h2s:"Use your CPF savings to finance your home purchase and pay for housing loans.", h2c:"Housing Schemes",
    h3t:"Healthcare for life",          h3s:"MediSave and MediShield Life protect you and your family from healthcare costs.", h3c:"Healthcare Financing",
    login:"Log in to my cpf", search:"Search", news:"News & Highlights", qTitle:"Quick Access", tTitle:"How can CPF help you?",
    who:"Who we are", tools:"Tools and services", info:"Infohub", learn:"Learn more", viewAll:"View all",
  },
  zh: {
    h1t:"为黄金岁月储蓄", h1s:"了解您退休所需的金额以及公积金如何帮助您实现目标。", h1c:"退休规划",
    h2t:"您的家园，您的公积金", h2s:"使用公积金储蓄资助购屋及偿还房屋贷款。", h2c:"住屋计划",
    h3t:"终身医疗保障", h3s:"保健储蓄和终身健保保障您和家人的医疗费用。", h3c:"医疗融资",
    login:"登入我的公积金", search:"搜索", news:"新闻与亮点", qTitle:"快速通道", tTitle:"公积金如何帮助您？",
    who:"关于我们", tools:"工具与服务", info:"资讯中心", learn:"了解更多", viewAll:"查看全部",
  },
  ms: {
    h1t:"Menabung untuk hari tua", h1s:"Ketahui berapa yang anda perlukan untuk persaraan dan bagaimana CPF boleh membantu.", h1c:"Perancangan Persaraan",
    h2t:"Rumah anda, CPF anda", h2s:"Gunakan simpanan CPF anda untuk membiayai pembelian rumah.", h2c:"Skim Perumahan",
    h3t:"Penjagaan kesihatan sepanjang hayat", h3s:"MediSave dan MediShield Life melindungi anda dan keluarga daripada kos perubatan.", h3c:"Pembiayaan Kesihatan",
    login:"Log masuk ke cpf saya", search:"Cari", news:"Berita & Sorotan", qTitle:"Akses Pantas", tTitle:"Bagaimana CPF boleh membantu anda?",
    who:"Tentang kami", tools:"Alat dan perkhidmatan", info:"Pusat maklumat", learn:"Ketahui lebih lanjut", viewAll:"Lihat semua",
  },
  ta: {
    h1t:"உங்கள் பொற்காலத்திற்கு சேமிக்கவும்", h1s:"ஓய்வூதியத்திற்கு எவ்வளவு தேவை என்பதை அறிந்து CPF எவ்வாறு உதவும் என்பதை கண்டறியுங்கள்.", h1c:"ஓய்வூதிய திட்டமிடல்",
    h2t:"உங்கள் வீடு, உங்கள் CPF", h2s:"வீடு வாங்குவதற்கும் வீட்டுக்கடன் செலுத்துவதற்கும் CPF சேமிப்பை பயன்படுத்துங்கள்.", h2c:"வீட்டுவசதி திட்டங்கள்",
    h3t:"வாழ்நாள் முழுவதும் சுகாதார பாதுகாப்பு", h3s:"MediSave மற்றும் MediShield Life உங்களையும் குடும்பத்தையும் பாதுகாக்கிறது.", h3c:"சுகாதார நிதியுதவி",
    login:"என் cpf-இல் உள்நுழைக", search:"தேடுக", news:"செய்திகள் & சிறப்பம்சங்கள்", qTitle:"விரைவு அணுகல்", tTitle:"CPF உங்களுக்கு எவ்வாறு உதவும்?",
    who:"நாங்கள் யார்", tools:"கருவிகள் மற்றும் சேவைகள்", info:"தகவல் மையம்", learn:"மேலும் அறிக", viewAll:"அனைத்தையும் காண்க",
  },
};

// ── Slides ────────────────────────────────────────────────────────────────────
// Shared muted background across all slides so auto-cycling doesn't jump between
// clashing hues — only text/icon/CTA content changes per slide.
const HERO_BG = "#c1d9d2";
const SLIDES = [
  { k:"h1", icon:ICONS.bank },
  { k:"h2", icon:ICONS.home },
  { k:"h3", icon:ICONS.heart },
];

// ── Quick access ──────────────────────────────────────────────────────────────
const QUICK = [
  { icon:ICONS.person, label:"my cpf Online" },
  { icon:ICONS.calculator, label:"Calculators" },
  { icon:ICONS.document, label:"Forms" },
  { icon:ICONS.card, label:"e-Cashier" },
  { icon:ICONS.clipboard, label:"e-Nomination" },
];

// ── Topics ────────────────────────────────────────────────────────────────────
const TOPICS = [
  { id:"retirement", icon:ICONS.person, title:"Retirement Income",      color:"#1a5c2a", light:"#e8f5e9",
    desc:"Plan for your retirement with CPF LIFE, the Retirement Sum Topping-Up Scheme, and other tools to help you live comfortably in your golden years.",
    links:["CPF LIFE","Retirement Dashboard","Retirement Sum","Silver Support Scheme"] },
  { id:"housing",    icon:ICONS.home, title:"Home Ownership",         color:"#4a2c6e", light:"#f3e5f5",
    desc:"Use your CPF Ordinary Account savings to pay for your home and take advantage of CPF Housing Grants for eligible flat buyers.",
    links:["Housing Withdrawal","CPF Housing Grants","HDB Housing Loan","Private Property Loan"] },
  { id:"health",     icon:ICONS.heart, title:"Healthcare Financing",   color:"#1a4a6e", light:"#e3f2fd",
    desc:"MediSave helps pay for hospitalisation and approved outpatient treatments. MediShield Life provides lifelong basic health insurance for all Singaporeans.",
    links:["MediSave","MediShield Life","CareShield Life","ElderShield"] },
  { id:"savings",    icon:ICONS.coin, title:"Growing Your Savings",   color:"#7a4a00", light:"#fff8e1",
    desc:"Your CPF savings earn guaranteed interest rates. Explore voluntary top-up schemes, the CPF Investment Scheme, and more ways to grow your nest egg.",
    links:["CPF Interest Rates","Voluntary Contributions","CPF Investment Scheme","Tax Relief"] },
  { id:"family",     icon:ICONS.family, title:"Family & Children",      color:"#1a4a3a", light:"#e0f2f1",
    desc:"Government grants and schemes support young families. Learn about the Baby Bonus CPF Grant and education schemes for your children's future.",
    links:["Baby Bonus CPF Grant","Education Scheme","Dependants' Protection","CPF for Caregivers"] },
  { id:"account",    icon:ICONS.settings, title:"Account Services",       color:"#3a2a1a", light:"#efebe9",
    desc:"Manage your CPF account: check balances, update contact information, submit nominations, download statements, and access all digital services online.",
    links:["Check Balance","Update Details","CPF Nomination","Digital Services"] },
];

// ── News ──────────────────────────────────────────────────────────────────────
const NEWS = [
  { date:"16 Jun 2026", tag:"Announcement", title:"CPF contribution rates to increase from 1 January 2027", desc:"The government has announced higher CPF contribution rates for workers aged 55 and above, effective 1 January 2027." },
  { date:"10 Jun 2026", tag:"Update",       title:"New Matched Retirement Savings Scheme (MRSS) for seniors", desc:"Eligible seniors aged 55–70 can receive dollar-for-dollar matching of cash top-ups under the expanded MRSS." },
  { date:"3 Jun 2026",  tag:"Event",        title:"CPF Advisory Panel public consultation now open", desc:"Members of the public are invited to share feedback on CPF retirement adequacy from 3 June to 15 July 2026." },
];

// ── PULSE chat widget ─────────────────────────────────────────────────────────
type Role = "user"|"agent";
interface Msg { role:Role; content:string; offer?:boolean; } // offer: bot suggested connecting to a human officer
const CHAT_LANGS = [{ l:"EN",c:"en"},{l:"中文",c:"zh"},{l:"BM",c:"ms"},{l:"த",c:"ta"}];

// Minimal markdown for bot replies: **bold**, "- " bullets, and line breaks — so the
// model's markdown renders instead of showing literal ** and dashes.
function renderMd(text:string) {
  const boldify = (s:string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p,i)=>{
      const m=/^\*\*([^*]+)\*\*$/.exec(p);
      return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{p}</span>;
    });
  return String(text).split(/\r?\n/).map((ln,i)=>{
    if(ln.trim()==="") return <div key={i} style={{height:5}} />;
    const bullet=/^\s*[-–•]\s+/.test(ln);
    const body=bullet?ln.replace(/^\s*[-–•]\s+/,""):ln;
    return bullet
      ? <div key={i} style={{display:"flex",gap:6,paddingLeft:2}}><span aria-hidden="true" style={{flexShrink:0}}>•</span><span>{boldify(body)}</span></div>
      : <div key={i}>{boldify(body)}</div>;
  });
}

function PulseWidget() {
  const [open,setOpen] = useState(false);
  const [msgs,setMsgs] = useState<Msg[]>([{role:"agent",content:"Hi! I'm PULSE, CPF Board's virtual assistant. Ask me anything about CPF schemes, contributions, or account services."}]);
  const [text,setText] = useState("");
  const [lang,setLang] = useState("en");
  const [busy,setBusy] = useState(false);
  const [err,setErr]   = useState<string|null>(null);
  const [connecting,setConnecting] = useState(false);
  const [wMobile,setWMobile] = useState(false);

  // Auto-open the chatbot when arrived via a "Try the chatbot" link (/cpf?chat=open).
  useEffect(()=>{ if(typeof window!=="undefined" && /[?&]chat=open\b/.test(window.location.search)) setOpen(true); },[]);
  // On phones make the widget a near full-screen sheet so the input + "talk to a real
  // person" button are never clipped by the mobile browser toolbar.
  useEffect(()=>{ const mq=window.matchMedia("(max-width: 720px)"); const on=()=>setWMobile(mq.matches); on(); mq.addEventListener("change",on); return ()=>mq.removeEventListener("change",on); },[]);
  const logRef = useRef<HTMLDivElement>(null);

  // Hand off to a human CCU officer: escalate carrying this conversation as context, then
  // open the Text Us page bound to the same web session so the chat continues live there.
  async function connectOfficer() {
    if (connecting) return;
    setConnecting(true);
    const sessionId = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await fetch(`${API_BASE}/webchat/${sessionId}/connect`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({conversationHistory:msgs,language:lang})});
    } catch { /* proceed anyway — the Text Us page can still resume this session */ }
    window.location.href = `/textus?s=${encodeURIComponent(sessionId)}`;
  }

  async function send() {
    const t = text.trim(); if(!t||busy) return;
    setText(""); setErr(null);
    setMsgs(p=>[...p,{role:"user",content:t}]);
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/query`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:t,conversationHistory:msgs,language:lang})});
      if(!r.ok) throw new Error();
      const j = await r.json();
      const d = j?.data;
      // Offer a human handoff ONLY when the user explicitly asks for one, or when the query
      // concerns their personal/account data (intent "personal_data"). Deliberately NOT on
      // requiresHumanReview alone — that also fires on low-confidence small talk like "hello".
      const q = t.toLowerCase();
      const asked =
        /\b(officer|representative|real person|live (?:agent|person|chat)|customer service)\b/.test(q) ||
        (/\b(agent|human|staff|someone|somebody|person)\b/.test(q) && /\b(speak|talk|connect|transfer|chat|refer|reach|contact|put|get|want|need)\b/.test(q));
      const privateInfo = d?.intent === "personal_data";
      // The bot's own reply promising a handoff ("I'm getting you connected — a CPF officer
      // will be with you shortly") must always carry the button, or the promise is a dead end.
      const reply = String(d?.content??"").toLowerCase();
      const offered = reply.includes("officer") && /\b(connect|redirect|transfer|shortly|with you|reply|escalat|hand(?:ing)? (?:you )?over)\b/.test(reply);
      // Backend semantic signal (5-layer escalation analyzer) — works regardless of the
      // reply's language, where the regexes above only match English wording.
      const serverOffer = d?.offerOfficer === true;
      setMsgs(p=>[...p,{role:"agent",content:d?.content??"Sorry, I couldn't get a response.",offer:serverOffer||asked||privateInfo||offered}]);
    } catch { setErr("Couldn't reach PULSE — please try again."); }
    finally { setBusy(false); setTimeout(()=>logRef.current?.scrollTo({top:9999,behavior:"smooth"}),50); }
  }

  return (
    <div style={{position:"fixed",bottom:wMobile?12:24,right:wMobile?12:24,zIndex:9999,display:"flex",flexDirection:"column",alignItems:"flex-end",fontFamily:FONT}}>
      {open&&(
        <div style={{width:wMobile?"calc(100vw - 24px)":"min(370px, calc(100vw - 32px))",height:wMobile?"calc(100dvh - 92px)":"min(520px, calc(100vh - 100px))",background:CPF.white,borderRadius:wMobile?18:10,boxShadow:"0 8px 40px rgba(0,0,0,.22)",display:"flex",flexDirection:"column",overflow:"hidden",marginBottom:12}}>
          <div style={{background:CPF.teal,borderBottom:`4px solid ${CPF.lime}`,color:CPF.white,padding:"11px 14px",display:"flex",alignItems:"center",gap:9,flexShrink:0,whiteSpace:"nowrap"}}>
            <img src="https://www.cpf.gov.sg/Failover-NS/image/cpf-logo.svg" alt="CPF" height="22" style={{filter:"brightness(0) invert(1)",flexShrink:0}} />
            <div style={{flex:1,fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis"}}>PULSE Virtual Assistant</div>
            <button aria-label="Close chat" onClick={()=>setOpen(false)}
              style={{appearance:"none",WebkitAppearance:"none",boxSizing:"border-box",width:30,height:30,padding:0,margin:0,flexShrink:0,borderRadius:"50%",border:"2px solid rgba(255,255,255,.5)",background:"rgba(255,255,255,.16)",color:CPF.white,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,.3)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,.16)";}}>
              <Icon size={14} path={ICONS.close} />
            </button>
          </div>
          <div style={{display:"flex",gap:6,padding:"8px 14px",borderBottom:`1px solid ${CPF.border}`,background:CPF.white,flexShrink:0}}>
            {CHAT_LANGS.map(x=>(
              <button key={x.c} onClick={()=>setLang(x.c)} style={{background:lang===x.c?CPF.teal:CPF.bg,color:lang===x.c?CPF.white:CPF.mid,border:`1px solid ${lang===x.c?CPF.teal:CPF.border}`,borderRadius:14,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{x.l}</button>
            ))}
          </div>
          <div ref={logRef} style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:9,background:"#f4f5f6"}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",gap:6}}>
                <div style={{maxWidth:"82%",padding:"9px 12px",borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",background:m.role==="user"?CPF.teal:CPF.white,color:m.role==="user"?CPF.white:CPF.text,fontSize:13,lineHeight:1.55,boxShadow:"0 1px 3px rgba(0,0,0,.08)",display:"flex",flexDirection:"column",gap:2}}>{m.role==="agent"?renderMd(m.content):m.content}</div>
                {m.role==="agent"&&m.offer&&(
                  <button onClick={()=>void connectOfficer()} disabled={connecting}
                    style={{maxWidth:"90%",border:"none",background:connecting?"#e6efee":CPF.teal,color:connecting?CPF.teal:CPF.white,borderRadius:8,padding:"9px 14px",fontSize:12.5,fontWeight:700,cursor:connecting?"default":"pointer",boxShadow:"0 2px 6px rgba(10,97,96,.3)",display:"flex",alignItems:"center",gap:7,lineHeight:1.3}}>
                    <span aria-hidden="true">👤</span>{connecting?"Connecting you to an officer…":"Click here to talk to a real person →"}
                  </button>
                )}
              </div>
            ))}
            {busy&&<div style={{alignSelf:"flex-start",background:CPF.white,borderRadius:"12px 12px 12px 3px",padding:"9px 14px",fontSize:18,letterSpacing:3,color:"#bbb",boxShadow:"0 1px 3px rgba(0,0,0,.08)"}}>···</div>}
            {err&&<p style={{color:"#c00",fontSize:12,textAlign:"center"}}>{err}</p>}
          </div>
          <div style={{flexShrink:0,padding:"9px 11px",borderTop:`1px solid ${CPF.border}`,display:"flex",gap:8,background:CPF.white}}>
            <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}} placeholder="Type your question…" rows={2} disabled={busy}
              style={{flex:1,resize:"none",border:`1.5px solid ${CPF.border}`,borderRadius:6,padding:"7px 9px",fontSize:wMobile?16:13,fontFamily:FONT,outline:"none"}} />
            <button onClick={()=>void send()} disabled={busy||!text.trim()} style={{appearance:"none",WebkitAppearance:"none",boxSizing:"border-box",width:38,height:38,padding:0,margin:0,flexShrink:0,borderRadius:"50%",border:"none",background:busy||!text.trim()?"#ccc":CPF.teal,color:CPF.white,cursor:busy||!text.trim()?"default":"pointer",alignSelf:"flex-end",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={16} path={ICONS.send} /></button>
          </div>
          {/* Persistent disclaimer — always visible while the widget is open (scenario: policy ambiguity) */}
          <div style={{flexShrink:0,padding:"6px 11px",background:"#fff8e1",borderTop:"1px solid #f0d878",color:"#7a5c00",fontSize:11,lineHeight:1.4}}>
            ⚠️ AI responses may not reflect the latest CPF policies. Please verify with a Customer Care Officer.
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(o=>!o)} style={{appearance:"none",WebkitAppearance:"none",boxSizing:"border-box",width:56,height:56,padding:0,margin:0,flexShrink:0,borderRadius:"50%",border:`3px solid ${CPF.lime}`,background:CPF.teal,color:CPF.white,cursor:"pointer",boxShadow:"0 4px 16px rgba(10,97,96,.4)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon size={open?20:22} path={open?ICONS.close:ICONS.chat} />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CpfPage() {
  const [locale,setLocale]     = useState("en");
  const [slide,setSlide]       = useState(0);
  const [search,setSearch]     = useState("");
  const [showLogin,setShowLogin]= useState(false);
  const [mobile,setMobile]     = useState(false);
  const t = T[locale];
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mobile breakpoint — inline styles beat media-query CSS, so track it in JS to restructure
  // the header (hide nav + search) and hide the hero arrows on small screens.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const scheduleAutoplay = useCallback(() => {
    if (slideTimer.current) clearInterval(slideTimer.current);
    slideTimer.current = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 5000);
  }, []);

  useEffect(() => {
    scheduleAutoplay();
    return () => { if (slideTimer.current) clearInterval(slideTimer.current); };
  }, [scheduleAutoplay]);

  function goToSlide(i:number) { setSlide(i); scheduleAutoplay(); }
  function go(id:string) { document.getElementById(id)?.scrollIntoView({behavior:"smooth"}); }
  function demo(msg:string) { alert(msg+"\n\n(PULSE demo — full service is available at cpf.gov.sg)"); }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        html,body{max-width:100%;overflow-x:hidden;}
        img,svg{max-width:100%;}
        body{background:${CPF.bg};font-family:${FONT};}
      ` }} />

      <BackHomeButton />

      {/* Login modal */}
      {showLogin&&(
        <div onClick={()=>setShowLogin(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:CPF.white,borderRadius:8,padding:"32px 36px",maxWidth:400,width:"90%",borderTop:`6px solid ${CPF.lime}`}}>
            <img src="https://www.cpf.gov.sg/Failover-NS/image/cpf-logo.svg" alt="CPF" height="34" style={{filter:`sepia(1) saturate(3) hue-rotate(130deg) brightness(0.5)`}} />
            <h2 style={{fontSize:20,fontWeight:700,color:CPF.teal,margin:"18px 0 8px"}}>Log in to my cpf</h2>
            <p style={{fontSize:13,color:CPF.mid,marginBottom:20,lineHeight:1.65}}>In the real portal, you authenticate via Singpass. This is a PULSE demonstration — click below to continue as a demo user.</p>
            <button onClick={()=>setShowLogin(false)} style={{width:"100%",background:CPF.teal,color:CPF.white,border:"none",borderRadius:4,padding:"12px",fontSize:15,fontWeight:700,cursor:"pointer",borderBottom:`4px solid ${CPF.lime}`,marginBottom:8}}>
              Continue as Demo User →
            </button>
            <button onClick={()=>setShowLogin(false)} style={{width:"100%",background:"transparent",color:CPF.mid,border:`1px solid ${CPF.border}`,borderRadius:4,padding:"10px",fontSize:13,cursor:"pointer"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{fontFamily:FONT,background:CPF.bg,minHeight:"100vh",color:CPF.text,fontSize:16}}>

        {/* Government masthead */}
        <div style={{background:CPF.white,borderBottom:`1px solid ${CPF.border}`}}>
          <div style={{maxWidth:1200,margin:"0 auto",padding:"7px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:mobile?11.5:13,color:CPF.mid}}>
              <svg width="18" height="18" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#5B21B6"/><text x="10" y="14" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">SG</text></svg>
              A Singapore Government Agency Website
            </div>
            <div style={{display:"flex",gap:2}}>
              {(["en","zh","ms","ta"] as const).map((lc,i)=>(
                <button key={lc} onClick={()=>setLocale(lc)} style={{background:locale===lc?CPF.teal:"transparent",color:locale===lc?CPF.white:CPF.mid,border:"none",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  {["EN","中文","Melayu","தமிழ்"][i]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Header */}
        <header style={{background:CPF.teal,borderBottom:`7px solid ${CPF.lime}`,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,.18)"}}>
          <div style={{maxWidth:1200,margin:"0 auto",padding:"0 18px",display:"flex",alignItems:"stretch",justifyContent:"space-between"}}>
            <a href="/cpf" style={{display:"flex",alignItems:"center",padding:mobile?"10px 0":"10px 28px 10px 0",borderRight:mobile?"none":`1px solid rgba(255,255,255,.15)`}}>
              <img src="https://www.cpf.gov.sg/Failover-NS/image/cpf-logo.svg" alt="CPF Board" height={mobile?28:34} style={{filter:"brightness(0) invert(1)"}} />
            </a>
            <nav style={{display:mobile?"none":"flex",flex:1}}>
              {([["who",t.who],["tools",t.tools],["infohub",t.info]] as [string,string][]).map(([id,lbl])=>(
                <button key={id} onClick={()=>go(id)} style={{background:"none",border:"none",borderBottom:"3px solid transparent",color:"rgba(255,255,255,.9)",padding:"0 28px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"border-color .15s"}}
                  onMouseEnter={e=>(e.currentTarget.style.borderBottomColor=CPF.lime)}
                  onMouseLeave={e=>(e.currentTarget.style.borderBottomColor="transparent")}>
                  {lbl}
                </button>
              ))}
            </nav>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 0"}}>
              <div style={{display:mobile?"none":"flex",alignItems:"center",background:"rgba(255,255,255,.12)",borderRadius:10,overflow:"hidden"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search+"…"}
                  onKeyDown={e=>{if(e.key==="Enter"&&search.trim()) demo(`Searching for: "${search.trim()}"`)}}
                  style={{background:"transparent",border:"none",color:CPF.white,padding:"8px 12px",fontSize:13,fontFamily:FONT,outline:"none",width:150}} />
                <button onClick={()=>search.trim()&&demo(`Searching for: "${search.trim()}"`)} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center"}}><Icon size={16} path={ICONS.search} /></button>
              </div>
              <button onClick={()=>setShowLogin(true)} style={{background:CPF.lime,color:"#1a3a00",border:"none",borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                {t.login}
              </button>
            </div>
          </div>
        </header>

        {/* Hero carousel */}
        <section style={{position:"relative",overflow:"hidden"}}>
          <div style={{background:HERO_BG,minHeight:mobile?260:360,display:"flex",alignItems:"center"}}>
            <div style={{maxWidth:1200,margin:"0 auto",padding:mobile?"32px 16px":"48px 18px",width:"100%"}}>
              <div style={{flex:1,maxWidth:600,color:CPF.text}}>
                <div style={{marginBottom:18}}><Icon size={44} path={SLIDES[slide].icon} /></div>
                <h1 style={{fontSize:"clamp(24px,4vw,40px)",fontWeight:800,color:CPF.text,lineHeight:1.2,marginBottom:14,letterSpacing:"-0.5px"}}>
                  {t[SLIDES[slide].k+"t"]}
                </h1>
                <p style={{fontSize:16,color:"rgba(26,26,26,.78)",lineHeight:1.7,marginBottom:26,maxWidth:500}}>
                  {t[SLIDES[slide].k+"s"]}
                </p>
                <button onClick={()=>go("topics")} style={{background:CPF.darkCyan,color:CPF.white,border:"none",borderRadius:10,padding:"12px 28px",fontSize:15,fontWeight:700,cursor:"pointer"}}>
                  {t[SLIDES[slide].k+"c"]} →
                </button>
              </div>
            </div>
          </div>
          <button aria-label="Previous slide" onClick={()=>goToSlide((slide+SLIDES.length-1)%SLIDES.length)}
            style={{appearance:"none",WebkitAppearance:"none",boxSizing:"border-box",position:"absolute",left:20,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.16)",color:CPF.white,border:"2px solid rgba(255,255,255,.5)",borderRadius:"50%",width:48,height:48,padding:0,margin:0,flexShrink:0,display:mobile?"none":"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"background .15s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,.3)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,.16)";}}>
            <Icon size={22} path={ICONS.chevronLeft} />
          </button>
          <button aria-label="Next slide" onClick={()=>goToSlide((slide+1)%SLIDES.length)}
            style={{appearance:"none",WebkitAppearance:"none",boxSizing:"border-box",position:"absolute",right:20,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.16)",color:CPF.white,border:"2px solid rgba(255,255,255,.5)",borderRadius:"50%",width:48,height:48,padding:0,margin:0,flexShrink:0,display:mobile?"none":"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"background .15s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,.3)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,.16)";}}>
            <Icon size={22} path={ICONS.chevronRight} />
          </button>
        </section>

        {/* Quick access */}
        <section id="tools" style={{background:CPF.white,borderBottom:`1px solid ${CPF.border}`}}>
          <div style={{maxWidth:1200,margin:"0 auto",padding:"22px 18px"}}>
            <p style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:CPF.mid,marginBottom:12}}>{t.qTitle}</p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {QUICK.map(q=>(
                <button key={q.label} onClick={()=>demo(`Opening: ${q.label}`)}
                  style={{display:"flex",alignItems:"center",gap:10,background:CPF.bg,border:`1px solid ${CPF.border}`,borderRadius:12,padding:"11px 18px",fontSize:14,fontWeight:600,color:CPF.teal,cursor:"pointer",transition:"all .15s",fontFamily:FONT}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=CPF.teal;(e.currentTarget as HTMLButtonElement).style.color=CPF.white;(e.currentTarget as HTMLButtonElement).style.borderColor=CPF.teal;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background=CPF.bg;(e.currentTarget as HTMLButtonElement).style.color=CPF.teal;(e.currentTarget as HTMLButtonElement).style.borderColor=CPF.border;}}>
                  <Icon size={20} path={q.icon} />{q.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Topics */}
        <section id="topics" style={{padding:"48px 18px"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <h2 style={{fontSize:28,fontWeight:800,color:CPF.teal,marginBottom:8,letterSpacing:"-0.5px"}}>{t.tTitle}</h2>
            <div style={{width:56,height:5,background:CPF.lime,borderRadius:3,marginBottom:32}} />
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:mobile?14:20}}>
              {TOPICS.map(tp=>{
                const clickable = tp.id === "housing";
                return (
                <div key={tp.id} onClick={clickable ? ()=>{ window.location.href = "/cpf/housing"; } : undefined}
                  style={{background:CPF.white,borderRadius:10,border:`1px solid ${CPF.border}`,padding:"28px 24px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.06)",transition:"box-shadow .2s",cursor:clickable?"pointer":"default"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow="0 4px 16px rgba(0,0,0,.12)"}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow="0 1px 4px rgba(0,0,0,.06)"}>
                  <div style={{width:64,height:64,borderRadius:"50%",background:tp.light,color:tp.color,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                    <Icon size={28} path={tp.icon} />
                  </div>
                  <h3 style={{fontSize:17,fontWeight:700,color:tp.color,marginBottom:10}}>{tp.title}</h3>
                  <p style={{fontSize:14,color:CPF.mid,lineHeight:1.7,marginBottom:20}}>{tp.desc}</p>
                  <div style={{borderTop:`1px dashed ${CPF.border}`,paddingTop:18}}>
                    <p style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:CPF.light,marginBottom:12}}>Related information</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                      {tp.links.map(lk=>(
                        <button key={lk} onClick={e=>{e.stopPropagation(); clickable ? (window.location.href = "/cpf/housing") : demo(`Opening: ${lk}`);}}
                          style={{background:CPF.white,color:tp.color,border:`1.5px solid ${tp.color}`,borderRadius:20,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT,transition:"background .15s,color .15s"}}
                          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=tp.color;(e.currentTarget as HTMLButtonElement).style.color=CPF.white;}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background=CPF.white;(e.currentTarget as HTMLButtonElement).style.color=tp.color;}}>
                          {lk}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* News */}
        <section id="infohub" style={{background:CPF.white,padding:"48px 18px",borderTop:`1px solid ${CPF.border}`}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:8}}>
              <h2 style={{fontSize:28,fontWeight:800,color:CPF.teal,letterSpacing:"-0.5px"}}>{t.news}</h2>
              <button onClick={()=>demo("Opening full news listing")} style={{background:"none",border:"none",color:CPF.teal,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                {t.viewAll} →
              </button>
            </div>
            <div style={{width:56,height:5,background:CPF.lime,borderRadius:3,marginBottom:28}} />
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))",gap:16}}>
              {NEWS.map((n,i)=>(
                <button key={i} onClick={()=>demo(`Article: "${n.title}"\n\n${n.desc}`)}
                  style={{background:CPF.bg,border:`1px solid ${CPF.border}`,borderRadius:8,padding:"20px",textAlign:"left",cursor:"pointer",display:"flex",flexDirection:"column",gap:10,transition:"all .15s",fontFamily:FONT}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="#e8f5e9";(e.currentTarget as HTMLButtonElement).style.borderColor=CPF.teal;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background=CPF.bg;(e.currentTarget as HTMLButtonElement).style.borderColor=CPF.border;}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{background:CPF.teal,color:CPF.white,fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:3}}>{n.tag}</span>
                    <span style={{fontSize:12,color:CPF.light}}>{n.date}</span>
                  </div>
                  <p style={{fontSize:15,fontWeight:700,color:CPF.teal,lineHeight:1.4}}>{n.title}</p>
                  <p style={{fontSize:13,color:CPF.mid,lineHeight:1.6}}>{n.desc}</p>
                  <span style={{fontSize:13,color:CPF.teal,fontWeight:700}}>Read more →</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* About section */}
        <section id="who" style={{background:CPF.teal,padding:"40px 18px",borderTop:`7px solid ${CPF.lime}`}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <h2 style={{fontSize:22,fontWeight:800,color:CPF.white,marginBottom:6}}>About CPF Board</h2>
            <div style={{width:40,height:4,background:CPF.lime,borderRadius:2,marginBottom:28}} />
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,260px),1fr))",gap:28}}>
              {[
                {icon:ICONS.target,h:"Our Mission",b:"To act in the interests of CPF members by helping them save for retirement, healthcare and housing needs."},
                {icon:ICONS.trending,h:"4M+ Members",b:"CPF serves over 4 million Singapore Citizens and Permanent Residents across all life stages."},
                {icon:ICONS.globe,h:"Since 1955",b:"Safeguarding the retirement, housing and healthcare needs of Singapore workers for over 70 years."},
              ].map(c=>(
                <div key={c.h}>
                  <span style={{display:"block",marginBottom:10,color:CPF.lime}}><Icon size={28} path={c.icon} /></span>
                  <h3 style={{color:CPF.lime,fontWeight:700,fontSize:15,marginBottom:8}}>{c.h}</h3>
                  <p style={{color:"rgba(230,237,237,.85)",fontSize:14,lineHeight:1.7}}>{c.b}</p>
                </div>
              ))}
            </div>
            <div style={{marginTop:28,display:"flex",gap:10,flexWrap:"wrap"}}>
              {["Board of Directors","Annual Reports","Media Releases","CPF Legislation"].map(lk=>(
                <button key={lk} onClick={()=>demo(`Opening: ${lk}`)} style={{background:"rgba(255,255,255,.12)",color:CPF.white,border:`1px solid rgba(255,255,255,.25)`,borderRadius:4,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FONT}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=CPF.lime;(e.currentTarget as HTMLButtonElement).style.color="#1a3a00";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,.12)";(e.currentTarget as HTMLButtonElement).style.color=CPF.white;}}>
                  {lk}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{background:CPF.teal,borderTop:`7px solid ${CPF.lime}`,color:CPF.ftText,padding:"36px 18px 24px"}}>
          <div style={{maxWidth:1200,margin:"0 auto"}}>
            <div style={{marginBottom:24}}>
              <img src="https://www.cpf.gov.sg/Failover-NS/image/cpf-logo.svg" alt="CPF Board" height="30" style={{filter:"brightness(0) invert(1)",opacity:.8}} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:24,marginBottom:28}}>
              {[
                {h:"CPF Board",links:["About CPF Board","Board members","Careers","Press releases","Legislation"]},
                {h:"Business Partners",links:["Employers","Healthcare institutions","Property agents","Financial institutions","Payroll software"]},
                {h:"Useful Links",links:["Contact us","Feedback","Report a scam","Sitemap","Accessibility"]},
                {h:"Connect with us",links:["Facebook","Instagram","YouTube","LinkedIn","WhatsApp","Telegram"]},
              ].map(col=>(
                <div key={col.h}>
                  <p style={{color:CPF.lime,fontWeight:700,fontSize:12,textTransform:"uppercase",letterSpacing:.8,marginBottom:12}}>{col.h}</p>
                  {col.links.map(lk=>(
                    <button key={lk} onClick={()=>demo(`Opening: ${lk}`)}
                      style={{display:"block",background:"none",border:"none",color:CPF.ftText,fontSize:13,marginBottom:8,cursor:"pointer",opacity:.82,fontFamily:FONT,textAlign:"left",padding:0}}
                      onMouseEnter={e=>(e.currentTarget.style.color=CPF.lime)}
                      onMouseLeave={e=>(e.currentTarget.style.color=CPF.ftText)}>
                      {lk}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div style={{borderTop:"1px solid rgba(255,255,255,.15)",paddingTop:16,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <span style={{fontSize:12,color:"rgba(230,237,237,.5)"}}>© 2025, Government of Singapore · Last Updated 17 Jan 2025</span>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {["Privacy Statement","Terms of Use","Security Practices","Accessibility"].map(lk=>(
                  <button key={lk} onClick={()=>demo(`Opening: ${lk}`)} style={{background:"none",border:"none",color:"rgba(230,237,237,.5)",fontSize:12,cursor:"pointer",fontFamily:FONT}}>{lk}</button>
                ))}
              </div>
            </div>
          </div>
        </footer>

        {/* Demo disclaimer */}
        <div style={{background:"#111",padding:"12px 18px",textAlign:"center"}}>
          <p style={{fontSize:12,color:"rgba(255,255,255,.4)",margin:0,display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexWrap:"wrap"}}>
            <strong style={{color:"rgba(255,255,255,.65)",display:"inline-flex",alignItems:"center",gap:5}}><Icon size={13} path={ICONS.alertTriangle} /> Demo only.</strong>
            Simulated CPF portal for research purposes. No real CPF data. Visit{" "}
            <a href="https://www.cpf.gov.sg" target="_blank" rel="noopener noreferrer" style={{color:CPF.lime}}>cpf.gov.sg</a> for your actual account.
          </p>
        </div>

      </div>

      <PulseWidget />
    </>
  );
}
