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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function selectLanguage(label: string, code: string) {
    setLanguage(code);
    setActiveLangLabel(label);
    inputRef.current?.focus();
  }

  async function send() {
    const text = input.trim();
    if (!text || isSending) return;

    setError(null);
    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    // History the backend should see is everything BEFORE this new message.
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: history,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }

      const json = await res.json();
      const reply: string =
        json?.data?.content ??
        "Sorry, I couldn't read a reply from PULSE just now. Please try again.";

      setMessages((prev) => [
        ...prev,
        { role: "agent", content: reply, timestamp: new Date().toISOString() },
      ]);
    } catch (err) {
      setError(
        "Sorry, I couldn't reach PULSE. Please check your connection and try again.",
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline.
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
          <div
            key={i}
            role="article"
            aria-label={m.role === "user" ? "You" : "PULSE"}
          >
            <p>
              <strong>{m.role === "user" ? "You" : "PULSE"}:</strong> {m.content}
            </p>
          </div>
        ))}
        {isSending && (
          <p aria-live="polite">PULSE is thinking…</p>
        )}
      </div>

      {error && (
        <p role="alert">{error}</p>
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

      <nav aria-label="Language selection">
        <p>Replying in: <strong>{activeLangLabel}</strong></p>
        <ul>
          {LANGUAGES.map((l) => (
            <li key={l.label}>
              <button
                type="button"
                aria-pressed={activeLangLabel === l.label}
                onClick={() => selectLanguage(l.label, l.code)}
              >
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
                <button
                  type="button"
                  aria-pressed={activeLangLabel === d.label}
                  onClick={() => selectLanguage(d.label, d.code)}
                >
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
