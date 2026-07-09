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

function StatusBar() {
  return (
    <div style={{ height: 44, background: "#000", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px 0 24px", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontSize: 15, fontWeight: 600, letterSpacing: 0.2 }}>9:41</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Signal bars */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="white">
          <rect x="0" y="8" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" />
          <rect x="9" y="3" width="3" height="9" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" />
        </svg>
        {/* Wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
          <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
          <path d="M8 6.5c1.4 0 2.7.6 3.6 1.5l1.1-1.1A7 7 0 0 0 8 5a7 7 0 0 0-4.7 1.9L4.4 8c.9-.9 2.2-1.5 3.6-1.5z" opacity=".8" />
          <path d="M8 3.5c2.5 0 4.7 1 6.3 2.6L15.6 5A9.5 9.5 0 0 0 8 2 9.5 9.5 0 0 0 .4 5l1.3 1.1A8 8 0 0 1 8 3.5z" opacity=".5" />
        </svg>
        {/* Battery */}
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          <div style={{ width: 25, height: 12, border: "1.5px solid rgba(255,255,255,.35)", borderRadius: 3.5, padding: 1.5, position: "relative" }}>
            <div style={{ width: "80%", height: "100%", background: "#30D158", borderRadius: 1.5 }} />
          </div>
          <div style={{ width: 2, height: 5, background: "rgba(255,255,255,.4)", borderRadius: "0 1px 1px 0" }} />
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
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, background: "#075E54", color: "#fff", padding: "10px 14px 10px 10px", zIndex: 5 }}>
            <button style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: "4px 6px", lineHeight: 1 }} aria-label="Back">‹</button>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#128C7E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0, border: "2px solid rgba(255,255,255,.2)" }}>CPF</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>CPF Board</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>online</div>
            </div>
            <button onClick={() => setConfirm("camera")} aria-label="Video call" style={{ background: "none", border: "none", color: "#fff", fontSize: 21, cursor: "pointer", padding: 5, lineHeight: 1 }}>📹</button>
            <button onClick={() => setConfirm("call")} aria-label="Voice call" style={{ background: "none", border: "none", color: "#fff", fontSize: 21, cursor: "pointer", padding: 5, lineHeight: 1 }}>📞</button>
            <button aria-label="More options" style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: 5, lineHeight: 1 }}>⋮</button>
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
              background: "#ECE5DD",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23ECE5DD'/%3E%3C/svg%3E\")",
            }}
          >
            {/* Date pill */}
            <div style={{ alignSelf: "center", background: "rgba(225,221,216,.95)", borderRadius: 8, padding: "3px 12px", fontSize: 12, color: "#4a4a4a", boxShadow: "0 1px 1px rgba(0,0,0,.08)" }}>
              Today
            </div>

            {/* Encryption notice */}
            <div style={{ alignSelf: "center", background: "rgba(225,221,216,.9)", borderRadius: 8, padding: "8px 14px", fontSize: 11.5, color: "#555", textAlign: "center", maxWidth: "85%", lineHeight: 1.5 }}>
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
                  maxWidth: "80%", padding: "8px 12px 10px", borderRadius: m.from === "user" ? "10px 2px 10px 10px" : "2px 10px 10px 10px",
                  fontSize: 14.5, lineHeight: 1.45, whiteSpace: "pre-wrap",
                  background: m.from === "user" ? "#DCF8C6" : "#fff",
                  color: "#111",
                  boxShadow: "0 1px 2px rgba(0,0,0,.13)",
                  position: "relative",
                }}>
                  {m.text}
                  <span style={{ fontSize: 11, color: "#999", display: "block", textAlign: "right", marginTop: 3 }}>
                    {m.from === "user" ? "09:41 ✓✓" : "09:41"}
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
          <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-end", gap: 8, padding: "8px 10px 10px", background: "#F0F0F0", borderTop: "1px solid #ddd" }}>
            <button aria-label="Emoji" style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", padding: 4, lineHeight: 1, color: "#888" }}>😊</button>
            <textarea
              aria-label="Message"
              value={input}
              onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
              rows={2}
              style={{
                flex: 1, resize: "none",
                border: tampered ? "1.5px solid #e0a23a" : "1px solid transparent",
                outline: "none", borderRadius: 22, padding: "10px 14px",
                fontSize: 14, fontFamily: "inherit", lineHeight: 1.45,
                background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.1)",
              }}
            />
            {input.trim() ? (
              <button onClick={onSend} aria-label="Send" style={{ flexShrink: 0, width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", background: "#25D366", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ➤
              </button>
            ) : (
              <button aria-label="Voice message" style={{ flexShrink: 0, width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", background: "#25D366", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                🎤
              </button>
            )}
          </div>

          {/* Home indicator */}
          <div style={{ flexShrink: 0, height: 34, background: "#ECE5DD", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 130, height: 5, background: "#000", borderRadius: 3, opacity: 0.18 }} />
          </div>

          {/* Call/camera confirm dialog */}
          {confirm && (
            <div role="dialog" aria-modal="true" aria-label="Confirm action" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 12px 60px", zIndex: 20 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: "22px 20px", width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,.3)" }}>
                <div style={{ fontSize: 38, textAlign: "center" }}>{confirm === "call" ? "📞" : "📹"}</div>
                <p style={{ fontWeight: 700, fontSize: 16, textAlign: "center", margin: "12px 0 6px" }}>
                  {confirm === "call" ? "Call CPF Board?" : "Open camera?"}
                </p>
                <p style={{ fontSize: 13, color: "#777", textAlign: "center", margin: "0 0 20px" }}>Did you tap this by accident?</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setConfirm(null)} style={{ flex: 1, border: "1.5px solid #ddd", background: "#fff", color: "#333", borderRadius: 12, padding: "12px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={() => { setActive(confirm); setConfirm(null); }} style={{ flex: 1, border: "none", background: "#075E54", color: "#fff", borderRadius: 12, padding: "12px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                    {confirm === "call" ? "Call" : "Open"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active call/camera screen */}
          {active && (
            <div role="dialog" aria-modal="true" style={{ position: "absolute", inset: 0, background: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, zIndex: 20 }}>
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#128C7E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>CPF</div>
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
