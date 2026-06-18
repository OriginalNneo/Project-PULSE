"use client";

import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmotionEvent {
  userId: string;
  channel: string;
  emotion_label: string;
  emotion_score: number;
  message_preview: string;
  ts: string;
}

interface QueueEntry {
  queueId: string;
  userId: string;
  emotion_score: number;
  emotion_label: string;
  priority_score: number;
  summary: string;
  preferred_lang: string;
  status: string;
  created_at: string;
}

// ── Emotion colour helpers ────────────────────────────────────────────────────

const EMOTION_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  rage:       { bg: "#fde8e8", text: "#c0392b", border: "#e74c3c" },
  angry:      { bg: "#fdebd0", text: "#a04000", border: "#e67e22" },
  frustrated: { bg: "#fef9e7", text: "#7d6608", border: "#f1c40f" },
  sad:        { bg: "#eaf4fb", text: "#1a5276", border: "#2980b9" },
  neutral:    { bg: "#f4f6f7", text: "#555",    border: "#ccc"    },
};

function emotionStyle(label: string) {
  return EMOTION_COLOR[label] ?? EMOTION_COLOR.neutral;
}

function scoreBar(score: number) {
  const color =
    score > 70 ? "#e74c3c" :
    score > 50 ? "#e67e22" :
    score > 35 ? "#f1c40f" :
    "#27ae60";
  return (
    <div style={{ background: "#e0e0e0", borderRadius: 4, height: 6, width: "100%", marginTop: 4 }}>
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

// ── Stat chip ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e0e0e0",
      borderRadius: 8,
      padding: "12px 20px",
      minWidth: 120,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? "#1a5276" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Emotion feed card ─────────────────────────────────────────────────────────

function EmotionCard({ evt, isNew }: { evt: EmotionEvent; isNew: boolean }) {
  const s = emotionStyle(evt.emotion_label);
  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 8,
      transition: "all 0.3s",
      boxShadow: isNew ? `0 0 0 2px ${s.border}` : "none",
      animation: isNew ? "fadeIn 0.4s ease" : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: s.text }}>
          {evt.channel.toUpperCase()} · {evt.userId.replace(/^[a-z]+:/, "").slice(-6)}
        </span>
        <span style={{
          background: s.border,
          color: "#fff",
          borderRadius: 12,
          padding: "1px 8px",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "capitalize",
        }}>
          {evt.emotion_label} {evt.emotion_score}
        </span>
      </div>
      <div style={{ fontSize: 13, color: "#333", marginBottom: 4, fontStyle: "italic" }}>
        "{evt.message_preview}{evt.message_preview.length >= 80 ? "…" : ""}"
      </div>
      {scoreBar(evt.emotion_score)}
      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{timeAgo(evt.ts)}</div>
    </div>
  );
}

// ── Queue card ────────────────────────────────────────────────────────────────

