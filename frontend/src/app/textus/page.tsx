"use client";

import { useState, useEffect, useRef } from "react";
import BackHomeButton from "@/components/BackHomeButton";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const PREFILL =
  "[Please do not edit this message]\nWelcome to CPF Board Text Us. To begin the chat, simply press the send button.";

interface Bubble {
  from: "user" | "system" | "notice";
  text: string;
}

// Key under which the CPF portal / chat widgets stash a short summary of the
// citizen's issue right before redirecting here, so we can confirm to the member
// that their context carried over to the officer. Read + cleared once on arrival.
const HANDOFF_SUMMARY_KEY = "pulse_handoff_summary";

type PendingAction = "call" | "camera" | null;

// WhatsApp iOS palette
const WA_TEAL = "#008069"; // header links / back chevron
const WA_GREEN = "#25D366"; // send / mic FAB
const WA_ICON = "#54656F"; // header/input icon gray
const WA_TEXT = "#111B21"; // near-black primary text
const WA_SUBTEXT = "#667781"; // secondary gray text
const WA_OUT_BUBBLE = "#D9FDD3";
const WA_WALLPAPER = "#ECE5DD";
const WA_HEADER_BG = "#F7F7F7";
const WA_READ_TICK = "#53BDEB";

function ChevronLeftIcon({ color = WA_TEAL, size = 26 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M15 5l-7 7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon({ color = WA_ICON, size = 22 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="14" height="12" rx="2.5" stroke={color} strokeWidth={1.8} />
      <path d="M16 10.5l5-3v9l-5-3v-3z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon({ color = WA_ICON, size = 21 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmileIcon({ color = WA_ICON, size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth={1.7} />
      <circle cx="8.7" cy="10" r="1.1" fill={color} />
      <circle cx="15.3" cy="10" r="1.1" fill={color} />
      <path d="M7.8 14c1 1.4 2.4 2.1 4.2 2.1s3.2-.7 4.2-2.1" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon({ color = WA_ICON, size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8.5 5.5l1.3-2h4.4l1.3 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2h3.5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.3" stroke={color} strokeWidth={1.6} />
    </svg>
  );
}

function MicIcon({ color = "#fff", size = 21 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke={color} strokeWidth={1.8} />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M12 17.5V21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

function SendIcon({ color = "#fff", size = 20 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(-45deg)" }}>
      <path d="M4 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DoubleCheckIcon({ color = WA_SUBTEXT, size = 15 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 20 12" fill="none" style={{ display: "inline-block", verticalAlign: "-1px" }}>
      <path d="M1 6.5l3.2 3.2L11 3" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 6.5l3.2 3.2L17.5 3" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// CPF Board profile picture — the real logo on a white disc, matching how WhatsApp
// renders a business avatar. Falls back to nothing if the asset ever fails to load.
function CpfAvatar({ size = 36 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}>
      <img src="/cpf-logo.png" alt="CPF Board" width={Math.round(size * 0.82)} height={Math.round(size * 0.82)} style={{ objectFit: "contain" }} />
    </div>
  );
}

// WhatsApp-style verified business badge: a white check inside a solid seal.
function VerifiedBadge({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Verified business" style={{ display: "inline-block", verticalAlign: "-2px", flexShrink: 0 }}>
      <path fill={WA_TEAL} d="M12 1 L14.42 3.75 L17.95 2.75 L18.5 6.37 L22.01 7.43 L20.51 10.78 L22.89 13.57 L19.82 15.57 L20.31 19.2 L16.65 19.23 L15.1 22.55 L12 20.6 L8.9 22.55 L7.35 19.23 L3.69 19.2 L4.18 15.57 L1.11 13.57 L3.49 10.78 L1.99 7.43 L5.5 6.37 L6.05 2.75 L9.58 3.75 Z" />
      <path d="M8 12l2.7 2.7L16 9.4" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function StatusBar() {
  return (
    <div style={{ height: 44, background: WA_HEADER_BG, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px 0 24px", flexShrink: 0 }}>
      <span style={{ color: WA_TEXT, fontSize: 15, fontWeight: 600, letterSpacing: 0.2 }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Signal bars */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill={WA_TEXT}>
          <rect x="0" y="8" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" />
          <rect x="9" y="3" width="3" height="9" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
        </svg>
        {/* Wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill={WA_TEXT}>
          <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
          <path d="M8 6.5c1.4 0 2.7.6 3.6 1.5l1.1-1.1A7 7 0 0 0 8 5a7 7 0 0 0-4.7 1.9L4.4 8c.9-.9 2.2-1.5 3.6-1.5z" opacity=".8" />
          <path d="M8 3.5c2.5 0 4.7 1 6.3 2.6L15.6 5A9.5 9.5 0 0 0 8 2 9.5 9.5 0 0 0 .4 5l1.3 1.1A8 8 0 0 1 8 3.5z" opacity=".5" />
        </svg>
        {/* Battery */}
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          <div style={{ width: 25, height: 12, border: "1.5px solid rgba(17,27,33,.4)", borderRadius: 3.5, padding: 1.5, position: "relative" }}>
            <div style={{ width: "80%", height: "100%", background: WA_TEXT, borderRadius: 1.5 }} />
          </div>
          <div style={{ width: 2, height: 5, background: "rgba(17,27,33,.4)", borderRadius: "0 1px 1px 0" }} />
        </div>
      </div>
    </div>
  );
}

export default function TextUsDemoPage() {
  const [input, setInput] = useState(PREFILL);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [confirm, setConfirm] = useState<PendingAction>(null);
  const [active, setActive] = useState<PendingAction>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const cursorRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const [levels, setLevels] = useState<number[]>([]);   // live mic waveform bars (0..1)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const logRef = useRef<HTMLDivElement>(null);

  const live = sessionId !== null;
  const tampered = !live && input.trim() !== PREFILL.trim();

  // Bind to a web session (?s=…) handed off from the CPF portal chatbot's
  // "Talk to a CPF officer" button. In live mode the pre-fill gimmick is dropped and
  // messages are relayed to / polled from the officer dashboard (the web channel).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = new URLSearchParams(window.location.search).get("s");
    if (s) {
      setSessionId(s);
      setInput("");
      // Confirm to the member that the summary they built on the website reached the
      // officer — the widget stashed it just before redirecting here.
      let summary: string | null = null;
      try {
        summary = window.sessionStorage.getItem(HANDOFF_SUMMARY_KEY);
        window.sessionStorage.removeItem(HANDOFF_SUMMARY_KEY);
      } catch { /* private mode / storage disabled — just skip the confirmation */ }
      if (summary && summary.trim()) {
        setMessages([{
          from: "notice",
          text: `✅ Shared with the officer: “${summary.trim()}”. An officer will reply here shortly.`,
        }]);
      }
    }
  }, []);

  // Dynamic scroll: keep the newest message in view whenever the log changes — a
  // member's own send, an officer's polled reply, or the handoff confirmation — so
  // nobody has to scroll by hand (mirrors the officer dashboard's behaviour).
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Short-poll the backend for officer / system replies while a session is live.
  useEffect(() => {
    if (!sessionId) return;
    let stopped = false;
    async function poll() {
      try {
        const r = await fetch(`${API_BASE}/webchat/${sessionId}/poll?since=${cursorRef.current}`);
        if (!r.ok) return;
        const j = await r.json();
        if (typeof j?.cursor === "number") cursorRef.current = j.cursor;
        const incoming: Bubble[] = (j?.messages ?? []).map((m: { text: string }) => ({ from: "system" as const, text: m.text }));
        if (incoming.length) setMessages((prev) => [...prev, ...incoming]);
      } catch { /* transient — retry next tick */ }
    }
    void poll();
    const id = setInterval(() => { if (!stopped) void poll(); }, 2000);
    return () => { stopped = true; clearInterval(id); };
  }, [sessionId]);

  // Tear down any live mic analyser if the page unmounts mid-recording.
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); audioCtxRef.current?.close().catch(() => {}); }, []);

  async function onSend() {
    // ── Live mode: real web channel wired to the officer dashboard ──
    if (live) {
      const t = input.trim();
      if (!t) return;
      setError(null);
      setMessages((m) => [...m, { from: "user", text: t }]);
      setInput("");
      try {
        await fetch(`${API_BASE}/webchat/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: t }),
        });
      } catch {
        setError("Couldn't reach CPF Board — please check your connection and try again.");
      }
      return;
    }

    // ── First send on a bare /textus: the pre-filled opener starts a REAL live chat ──
    if (tampered) {
      setError(
        "⚠️ Message not sent. Please don't edit or delete the pre-filled message — send it exactly as it is to start your chat. Tap \"Restore\" below, or start a new chat from the official CPF Text Us link.",
      );
      return;
    }
    setError(null);
    setMessages((m) => [...m, { from: "user", text: input }]);
    setInput("");
    await beginLiveChat();
  }

  // Open a real officer session from the bare /textus page (no ?s= handoff). Generates a
  // session id, escalates to a CCU officer, and flips the page into live mode so text +
  // voice + officer replies all work. The "connected" confirmation arrives via poll.
  async function beginLiveChat() {
    const s = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cursorRef.current = 0;
    try {
      await fetch(`${API_BASE}/webchat/${s}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationHistory: [{ role: "user", content: "Citizen started a chat from the CPF Board Text Us page." }], language: "en" }),
      });
    } catch {
      setError("Couldn't reach CPF Board — please try again.");
      return;
    }
    setSessionId(s); // flips to live mode + starts the poll loop
  }

  function restore() {
    setInput(PREFILL);
    setError(null);
  }

  // ── Voice notes (live mode): record in-browser, send audio to be transcribed + relayed ──
  function pickMime(): string {
    const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    if (typeof MediaRecorder === "undefined") return "";
    for (const c of cands) { try { if (MediaRecorder.isTypeSupported(c)) return c; } catch { /* ignore */ } }
    return "";
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => { const s = String(r.result || ""); resolve(s.slice(s.indexOf(",") + 1)); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  async function startRecording() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice notes aren't supported on this browser."); return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Please allow the mic and try again."); return;
    }
    // Live waveform: tap the mic stream with a Web Audio analyser and animate bars.
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      const bins = new Uint8Array(analyser.frequencyBinCount);
      const NBARS = 22;
      const tick = () => {
        analyser.getByteFrequencyData(bins);
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(bins.length / NBARS));
        for (let i = 0; i < NBARS; i++) bars.push((bins[i * step] ?? 0) / 255);
        setLevels(bars);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch { /* visualiser is best-effort; recording still works without it */ }

    const mime = pickMime();
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setLevels([]);
      const durationSec = (Date.now() - recStartRef.current) / 1000;
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || mime || "audio/webm" });
      if (blob.size < 500 || durationSec < 0.5) {
        setError("That was too short — hold the mic a moment longer."); return;
      }
      const audioBase64 = await blobToBase64(blob);
      setMessages((m) => [...m, { from: "user", text: "🎤 Voice message" }]);
      try {
        await fetch(`${API_BASE}/webchat/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64, mimeType: blob.type, durationSec }),
        });
      } catch {
        setError("Couldn't send the voice message — please try again.");
      }
    };
    mediaRef.current = mr;
    recStartRef.current = Date.now();
    mr.start();
    setRecording(true);
  }

  function stopRecording() {
    const mr = mediaRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    setRecording(false);
  }

  // Phone dimensions
  const PHONE_W = 393;
  const PHONE_H = 852;
  const BEZEL = 14;
  const FRAME_W = PHONE_W + BEZEL * 2;
  const FRAME_H = PHONE_H + BEZEL * 2 + 6;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <BackHomeButton />
      {/* Slim, WhatsApp-flavoured scrollbar for the chat log (native one looks too "web"). */}
      <style>{`
        .wa-scroll{scrollbar-width:thin;scrollbar-color:rgba(11,20,26,.28) transparent}
        .wa-scroll::-webkit-scrollbar{width:6px;height:6px}
        .wa-scroll::-webkit-scrollbar-track{background:transparent}
        .wa-scroll::-webkit-scrollbar-thumb{background:rgba(11,20,26,.28);border-radius:6px}
        .wa-scroll::-webkit-scrollbar-thumb:hover{background:rgba(11,20,26,.42)}
      `}</style>
      <p style={{ color: "rgba(255,255,255,.45)", fontSize: 13, fontWeight: 500, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 32 }}>
        CPF Text Us — Demo
      </p>

      {/* Phone outer frame */}
      <div style={{
        position: "relative",
        width: FRAME_W,
        height: FRAME_H,
        background: "linear-gradient(160deg, #2a2a2a 0%, #1a1a1a 40%, #111 100%)",
        borderRadius: 54,
        boxShadow: "0 0 0 1px #3a3a3a, 0 0 0 2px #1a1a1a, 0 50px 120px rgba(0,0,0,.7), inset 0 0 0 1px #444",
        padding: BEZEL,
      }}>

        {/* Volume buttons (left side) */}
        <div style={{ position: "absolute", left: -4, top: 120, width: 4, height: 32, background: "#2a2a2a", borderRadius: "2px 0 0 2px", boxShadow: "-1px 0 2px rgba(0,0,0,.5)" }} />
        <div style={{ position: "absolute", left: -4, top: 168, width: 4, height: 62, background: "#2a2a2a", borderRadius: "2px 0 0 2px", boxShadow: "-1px 0 2px rgba(0,0,0,.5)" }} />
        <div style={{ position: "absolute", left: -4, top: 244, width: 4, height: 62, background: "#2a2a2a", borderRadius: "2px 0 0 2px", boxShadow: "-1px 0 2px rgba(0,0,0,.5)" }} />

        {/* Power button (right side) */}
        <div style={{ position: "absolute", right: -4, top: 190, width: 4, height: 80, background: "#2a2a2a", borderRadius: "0 2px 2px 0", boxShadow: "1px 0 2px rgba(0,0,0,.5)" }} />

        {/* Screen */}
        <div style={{
          width: PHONE_W,
          height: PHONE_H,
          background: "#ECE5DD",
          borderRadius: 42,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}>

          {/* Status bar */}
          <StatusBar />

          {/* Dynamic island */}
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 120, height: 34, background: "#000", borderRadius: 20, zIndex: 10 }} />

          {/* WhatsApp header */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, background: WA_HEADER_BG, color: WA_TEXT, padding: "8px 14px 8px 6px", borderBottom: "1px solid #D1D1D1", zIndex: 5 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 2px", lineHeight: 1, display: "flex" }} aria-label="Back">
              <ChevronLeftIcon />
            </button>
            <CpfAvatar size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16.5, color: WA_TEXT, display: "flex", alignItems: "center", gap: 4 }}>
                CPF Board<VerifiedBadge />
              </div>
              <div style={{ fontSize: 12.5, color: WA_SUBTEXT }}>online</div>
            </div>
            <button onClick={() => setConfirm("camera")} aria-label="Video call" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, lineHeight: 1, display: "flex" }}>
              <VideoIcon />
            </button>
            <button onClick={() => setConfirm("call")} aria-label="Voice call" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, lineHeight: 1, display: "flex" }}>
              <PhoneIcon />
            </button>
          </div>

          {/* Chat wallpaper area */}
          <div
            ref={logRef}
            className="wa-scroll"
            role="log"
            aria-label="Conversation"
            aria-live="polite"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: WA_WALLPAPER,
            }}
          >
            {/* Date pill */}
            <div style={{ alignSelf: "center", background: "rgba(255,255,255,.6)", borderRadius: 8, padding: "3px 12px", fontSize: 12.5, color: "#54656F", boxShadow: "0 1px 1px rgba(0,0,0,.06)" }}>
              Today
            </div>

            {/* Encryption notice */}
            <div style={{ alignSelf: "center", background: "rgba(255,255,255,.6)", borderRadius: 8, padding: "8px 14px", fontSize: 11.5, color: "#54656F", textAlign: "center", maxWidth: "85%", lineHeight: 1.5 }}>
              🔒 Messages are end-to-end encrypted
            </div>

            {!live && messages.length === 0 && (
              <div style={{ alignSelf: "center", background: "#FFF8C5", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, color: "#7a6a2f", textAlign: "center", maxWidth: "88%", marginTop: 4, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,.08)" }}>
                The message below has been pre-filled by CPF Board.<br />Press Send to begin — please don't edit it.
              </div>
            )}
            {live && messages.length === 0 && (
              <div style={{ alignSelf: "center", background: "#FFF8C5", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, color: "#7a6a2f", textAlign: "center", maxWidth: "88%", marginTop: 4, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,.08)" }}>
                Connecting you to a CPF officer… you can start typing your question.
              </div>
            )}

            {messages.map((m, i) => m.from === "notice" ? (
              <div key={i} style={{ alignSelf: "center", background: "#D9FDD3", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, color: "#3a5a3f", textAlign: "center", maxWidth: "88%", lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,.08)" }}>
                {m.text}
              </div>
            ) : (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "6px 9px 8px", borderRadius: m.from === "user" ? "7.5px 0 7.5px 7.5px" : "0 7.5px 7.5px 7.5px",
                  fontSize: 14.5, lineHeight: 1.45, whiteSpace: "pre-wrap",
                  background: m.from === "user" ? WA_OUT_BUBBLE : "#fff",
                  color: WA_TEXT,
                  boxShadow: "0 1px 1px rgba(0,0,0,.1)",
                  position: "relative",
                }}>
                  {m.text}
                  <span style={{ fontSize: 11, color: WA_SUBTEXT, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 3 }}>
                    09:41
                    {m.from === "user" && <DoubleCheckIcon color={WA_READ_TICK} />}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div role="alert" style={{ flexShrink: 0, background: "#FDECEA", color: "#A12C20", borderTop: "1px solid #f3c0b9", padding: "10px 14px", fontSize: 12.5, lineHeight: 1.45, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={restore} style={{ flexShrink: 0, border: "none", cursor: "pointer", background: "#A12C20", color: "#fff", borderRadius: 14, padding: "5px 11px", fontSize: 12, fontWeight: 600 }}>Restore</button>
            </div>
          )}

          {/* Input bar */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 8, padding: "8px 10px 10px", background: WA_HEADER_BG, borderTop: "1px solid #D1D1D1" }}>
            <button aria-label="Emoji" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 1, display: "flex", alignSelf: "center" }}>
              <SmileIcon />
            </button>
            {recording ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 14px", borderRadius: 20, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.08)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e0392b", animation: "wa-rec 1s ease-in-out infinite", flexShrink: 0 }} />
                <div aria-label="Recording your voice" style={{ flex: 1, display: "flex", alignItems: "center", gap: 2, height: 26, overflow: "hidden" }}>
                  {(levels.length ? levels : new Array(22).fill(0)).map((v, i) => (
                    <span key={i} style={{ flex: 1, minWidth: 2, height: `${Math.max(10, Math.min(100, v * 130))}%`, background: WA_GREEN, borderRadius: 2, transition: "height 70ms linear" }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: WA_SUBTEXT, flexShrink: 0 }}>tap ▸</span>
                <style>{`@keyframes wa-rec{0%,100%{opacity:1}50%{opacity:.25}}`}</style>
              </div>
            ) : (
              <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
                <textarea
                  aria-label="Message"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void onSend(); } }}
                  rows={2}
                  style={{
                    flex: 1, resize: "none",
                    border: tampered ? "1.5px solid #e0a23a" : "1px solid transparent",
                    outline: "none", borderRadius: 20, padding: "10px 34px 10px 14px",
                    // 16px+ prevents iOS Safari's auto-zoom on focus (real WhatsApp is ~17px anyway)
                    fontSize: 16, fontFamily: "inherit", lineHeight: 1.45, color: WA_TEXT,
                    background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.08)",
                  }}
                />
                <span style={{ position: "absolute", right: 10, bottom: 11, pointerEvents: "none", display: "flex" }}>
                  <CameraIcon />
                </span>
              </div>
            )}
            {input.trim() && !recording ? (
              <button onClick={onSend} aria-label="Send" style={{ flexShrink: 0, boxSizing: "border-box", width: 42, height: 42, padding: 0, borderRadius: "50%", border: "none", cursor: "pointer", background: WA_GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SendIcon />
              </button>
            ) : (
              <button
                onClick={live ? (recording ? stopRecording : startRecording) : undefined}
                aria-label={recording ? "Stop and send voice message" : "Record voice message"}
                title={live ? undefined : "Open a live Text Us chat to send voice notes"}
                style={{ flexShrink: 0, boxSizing: "border-box", width: 42, height: 42, padding: 0, borderRadius: "50%", border: "none", cursor: live ? "pointer" : "default", background: recording ? "#e0392b" : WA_GREEN, opacity: live ? 1 : 0.6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {recording ? <SendIcon /> : <MicIcon />}
              </button>
            )}
          </div>

          {/* Home indicator */}
          <div style={{ flexShrink: 0, height: 34, background: WA_HEADER_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 130, height: 5, background: "#000", borderRadius: 3, opacity: 0.18 }} />
          </div>

          {/* Call/camera confirm dialog */}
          {confirm && (
            <div role="dialog" aria-modal="true" aria-label="Confirm action" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 12px 60px", zIndex: 20 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: "22px 20px", width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,.3)" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {confirm === "call" ? <PhoneIcon color={WA_TEAL} size={38} /> : <VideoIcon color={WA_TEAL} size={38} />}
                </div>
                <p style={{ fontWeight: 700, fontSize: 16, textAlign: "center", margin: "12px 0 6px", color: WA_TEXT }}>
                  {confirm === "call" ? "Call CPF Board?" : "Open camera?"}
                </p>
                <p style={{ fontSize: 13, color: "#777", textAlign: "center", margin: "0 0 20px" }}>Did you tap this by accident?</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setConfirm(null)} style={{ flex: 1, border: "1.5px solid #ddd", background: "#fff", color: "#333", borderRadius: 12, padding: "12px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => { setActive(confirm); setConfirm(null); }} style={{ flex: 1, border: "none", background: WA_TEAL, color: "#fff", borderRadius: 12, padding: "12px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                    {confirm === "call" ? "Call" : "Open"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active call/camera screen */}
          {active && (
            <div role="dialog" aria-modal="true" style={{ position: "absolute", inset: 0, background: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, zIndex: 20 }}>
              <CpfAvatar size={90} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  CPF Board<VerifiedBadge size={20} />
                </div>
                <div style={{ fontSize: 14, opacity: 0.6, textAlign: "center", marginTop: 4 }}>{active === "call" ? "Calling…" : "Camera (demo)"}</div>
              </div>
              <button onClick={() => setActive(null)} style={{ marginTop: 16, border: "none", background: "#E0392B", color: "#fff", borderRadius: 30, padding: "14px 32px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                {active === "call" ? "End Call" : "Close"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Demo disclaimer */}
      <p style={{ color: "rgba(255,255,255,.3)", fontSize: 12, marginTop: 28, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        This is a simulated demonstration of the CPF Board Text Us service. No real messages are sent. For the real service, visit cpf.gov.sg.
      </p>
    </div>
  );
}
