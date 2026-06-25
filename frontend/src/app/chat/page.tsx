"use client";

import { useRef, useState } from "react";

type Role = "user" | "agent";
interface Message {
  role: Role;
  content: string;
  timestamp: string;
}

// In dev we call the backend directly (NEXT_PUBLIC_BACKEND_URL in .env.local)
// because the Next dev proxy is unreliable; in prod this is empty → same-origin.
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const GREETING =
  "Hello! I'm PULSE. How can I help you today? You can ask me about tax letters, healthcare appointments, housing matters, or any government correspondence.";

// Demo: what a "clear" voice note gets transcribed to (the unclear path errors instead).
const CLEAR_TRANSCRIPT = "How much of my CPF can I withdraw at age 55?";

// Backend /query accepts these language codes (LanguageSchema). The text query
// endpoint has no dialect field, so each dialect maps to its base language.
const LANGUAGES: { label: string; code: string }[] = [
  { label: "English", code: "en" },
  { label: "中文", code: "zh" },
  { label: "Bahasa Melayu", code: "ms" },
  { label: "தமிழ்", code: "ta" },
];

const DIALECTS: { label: string; code: string }[] = [
  { label: "福建话 (Hokkien)", code: "zh" },
  { label: "广东话 (Cantonese)", code: "zh" },
  { label: "潮州话 (Teochew)", code: "zh" },
  { label: "客家话 (Hakka)", code: "zh" },
  { label: "海南话 (Hainanese)", code: "zh" },
  { label: "Bazaar Melayu", code: "ms" },
  { label: "Singapore Tamil", code: "ta" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: GREETING, timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const [activeLangLabel, setActiveLangLabel] = useState("English");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Voice-note demo (scenario 2): clear → transcribed & answered; unclear → error.
  const [isRecording, setIsRecording] = useState(false);
  const [voiceQuality, setVoiceQuality] = useState<"clear" | "unclear">("clear");
  const [voiceError, setVoiceError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function selectLanguage(label: string, code: string) {
    setLanguage(code);
    setActiveLangLabel(label);
    inputRef.current?.focus();
  }

  // Send one turn to /query. `displayContent` is what appears in the chat as the
  // user's message; `queryText` is what's actually sent (same, except voice notes).
  async function runQuery(displayContent: string, queryText: string) {
    if (isSending) return;
    setError(null);
    setVoiceError(false);
    const userMessage: Message = { role: "user", content: displayContent, timestamp: new Date().toISOString() };
    const history = messages.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp }));

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText, conversationHistory: history, language }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = await res.json();
      const reply: string =
        json?.data?.content ?? "Sorry, I couldn't read a reply from PULSE just now. Please try again.";
      setMessages((prev) => [...prev, { role: "agent", content: reply, timestamp: new Date().toISOString() }]);
    } catch (err) {
      setError("Sorry, I couldn't reach PULSE. Please check your connection and try again.");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    await runQuery(text, text);
  }

  // ── Voice note (simulated for the demo; real mic recording could replace this) ──
  function startRecording() {
    if (isSending) return;
    setVoiceError(false);
    setIsRecording(true);
  }

  function stopRecording() {
    setIsRecording(false);
    if (voiceQuality === "unclear") {
      setVoiceError(true); // failure path — couldn't make out the recording
      return;
    }
    void runQuery(`🎤 ${CLEAR_TRANSCRIPT}`, CLEAR_TRANSCRIPT); // clear → transcribed & answered
  }

  function connectOfficer() {
    setVoiceError(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "agent",
        content:
          "Connecting you to a Customer Correspondence Officer — please hold while we transfer you. An officer will continue this conversation with you shortly.",
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div>
      <h1>Ask PULSE</h1>
      <p>Ask a question about your government correspondence in any language or dialect.</p>

      <div role="log" aria-label="Conversation" aria-live="polite" aria-atomic="false">
        {messages.map((m, i) => (
          <div key={i} role="article" aria-label={m.role === "user" ? "You" : "PULSE"}>
            <p>
              <strong>{m.role === "user" ? "You" : "PULSE"}:</strong> {m.content}
            </p>
          </div>
        ))}
        {isSending && <p aria-live="polite">PULSE is thinking…</p>}
      </div>

      {error && <p role="alert">{error}</p>}

      {/* Voice-note failure (scenario 2): unclear/muffled recording */}
      {voiceError && (
        <div role="alert">
          <p>🎤 Sorry, I couldn’t make out your voice message clearly — it sounded muffled or unclear. Please try again, or connect to a CCU officer for help.</p>
          <button type="button" onClick={() => { setVoiceError(false); startRecording(); }}>🔁 Try again</button>
          <button type="button" onClick={connectOfficer}>👤 Connect to a CCU officer</button>
        </div>
      )}

      <form aria-label="Send a message" onSubmit={onSubmit}>
        <label htmlFor="chat-input" className="sr-only">Type your question</label>
        <textarea
          id="chat-input"
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your question in any language..."
          rows={3}
          disabled={isSending}
        />
        <button type="submit" disabled={isSending || input.trim().length === 0}>
          {isSending ? "Sending…" : "Send"}
        </button>
      </form>

      {/* Voice message control */}
      <div aria-label="Voice message">
        {!isRecording ? (
          <button type="button" onClick={startRecording} disabled={isSending}>🎤 Record voice message</button>
        ) : (
          <button type="button" onClick={stopRecording}>⏹ Stop &amp; send (recording…)</button>
        )}
        <span> — demo voice quality: </span>
        <button type="button" aria-pressed={voiceQuality === "clear"} onClick={() => setVoiceQuality("clear")} disabled={isRecording}>Clear</button>
        <button type="button" aria-pressed={voiceQuality === "unclear"} onClick={() => setVoiceQuality("unclear")} disabled={isRecording}>Unclear</button>
      </div>

      <nav aria-label="Language selection">
        <p>Replying in: <strong>{activeLangLabel}</strong></p>
        <ul>
          {LANGUAGES.map((l) => (
            <li key={l.label}>
              <button type="button" aria-pressed={activeLangLabel === l.label} onClick={() => selectLanguage(l.label, l.code)}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <details>
          <summary>Dialects</summary>
          <ul>
            {DIALECTS.map((d) => (
              <li key={d.label}>
                <button type="button" aria-pressed={activeLangLabel === d.label} onClick={() => selectLanguage(d.label, d.code)}>
                  {d.label}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </nav>
    </div>
  );
}
