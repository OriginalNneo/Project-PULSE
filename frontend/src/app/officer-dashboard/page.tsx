"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmotionEvent {
  userId: string;
  channel: string;
  emotion_label: string;
  emotion_score: number;
  message_preview: string;
  ts: string;
}

interface ChatMessage {
  role: string;
  content: string;
  ts: string;
}

interface QueueEntry {
  queueId: string;
  sessionId: string;
  userId: string;
  emotion_score: number;
  emotion_label: string;
  priority_score: number;
  summary: string;
  chat_history: ChatMessage[];
  preferred_lang: string;
  status: string;
  assigned_officer: string | null;
  created_at: string;
}

interface QueueStats {
  waiting: number;
  avg_wait_minutes: number;
}

// ── Constants / helpers ───────────────────────────────────────────────────────

const EMOTION_COLOR: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  rage:       { bg: "#fde8e8", text: "#c0392b", border: "#e74c3c", badge: "#e74c3c" },
  angry:      { bg: "#fdebd0", text: "#a04000", border: "#e67e22", badge: "#e67e22" },
  frustrated: { bg: "#fef9e7", text: "#7d6608", border: "#f1c40f", badge: "#d4a500" },
  sad:        { bg: "#eaf4fb", text: "#1a5276", border: "#2980b9", badge: "#2980b9" },
  neutral:    { bg: "#f4f6f7", text: "#555",    border: "#ccc",    badge: "#888"    },
};

function ec(label: string) {
  return EMOTION_COLOR[label] ?? EMOTION_COLOR.neutral!;
}

function scoreBar(score: number, height = 6) {
  const color = score > 70 ? "#e74c3c" : score > 50 ? "#e67e22" : score > 35 ? "#d4a500" : "#27ae60";
  return (
    <div style={{ background: "#e8e8e8", borderRadius: 4, height, width: "100%", marginTop: 4 }}>
      <div style={{ background: color, width: `${score}%`, height: "100%", borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function waitMins(ts: string) {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ label, bg, color = "#fff" }: { label: string; bg: string; color?: string }) {
  return (
    <span style={{
      background: bg, color, borderRadius: 12,
      padding: "1px 8px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" as const,
    }}>
      {label}
    </span>
  );
}

function EmotionCard({ evt, isNew }: { evt: EmotionEvent; isNew: boolean }) {
  const s = ec(evt.emotion_label);
  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 8,
      padding: "10px 12px",
      marginBottom: 8,
      boxShadow: isNew ? `0 0 0 2px ${s.border}` : "none",
      animation: isNew ? "fadeIn 0.4s ease" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: s.text }}>
          {evt.channel.toUpperCase()} · ···{evt.userId.slice(-6)}
        </span>
        <Badge label={`${evt.emotion_label} ${evt.emotion_score}`} bg={s.badge} />
      </div>
      <div style={{ fontSize: 12, color: "#444", fontStyle: "italic", marginBottom: 4 }}>
        "{evt.message_preview.slice(0, 90)}{evt.message_preview.length > 90 ? "…" : ""}"
      </div>
      {scoreBar(evt.emotion_score)}
      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{timeAgo(evt.ts)}</div>
    </div>
  );
}

