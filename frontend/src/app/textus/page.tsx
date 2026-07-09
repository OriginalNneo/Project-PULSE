"use client";

import { useState } from "react";
import BackHomeButton from "@/components/BackHomeButton";

const PREFILL =
  "[Please do not edit this message]\nWelcome to CPF Board Text Us. To begin the chat, simply press the send button.";

interface Bubble {
  from: "user" | "system";
  text: string;
}

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

  const tampered = input.trim() !== PREFILL.trim();

  function onSend() {
    if (tampered) {
      setError(
        "⚠️ Message not sent. Please don't edit or delete the pre-filled message — send it exactly as it is to start your chat. Tap \"Restore\" below, or start a new chat from the official CPF Text Us link.",
      );
      return;
    }
    setError(null);
    setMessages((m) => [
      ...m,
      { from: "user", text: input },
      {
        from: "system",
        text: "✅ Thanks! You're now connected to CPF Board. A Customer Correspondence Officer will be with you shortly — please type your question.",
      },
    ]);
    setInput("");
  }

  function restore() {
    setInput(PREFILL);
    setError(null);
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
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#00A884", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "#fff", flexShrink: 0 }}>CPF</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16.5, color: WA_TEXT }}>CPF Board</div>
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

            {messages.length === 0 && (
              <div style={{ alignSelf: "center", background: "#FFF8C5", borderRadius: 8, padding: "9px 14px", fontSize: 12.5, color: "#7a6a2f", textAlign: "center", maxWidth: "88%", marginTop: 4, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,.08)" }}>
                The message below has been pre-filled by CPF Board.<br />Press Send to begin — please don't edit it.
              </div>
            )}

            {messages.map((m, i) => (
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
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
              <textarea
                aria-label="Message"
                value={input}
                onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                rows={2}
                style={{
                  flex: 1, resize: "none",
                  border: tampered ? "1.5px solid #e0a23a" : "1px solid transparent",
                  outline: "none", borderRadius: 20, padding: "10px 34px 10px 14px",
                  fontSize: 14, fontFamily: "inherit", lineHeight: 1.45, color: WA_TEXT,
                  background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.08)",
                }}
              />
              <span style={{ position: "absolute", right: 10, bottom: 11, pointerEvents: "none", display: "flex" }}>
                <CameraIcon />
              </span>
            </div>
            {input.trim() ? (
              <button onClick={onSend} aria-label="Send" style={{ flexShrink: 0, boxSizing: "border-box", width: 42, height: 42, padding: 0, borderRadius: "50%", border: "none", cursor: "pointer", background: WA_GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <SendIcon />
              </button>
            ) : (
              <button aria-label="Voice message" style={{ flexShrink: 0, boxSizing: "border-box", width: 42, height: 42, padding: 0, borderRadius: "50%", border: "none", cursor: "pointer", background: WA_GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MicIcon />
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
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#00A884", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>CPF</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, textAlign: "center" }}>CPF Board</div>
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
