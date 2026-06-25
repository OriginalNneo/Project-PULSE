"use client";

import { useState } from "react";

// The canonical pre-filled "Text Us" opener. The citizen is meant to send it
// UNEDITED. Editing or deleting it is the failure scenario this screen demos.
const PREFILL =
  "[Please do not edit this message]\nWelcome to CPF Board Text Us. To begin the chat, simply press the send button.";

interface Bubble {
  from: "user" | "system";
  text: string;
}

type PendingAction = "call" | "camera" | null;

export default function TextUsDemoPage() {
  const [input, setInput] = useState(PREFILL);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Bubble[]>([]);
  // Scenario 3: accidental call/camera tap → confirm before acting.
  const [confirm, setConfirm] = useState<PendingAction>(null);
  const [active, setActive] = useState<PendingAction>(null);

  const tampered = input.trim() !== PREFILL.trim();

  function onSend() {
    // Scenario 1: the pre-filled message was edited or deleted → block + error.
    if (tampered) {
      setError(
        "⚠️ Message not sent. Please don’t edit or delete the pre-filled message — send it exactly as it is to start your chat. Tap “Restore message” below, or start a new chat from the official CPF Text Us link.",
      );
      return;
    }
    setError(null);
    setMessages((m) => [
      ...m,
      { from: "user", text: input },
      {
        from: "system",
        text: "✅ Thanks! You’re now connected to CPF Board. A Customer Correspondence Officer will be with you shortly — please type your question.",
      },
    ]);
    setInput("");
  }

  function restore() {
    setInput(PREFILL);
    setError(null);
  }

  const headerBtn: React.CSSProperties = {
    flex: "none", border: "none", background: "transparent", color: "#fff",
    fontSize: 20, cursor: "pointer", padding: 4, lineHeight: 1,
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", background: "#0b141a", minHeight: "100vh", padding: "20px 0" }}>
      <div style={{ position: "relative", width: 400, maxWidth: "100%", height: 740, display: "flex", flexDirection: "column", background: "#ECE5DD", borderRadius: 18, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,.4)" }}>
        {/* WhatsApp header */}
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, background: "#075E54", color: "#fff", padding: "12px 14px" }}>
          <span aria-hidden style={{ fontSize: 22 }}>←</span>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flex: "none" }}>CPF</div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>CPF Board</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>online</span>
          </div>
          <button onClick={() => setConfirm("camera")} aria-label="Video call" style={headerBtn}>📷</button>
          <button onClick={() => setConfirm("call")} aria-label="Voice call" style={headerBtn}>📞</button>
        </div>

        {/* chat area */}
        <div role="log" aria-label="Conversation" aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ alignSelf: "center", background: "#fff", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#555", boxShadow: "0 1px 1px rgba(0,0,0,.08)" }}>Today</div>
          {messages.length === 0 && (
            <div style={{ alignSelf: "center", background: "#FFF6D6", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, color: "#7a6a2f", textAlign: "center", maxWidth: "85%", marginTop: 6 }}>
              The message below has been pre-filled. Press send to begin your chat — please don’t change it.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 10, fontSize: 14, lineHeight: 1.4, whiteSpace: "pre-wrap", background: m.from === "user" ? "#DCF8C6" : "#fff", color: "#111", boxShadow: "0 1px 1px rgba(0,0,0,.1)" }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* error banner (scenario 1) */}
        {error && (
          <div role="alert" style={{ flex: "none", background: "#FDECEA", color: "#A12C20", borderTop: "1px solid #f3c0b9", padding: "10px 14px", fontSize: 13, lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={restore} style={{ flex: "none", border: "none", cursor: "pointer", background: "#A12C20", color: "#fff", borderRadius: 16, padding: "5px 12px", fontSize: 12.5, fontWeight: 600 }}>Restore message</button>
          </div>
        )}

        {/* input bar */}
        <div style={{ flex: "none", display: "flex", alignItems: "flex-end", gap: 8, padding: "8px 10px", background: "#F0F0F0" }}>
          <textarea
            aria-label="Message"
            value={input}
            onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
            rows={3}
            style={{ flex: 1, resize: "none", border: tampered ? "1.5px solid #e0a23a" : "1px solid #ddd", outline: "none", borderRadius: 18, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", lineHeight: 1.4, background: "#fff" }}
          />
          <button onClick={onSend} aria-label="Send" style={{ flex: "none", width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", background: "#25D366", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(37,211,102,.4)" }}>
            ➤
          </button>
        </div>

        {/* Scenario 3: confirmation dialog before call/camera */}
        {confirm && (
          <div role="dialog" aria-modal="true" aria-label="Confirm action" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "22px 20px", width: "100%", maxWidth: 300, boxShadow: "0 8px 30px rgba(0,0,0,.3)" }}>
              <div style={{ fontSize: 34, textAlign: "center" }}>{confirm === "call" ? "📞" : "📷"}</div>
              <p style={{ fontWeight: 700, fontSize: 16, textAlign: "center", margin: "10px 0 4px" }}>
                {confirm === "call" ? "Start a voice call with CPF Board?" : "Open the camera?"}
              </p>
              <p style={{ fontSize: 13, color: "#666", textAlign: "center", margin: "0 0 18px" }}>
                Did you tap this by accident?
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirm(null)} style={{ flex: 1, border: "1px solid #ccc", background: "#fff", color: "#333", borderRadius: 10, padding: "10px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { setActive(confirm); setConfirm(null); }} style={{ flex: 1, border: "none", background: "#075E54", color: "#fff", borderRadius: 10, padding: "10px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {confirm === "call" ? "Call" : "Open camera"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* placeholder "active" state after confirming (it's a simulation) */}
        {active && (
          <div role="dialog" aria-modal="true" style={{ position: "absolute", inset: 0, background: "#0b141a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
            <div style={{ width: 86, height: 86, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>CPF</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{active === "call" ? "Calling CPF Board…" : "Camera"}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>{active === "call" ? "📞 voice call (demo)" : "📷 camera preview (demo)"}</div>
            <button onClick={() => setActive(null)} style={{ marginTop: 10, border: "none", background: "#e0392b", color: "#fff", borderRadius: 24, padding: "10px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              {active === "call" ? "End call" : "Close"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