function QueueCard({
  entry,
  isActive,
  onTake,
}: {
  entry: QueueEntry;
  isActive: boolean;
  onTake: (e: QueueEntry) => void;
}) {
  const s = ec(entry.emotion_label);
  const wait = waitMins(entry.created_at);
  return (
    <div
      onClick={() => onTake(entry)}
      style={{
        background: isActive ? "#eaf4fb" : "#fff",
        border: `1.5px solid ${isActive ? "#2980b9" : s.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "box-shadow 0.2s",
        boxShadow: isActive ? "0 0 0 2px #2980b9" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>···{entry.userId.slice(-8)}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <Badge label={entry.emotion_label} bg={s.badge} />
          <Badge label={`P${entry.priority_score}`} bg="#5b4fcf" />
        </div>
      </div>
      {scoreBar(entry.emotion_score, 5)}
      <div style={{ fontSize: 12, color: "#555", marginTop: 6, lineHeight: 1.4 }}>
        {entry.summary.slice(0, 100)}{entry.summary.length > 100 ? "…" : ""}
      </div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 5, display: "flex", justifyContent: "space-between" }}>
        <span>{entry.preferred_lang.toUpperCase()} · {entry.status}</span>
        <span>{wait}m waiting</span>
      </div>
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (id: string) => void }) {
  const [input, setInput] = useState("");
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f0f2f5",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "40px 48px",
        boxShadow: "0 4px 24px rgba(0,0,0,.1)", minWidth: 340, textAlign: "center",
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a5276", marginBottom: 4 }}>PULSE — CCU Officer Dashboard</h1>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>Enter your officer ID to access the queue</p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && input.trim() && onLogin(input.trim())}
          placeholder="Officer ID (e.g. CCU-01)"
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #ccc",
            fontSize: 15, boxSizing: "border-box" as const, marginBottom: 12, outline: "none",
          }}
          autoFocus
        />
        <button
          onClick={() => input.trim() && onLogin(input.trim())}
          style={{
            width: "100%", padding: "10px 0", background: "#1a5276", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >
          Enter Dashboard
        </button>
      </div>
    </div>
  );
}

// ── Active case panel ─────────────────────────────────────────────────────────

function CasePanel({
  entry,
  officerId,
  onResolve,
  onClose,
}: {
  entry: QueueEntry;
  officerId: string;
  onResolve: (queueId: string) => void;
  onClose: () => void;
}) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [localHistory, setLocalHistory] = useState<ChatMessage[]>(entry.chat_history ?? []);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalHistory(entry.chat_history ?? []);
  }, [entry.queueId, entry.chat_history]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localHistory]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`/dashboard-api/send/${entry.queueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim(), officerId }),
      });
      setLocalHistory((h) => [
        ...h,
        { role: "officer", content: reply.trim(), ts: new Date().toISOString() },
      ]);
      setReply("");
    } finally {
      setSending(false);
    }
  };

  const resolve = async () => {
    if (resolving) return;
    setResolving(true);
    try {
      await fetch(`/dashboard-api/resolve/${entry.queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerId }),
      });
      onResolve(entry.queueId);
    } finally {
      setResolving(false);
    }
  };

  const s = ec(entry.emotion_label);

  return (
    <div style={{
      display: "flex", flexDirection: "column" as const, height: "100%",
      background: "#fff", border: "1.5px solid #dde3ea", borderRadius: 10, overflow: "hidden",
    }}>
      {/* Case header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid #e8eaed",
        background: s.bg, display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: s.text }}>
            ···{entry.userId.slice(-8)}
            <span style={{ marginLeft: 8 }}><Badge label={entry.emotion_label} bg={s.badge} /></span>
            <span style={{ marginLeft: 4 }}><Badge label={`Score ${entry.emotion_score}`} bg={s.badge} /></span>
          </div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
            {entry.summary.slice(0, 90)}{entry.summary.length > 90 ? "…" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
          <button
            onClick={resolve}
            disabled={resolving}
            style={{
              background: resolving ? "#ccc" : "#27ae60", color: "#fff", border: "none",
              borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: resolving ? "not-allowed" : "pointer",
            }}
          >
            {resolving ? "Resolving…" : "✓ Resolve"}
          </button>
          <button
            onClick={onClose}
            style={{
              background: "#f4f6f7", color: "#555", border: "1px solid #ccc",
              borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Chat history */}
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "12px 16px" }}>
        {localHistory.length === 0 && (
          <p style={{ color: "#aaa", fontSize: 13, textAlign: "center" as const, marginTop: 24 }}>No messages yet.</p>
        )}
        {localHistory.map((msg, i) => {
          const isUser = msg.role === "user";
          const isOfficer = msg.role === "officer";
          const isBot = !isUser && !isOfficer;
          return (
            <div key={i} style={{
              display: "flex",
              justifyContent: isUser ? "flex-start" : "flex-end",
              marginBottom: 10,
            }}>
              <div style={{
                maxWidth: "75%",
                background: isUser ? "#f0f2f5" : isOfficer ? "#e8f4fd" : "#e8ffe8",
                border: isUser ? "1px solid #dde" : isOfficer ? "1px solid #add" : "1px solid #8d8",
                borderRadius: 10,
                padding: "8px 12px",
              }}>
                <div style={{ fontSize: 10, color: "#888", marginBottom: 3, fontWeight: 600 }}>
                  {isUser ? "USER" : isOfficer ? `OFFICER (${officerId})` : "BOT"} · {timeAgo(msg.ts)}
                </div>
                <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{msg.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Reply box */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid #e8eaed", display: "flex", gap: 8 }}>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
          }}
          placeholder="Reply to user… (Enter to send, Shift+Enter for newline)"
          rows={2}
          style={{
            flex: 1, resize: "none" as const, border: "1.5px solid #ccc", borderRadius: 8,
            padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none",
          }}
        />
        <button
          onClick={sendReply}
          disabled={sending || !reply.trim()}
          style={{
            background: sending || !reply.trim() ? "#ccc" : "#1a5276",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "0 16px", fontSize: 13, fontWeight: 600,
            cursor: sending || !reply.trim() ? "not-allowed" : "pointer",
            alignSelf: "stretch" as const,
          }}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ── Main officer dashboard ────────────────────────────────────────────────────

export default function OfficerDashboardPage() {
  const [officerId, setOfficerId] = useState<string | null>(null);
  const [feed, setFeed] = useState<EmotionEvent[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<QueueStats>({ waiting: 0, avg_wait_minutes: 0 });
  const [activeCase, setActiveCase] = useState<QueueEntry | null>(null);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  const refreshQueue = useCallback(() => {
    fetch("/dashboard-api/queue")
      .then((r) => r.json())
      .then((data: { queue: QueueEntry[]; stats: QueueStats }) => {
        setQueue(data.queue ?? []);
        setStats(data.stats ?? { waiting: 0, avg_wait_minutes: 0 });
      })
      .catch(() => null);
  }, []);

  const refreshFeed = useCallback(() => {
    fetch("/dashboard-api/emotion-feed")
      .then((r) => r.json())
      .then((data: EmotionEvent[]) => setFeed(data))
      .catch(() => null);
  }, []);

  // ── Load initial data & connect WS after login ─────────────────────────────
  useEffect(() => {
    if (!officerId) return;

    refreshFeed();
    refreshQueue();

    // Polling fallback: re-sync queue + feed every 5 s in case WS misses an event
    const pollInterval = setInterval(() => {
      refreshQueue();
      refreshFeed();
    }, 5000);

    // Set officer status to available
    fetch("/dashboard-api/officer/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerId, status: "available" }),
    }).catch(() => null);

    // WebSocket — derive host from current page URL so it works both locally and remotely
    function connect() {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      // On HTTPS (public domain), use same host so Caddy proxies /dashboard/ws → backend.
      // On plain HTTP (local dev), talk directly to the backend port.
      const wsHost = window.location.protocol === "https:"
        ? window.location.host
        : `${window.location.hostname}:3000`;
      const wsUrl = `${wsProtocol}//${wsHost}/dashboard/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus("connected");
      ws.onclose = () => {
        setWsStatus("disconnected");
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as {
            event: string;
            payload: Record<string, unknown>;
          };

          if (msg.event === "emotion_update") {
            const evt = msg.payload as unknown as EmotionEvent;
            const id = `${evt.userId}:${evt.ts}`;
            setFeed((prev) => [evt, ...prev].slice(0, 100));
            setNewIds((prev) => {
              const next = new Set(prev);
              next.add(id);
              setTimeout(() => setNewIds((s) => { const n = new Set(s); n.delete(id); return n; }), 2000);
              return next;
            });
          }

          if (["new_queue_entry", "queue_updated", "case_resolved", "officer_assigned"].includes(msg.event)) {
            refreshQueue();
            // refresh active case if it was updated
            if (msg.event === "queue_updated" || msg.event === "officer_message") {
              setActiveCase((prev) => {
                if (!prev) return prev;
                fetch(`/dashboard-api/queue/${prev.queueId}`)
                  .then((r) => r.json())
                  .then((d: QueueEntry) => setActiveCase(d))
                  .catch(() => null);
                return prev;
              });
            }
          }

          if (msg.event === "case_resolved") {
            const resolved = (msg.payload as { queueId?: string }).queueId;
            setActiveCase((prev) => (prev?.queueId === resolved ? null : prev));
          }
        } catch {
          /* ignore parse errors */
        }
      };
    }

    connect();
    return () => {
      clearInterval(pollInterval);
      wsRef.current?.close();
      fetch("/dashboard-api/officer/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officerId, status: "break" }),
      }).catch(() => null);
    };
  }, [officerId, refreshQueue, refreshFeed]);

  const handleTakeCase = (entry: QueueEntry) => {
    if (!officerId) return;
    // Fetch full entry with chat history
    fetch(`/dashboard-api/queue/${entry.queueId}`)
      .then((r) => r.json())
      .then((full: QueueEntry) => setActiveCase(full))
      .catch(() => setActiveCase(entry));

    // Mark officer busy / assign
    fetch("/dashboard-api/officer/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerId, status: "busy" }),
    }).catch(() => null);
  };

  const handleResolve = (queueId: string) => {
    if (activeCase?.queueId === queueId) setActiveCase(null);
    refreshQueue();
    // Set officer back to available
    fetch("/dashboard-api/officer/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officerId, status: "available" }),
    }).catch(() => null);
  };

  if (!officerId) return <LoginScreen onLogin={setOfficerId} />;

  const sortedQueue = [...queue].sort((a, b) => b.priority_score - a.priority_score);
  const wsColor = wsStatus === "connected" ? "#27ae60" : wsStatus === "connecting" ? "#f39c12" : "#e74c3c";
  const highDistress = queue.filter((e) => e.emotion_score > 70).length;

  return (
    <div style={{ position: "fixed" as const, top: 60, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column" as const, background: "#f0f2f5", fontFamily: "system-ui, sans-serif", zIndex: 10 }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
      `}</style>

      {/* Top bar */}
      <div style={{
        padding: "10px 20px", background: "#1a2c3d", color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>PULSE CCU Officer Dashboard</span>
          <span style={{ fontSize: 12, background: "#2c4a63", padding: "2px 10px", borderRadius: 12 }}>
            {officerId}
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 13 }}>
          {highDistress > 0 && (
            <span style={{ background: "#e74c3c", padding: "2px 10px", borderRadius: 12, fontWeight: 700, animation: "fadeIn 0.3s ease" }}>
              ⚠ {highDistress} high distress
            </span>
          )}
          <span style={{ color: "#aaa" }}>Queue: <strong style={{ color: "#fff" }}>{stats.waiting}</strong> waiting</span>
          <span style={{ color: "#aaa" }}>Avg wait: <strong style={{ color: "#fff" }}>{stats.avg_wait_minutes}m</strong></span>
          <span style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 12,
            background: wsColor, fontWeight: 600,
          }}>
            {wsStatus === "connected" ? "● Live" : wsStatus === "connecting" ? "◌ …" : "✕ Off"}
          </span>
          <button
            onClick={() => {
              fetch("/dashboard-api/officer/status", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ officerId, status: "break" }),
              }).catch(() => null);
              setOfficerId(null);
            }}
            style={{
              background: "transparent", color: "#aaa", border: "1px solid #445",
              borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* 3-column body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: activeCase ? "280px 1fr 380px" : "280px 1fr", gap: 12, padding: 12, overflow: "hidden" }}>

        {/* Col 1: Priority Queue */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #dde3ea", display: "flex", flexDirection: "column" as const, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#333", margin: 0 }}>
              Priority Queue <span style={{ color: "#888", fontWeight: 400 }}>({sortedQueue.length})</span>
            </h2>
            <p style={{ fontSize: 11, color: "#888", margin: "3px 0 0" }}>Sorted by frustration · Click to take case</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const, padding: "10px 12px" }}>
            {sortedQueue.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13, textAlign: "center" as const, marginTop: 24 }}>Queue is empty</p>
            ) : (
              sortedQueue.map((entry) => (
                <QueueCard
                  key={entry.queueId}
                  entry={entry}
                  isActive={activeCase?.queueId === entry.queueId}
                  onTake={handleTakeCase}
                />
              ))
            )}
          </div>
        </div>

        {/* Col 2: Emotion Feed */}
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #dde3ea", display: "flex", flexDirection: "column" as const, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#333", margin: 0 }}>
              Live Emotion Feed <span style={{ color: "#888", fontWeight: 400 }}>({feed.length} recent)</span>
            </h2>
            <p style={{ fontSize: 11, color: "#888", margin: "3px 0 0" }}>All channels · real-time</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const, padding: "10px 12px" }}>
            {feed.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13, textAlign: "center" as const, marginTop: 24 }}>No messages yet</p>
            ) : (
              feed.slice(0, 80).map((evt) => {
                const id = `${evt.userId}:${evt.ts}`;
                return <EmotionCard key={id} evt={evt} isNew={newIds.has(id)} />;
              })
            )}
          </div>
        </div>

        {/* Col 3: Active Case (conditional) */}
        {activeCase && (
          <CasePanel
            entry={activeCase}
            officerId={officerId}
            onResolve={handleResolve}
            onClose={() => setActiveCase(null)}
          />
        )}
      </div>
    </div>
  );
}