function QueueCard({ entry }: { entry: QueueEntry }) {
  const s = emotionStyle(entry.emotion_label);
  const waitMins = Math.floor((Date.now() - new Date(entry.created_at).getTime()) / 60000);
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${s.border}`,
      borderRadius: 8,
      padding: "12px 14px",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {entry.userId.replace(/^[a-z]+:/, "").slice(-8)}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{
            background: s.border, color: "#fff", borderRadius: 12,
            padding: "1px 7px", fontSize: 11, fontWeight: 700, textTransform: "capitalize",
          }}>
            {entry.emotion_label}
          </span>
          <span style={{
            background: "#e8f0fe", color: "#1a5276", borderRadius: 12,
            padding: "1px 7px", fontSize: 11, fontWeight: 600,
          }}>
            Priority {entry.priority_score}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#555", margin: "6px 0", lineHeight: 1.4 }}>
        {entry.summary.slice(0, 120)}{entry.summary.length > 120 ? "…" : ""}
      </div>
      <div style={{ fontSize: 11, color: "#888" }}>
        Lang: {entry.preferred_lang.toUpperCase()} · Status: {entry.status} · Waiting: {waitMins}m
      </div>
    </div>
  );
}

// ── Main dashboard page ───────────────────────────────────────────────────────

const WS_URL = "ws://localhost:3000/dashboard/ws";

export default function DashboardPage() {
  const [feed, setFeed] = useState<EmotionEvent[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  // ── Initial data load ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/dashboard-api/emotion-feed")
      .then((r) => r.json())
      .then((data: EmotionEvent[]) => setFeed(data))
      .catch(() => null);

    fetch("/dashboard-api/queue")
      .then((r) => r.json())
      .then((data: { queue: QueueEntry[] }) => setQueue(data.queue ?? []))
      .catch(() => null);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus("connected");
      ws.onclose = () => {
        setWsStatus("disconnected");
        setTimeout(connect, 3000); // auto-reconnect
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

          if (
            msg.event === "new_queue_entry" ||
            msg.event === "queue_updated" ||
            msg.event === "case_resolved"
          ) {
            fetch("/dashboard-api/queue")
              .then((r) => r.json())
              .then((data: { queue: QueueEntry[] }) => setQueue(data.queue ?? []))
              .catch(() => null);
          }
        } catch {
          // ignore parse errors
        }
      };
    }

    connect();
    return () => wsRef.current?.close();
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const recentFeed = feed.slice(0, 50);
  const distressCount = recentFeed.filter((e) => e.emotion_score > 70).length;
  const frustratedCount = recentFeed.filter((e) => e.emotion_score > 50 && e.emotion_score <= 70).length;
  const avgScore = recentFeed.length
    ? Math.round(recentFeed.reduce((a, e) => a + e.emotion_score, 0) / recentFeed.length)
    : 0;

  const wsColor = wsStatus === "connected" ? "#27ae60" : wsStatus === "connecting" ? "#f39c12" : "#e74c3c";

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a5276" }}>PULSE — Emotion Monitor</h1>
        <span style={{
          fontSize: 12, padding: "4px 10px", borderRadius: 12,
          background: wsColor, color: "#fff", fontWeight: 600,
        }}>
          {wsStatus === "connected" ? "● Live" : wsStatus === "connecting" ? "◌ Connecting…" : "✕ Disconnected"}
        </span>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <Stat label="Messages tracked" value={feed.length} />
        <Stat label="High distress" value={distressCount} color="#e74c3c" />
        <Stat label="Frustrated" value={frustratedCount} color="#e67e22" />
        <Stat label="Avg score" value={avgScore} color="#1a5276" />
        <Stat label="In queue" value={queue.length} color="#8e44ad" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

        {/* Live emotion feed */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#333" }}>
            Live Emotion Feed
            <span style={{ fontWeight: 400, fontSize: 12, color: "#888", marginLeft: 8 }}>
              ({recentFeed.length} recent)
            </span>
          </h2>
          {recentFeed.length === 0 && (
            <p style={{ color: "#888", fontSize: 14 }}>No messages yet — waiting for users to chat.</p>
          )}
          {recentFeed.map((evt) => {
            const id = `${evt.userId}:${evt.ts}`;
            return <EmotionCard key={id} evt={evt} isNew={newIds.has(id)} />;
          })}
        </div>

        {/* Escalation queue */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#333" }}>
            Escalation Queue
            <span style={{ fontWeight: 400, fontSize: 12, color: "#888", marginLeft: 8 }}>
              ({queue.length} cases)
            </span>
          </h2>
          {queue.length === 0 && (
            <p style={{ color: "#888", fontSize: 14 }}>Queue is empty.</p>
          )}
          {[...queue]
            .sort((a, b) => b.priority_score - a.priority_score)
            .map((entry) => (
              <QueueCard key={entry.queueId} entry={entry} />
            ))}
        </div>

      </div>
    </div>
  );
}
