"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Officer.module.css";
import { officerApi } from "../../lib/officer/api";
import type {
  Conversation,
  DashboardChatCard,
  Emotion,
  IncomingQueryCard,
  OfficerDashboard,
  Urgency,
} from "../../lib/officer/types";

const OFFICER_NAME = "Sharon Lee";
const POLL_MS = 4000;

const EMOTION_LABEL: Record<Emotion, string> = {
  distressed: "Distressed",
  angry: "Angry",
  anxious: "Anxious",
  confused: "Confused",
  neutral: "Neutral",
  calm: "Calm",
  happy: "Happy",
};

// Emotion → chip tone (matches the mockup: red-ish for negative, green for positive).
function emotionTone(emotion: Emotion): "bad" | "warn" | "good" {
  if (emotion === "distressed" || emotion === "angry") return "bad";
  if (emotion === "anxious" || emotion === "confused" || emotion === "neutral") return "warn";
  return "good";
}

function urgencyClass(urgency: Urgency): string {
  return urgency === "high" ? styles.dotRed : urgency === "medium" ? styles.dotAmber : styles.dotGreen;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function inactiveLabel(ms: number): string {
  const hr = Math.floor(ms / 3600000);
  if (hr >= 1) return `Inactive for ${hr}h`;
  const min = Math.floor(ms / 60000);
  return `Inactive for ${min}m`;
}

export default function OfficerPage() {
  const [data, setData] = useState<OfficerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const refresh = useCallback(async () => {
    try {
      const dashboard = await officerApi.getDashboard();
      setData(dashboard);
      setLive(true);
      setError(null);
    } catch (err) {
      setLive(false);
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Live push from Davin's backend WebSocket — instant refresh on queue/emotion events
  useEffect(() => {
    function connect() {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const host = location.protocol === "https:" ? location.host : `${location.hostname}:3000`;
      const ws = new WebSocket(`${proto}//${host}/dashboard/ws`);
      ws.onmessage = (ev) => {
        try {
          // Backend broadcasts { event, payload, ts } — read `event` (not `type`).
          const { event } = JSON.parse(ev.data) as { event: string };
          if (["emotion_update","new_queue_entry","queue_updated","case_resolved","officer_assigned","officer_message","user_message"].includes(event)) {
            void refresh();
          }
        } catch { /* ignore */ }
      };
      ws.onclose = () => { wsRef.current = null; setTimeout(connect, 3000); };
      wsRef.current = ws;
    }
    connect();
    return () => wsRef.current?.close();
  }, [refresh]);

  const stats = data?.stats;

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>CPF</span>
          <div>
            <div className={styles.title}>CPF Queries Dashboard</div>
            <div className={styles.subtitle}>Customer Correspondence Unit</div>
          </div>
        </div>
        <div className={styles.topright}>
          <span className={styles.liveWrap}>
            <span className={live ? styles.liveDot : styles.liveDotOff} aria-hidden />
            {live ? "Live" : "Offline"}
          </span>
          <span className={styles.officer}>
            <span className={styles.avatar} aria-hidden>SL</span>
            {OFFICER_NAME}
          </span>
        </div>
      </header>

      {error && <p className={styles.error} role="alert">Cannot reach backend: {error}</p>}

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.statRow}>
            <StatCard value={stats?.openChats ?? 0} label="OPEN CHATS"
              sub={stats?.urgentChats ? `${stats.urgentChats} urgent` : "none urgent"} subTone={stats?.urgentChats ? "bad" : "muted"} />
            <StatCard value={stats?.incomingQueries ?? 0} label="INCOMING QUERIES"
              sub={`+${stats?.incomingLast10Min ?? 0} in the last 10 mins`} subTone="muted" />
            <StatCard value={stats?.avgResponseMinutes != null ? `${stats.avgResponseMinutes}m` : "—"} label="AVG RESPONSE TIME"
              sub="Good!" subTone="good" />
            <StatCard value={stats?.resolvedToday ?? 0} label="RESOLVED TODAY" sub="Good!" subTone="good" />
          </div>

          <section aria-labelledby="open-heading">
            <h2 id="open-heading" className={styles.sectionHeading}>💬 Open Chats</h2>
            {data && data.openChats.length === 0 && (
              <p className={styles.empty}>No open chats. Escalations from the chatbot will appear here.</p>
            )}
            <div className={styles.cardGrid}>
              {data?.openChats.map((chat) => (
                <ChatCard key={chat.sessionId} chat={chat} onOpen={() => setSelected(chat.sessionId)} />
              ))}
            </div>
          </section>

          {data && data.inactiveChats.length > 0 && (
            <section aria-labelledby="inactive-heading">
              <h2 id="inactive-heading" className={styles.sectionHeading}>⏱ Inactive Chats</h2>
              <div className={styles.cardGrid}>
                {data.inactiveChats.map((chat) => (
                  <button key={chat.sessionId} className={styles.inactiveCard} onClick={() => setSelected(chat.sessionId)}>
                    <div className={styles.cardName}>{chat.displayName}</div>
                    <div className={styles.nric}>{chat.maskedNric}</div>
                    <div className={styles.cardSummary}>{chat.summary}</div>
                    <div className={styles.inactiveMeta}>⏱ {inactiveLabel(chat.inactiveForMs)}</div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className={styles.rail} aria-labelledby="incoming-heading">
          <h2 id="incoming-heading" className={styles.railHeading}>❯ INCOMING QUERIES</h2>
          {data?.incoming.length === 0 && <p className={styles.railEmpty}>No incoming queries right now.</p>}
          {data?.incoming.map((q) => (
            <IncomingItem key={q.escalationId} query={q} onOpen={() => setSelected(q.sessionId)} />
          ))}
          {data && data.incoming.length > 0 && (
            <p className={styles.railEnd}>You have reached the end of your incoming queries.</p>
          )}
        </aside>
      </div>

      {selected && (
        <ConversationDetail
          sessionId={selected}
          onClose={() => setSelected(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function StatCard({ value, label, sub, subTone }: {
  value: number | string; label: string; sub: string; subTone: "good" | "bad" | "muted";
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      <div className={`${styles.statSub} ${subTone === "good" ? styles.subGood : subTone === "bad" ? styles.subBad : ""}`}>{sub}</div>
    </div>
  );
}

function ChatCard({ chat, onOpen }: { chat: DashboardChatCard; onOpen: () => void }) {
  const tone = emotionTone(chat.emotion);
  return (
    <button className={styles.chatCard} onClick={onOpen}>
      <span className={`${styles.cornerDot} ${urgencyClass(chat.urgency)}`} aria-hidden />
      <span className={`${styles.topBar} ${urgencyClass(chat.urgency)}`} aria-hidden />
      <div className={styles.cardName}>{chat.displayName}</div>
      <div className={styles.nric}>{chat.maskedNric}</div>
      <div className={styles.cardSummary}>{chat.summary}</div>
      <div className={styles.cardFooter}>
        <span className={`${styles.chip} ${styles[`chip_${tone}`]}`}>☻ {EMOTION_LABEL[chat.emotion]}</span>
        <span className={`${styles.confChip} ${styles[`chip_${tone}`]}`}>{chat.confidence}%</span>
      </div>
      <div className={styles.confBarTrack}>
        <span
          className={`${styles.confBarFill} ${styles[`fill_${tone}`]}`}
          style={{ width: `${Math.max(4, chat.confidence)}%` }}
        />
      </div>
    </button>
  );
}

function IncomingItem({ query, onOpen }: { query: IncomingQueryCard; onOpen: () => void }) {
  return (
    <button className={styles.incomingItem} onClick={onOpen}>
      <div className={styles.incomingText}>
        <div className={styles.incomingName}>{query.displayName}</div>
        <div className={styles.incomingTopic}>{query.topic}</div>
        <div className={styles.incomingTime}>{relativeTime(query.createdAt)}</div>
      </div>
      <span className={`${styles.statusDot} ${urgencyClass(query.urgency)}`} aria-hidden />
    </button>
  );
}

function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

function ConversationDetail({ sessionId, onClose, onChanged }: {
  sessionId: string; onClose: () => void; onChanged: () => void;
}) {
  const [conv, setConv] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const logRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      setConv(await officerApi.getConversation(sessionId));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Take the case the moment the officer opens it: waiting → assigned (the "state change").
  const ackedRef = useRef(false);
  useEffect(() => {
    if (ackedRef.current) return;
    ackedRef.current = true;
    officerApi.acknowledge(sessionId, OFFICER_NAME).then(onChanged).catch(() => {});
  }, [sessionId, onChanged]);

  // Live push: refresh this conversation the instant the citizen or another officer
  // sends a message on this session — no 4s polling lag.
  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const host = location.protocol === "https:" ? location.host : `${location.hostname}:3000`;
    const ws = new WebSocket(`${proto}//${host}/dashboard/ws`);
    ws.onmessage = (ev) => {
      try {
        const { event, payload } = JSON.parse(ev.data) as { event: string; payload?: { queueId?: string } };
        if (["user_message", "officer_message", "queue_updated"].includes(event) && payload?.queueId === sessionId) {
          void load();
        }
      } catch { /* ignore */ }
    };
    return () => ws.close();
  }, [sessionId, load]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [conv]);

  const send = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await officerApi.reply(sessionId, OFFICER_NAME, draft.trim());
      setDraft("");
      await load();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    try {
      await officerApi.closeSession(sessionId, OFFICER_NAME);
      onChanged();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const session = conv?.session;
  const profile = conv?.profile ?? null;
  const escalation = conv?.escalation ?? null;

  // Left "chat history" = the citizen↔bot exchange before/after the officer.
  const botTurns = session?.turns.filter((t) => t.role === "user" || t.role === "assistant") ?? [];
  // Middle "conversation" = the officer-handled thread (officer + citizen).
  const liveTurns = session?.turns ?? [];

  return (
    <div className={styles.detail} role="dialog" aria-modal="true" aria-label="Conversation detail">
      {/* LEFT: chat history (citizen ↔ bot) */}
      <aside className={`${styles.histPane} ${historyOpen ? "" : styles.histClosed}`}>
        <div className={styles.histHead}>
          <span>CHAT HISTORY</span>
          <button className={styles.collapseBtn} onClick={() => setHistoryOpen((v) => !v)} aria-label="Toggle chat history">
            {historyOpen ? "‹" : "›"}
          </button>
        </div>
        {historyOpen && (
          <div className={styles.histLog}>
            {botTurns.map((t, i) => (
              <div key={i} className={t.role === "user" ? styles.histUser : styles.histBot}>
                {t.content}
                {t.role === "user" && t.emotion_score != null && (
                  <SentimentChip score={t.emotion_score} label={t.emotion_label} />
                )}
              </div>
            ))}
            {botTurns.length === 0 && <p className={styles.histEmpty}>No prior chatbot history.</p>}
          </div>
        )}
      </aside>

      {/* MIDDLE: the live conversation */}
      <section className={styles.convPane}>
        <div className={styles.convHead}>
          <button className={styles.backBtn} onClick={onClose} aria-label="Back to dashboard">←</button>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <h2 className={styles.convName}>{session?.displayName ?? "Loading…"}</h2>
            {session?.channelUserId && (
              <span style={{ fontSize: 11, opacity: 0.6, fontFamily: "monospace" }}>{session.channelUserId}</span>
            )}
          </div>
          <button className={styles.convClose} onClick={close} disabled={busy}>Close Session</button>
        </div>

        {escalation && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryLine}>[Summary of query]</div>
            <p>{escalation.summary}</p>
          </div>
        )}

        <div className={styles.convLog} ref={logRef} role="log" aria-live="polite">
          {liveTurns.map((turn, i) => (
            <div
              key={i}
              className={
                turn.role === "officer"
                  ? styles.cOfficer
                  : turn.role === "assistant"
                    ? styles.cBot
                    : turn.role === "system"
                      ? styles.cSystem
                      : styles.cCitizen
              }
            >
              {turn.content}
              {turn.role === "user" && turn.emotion_score != null && (
                <SentimentChip score={turn.emotion_score} label={turn.emotion_label} />
              )}
            </div>
          ))}
          {liveTurns.length === 0 && <p className={styles.histEmpty}>No messages yet.</p>}
        </div>

        {err && <p className={styles.error} role="alert">{err}</p>}

        <div className={styles.composer}>
          <span className={styles.composerPlus}>+</span>
          <textarea
            className={styles.composerInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your reply to the citizen…"
            rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          />
          <button className={styles.composerSend} onClick={send} disabled={busy || !draft.trim()}>Send</button>
        </div>
      </section>

      {/* RIGHT: member profile (Singpass record) */}
      <aside className={styles.profilePane}>
        {profile ? <MemberPanel profile={profile} /> : <p className={styles.histEmpty}>No member record.</p>}
      </aside>
    </div>
  );
}

function MemberPanel({ profile: p }: { profile: import("../../lib/officer/types").MemberProfile }) {
  return (
    <>
      <div className={styles.pIdentity}>
        <div className={styles.pIdLine}>
          <strong>{p.maskedNric}</strong> · Age {p.age} · {p.residentialStatus}
        </div>
        <Row label="Date of birth" value={p.dateOfBirth} />
        <Row label="Contact" value={p.contact} />
        <Row label="Preferred language" value={p.preferredLanguage} />
        <Row label="Address" value={p.address} />
        {p.dataSource === "demo" && <div className={styles.demoNote}>Representative record (demo)</div>}
      </div>

      <div className={styles.acctRow}>
        <div className={styles.acctChip}><span>Ordinary (OA)</span><strong>{money(p.ordinary)}</strong></div>
        <div className={styles.acctChip}><span>MediSave (MA)</span><strong>{money(p.medisave)}</strong></div>
        <div className={styles.acctChip}><span>Retirement (RA)</span><strong>{money(p.retirement)}</strong></div>
      </div>

      <h3 className={styles.pSection}>Retirement Overview</h3>
      <Row label="Retirement sum elected" value={p.retirementSumElected} />
      <Row label="Monthly payout" value={p.monthlyPayout != null ? `${money(p.monthlyPayout)} / month` : "—"} />
      <Row label="Payout start date" value={p.payoutStartDate ?? "—"} />
      <Row label="Shortfall vs Full RS" value={money(p.shortfallVsFullRs)} />

      <h3 className={styles.pSection}>Schemes</h3>
      {p.schemes.map((s) => <Row key={s.name} label={s.name} value={s.status} />)}

      <h3 className={styles.pSection}>Flags and Alerts</h3>
      <ul className={styles.flagList}>
        {p.flags.length === 0 && <li className={styles.flagOk}>No active alerts.</li>}
        {p.flags.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </>
  );
}

function SentimentChip({ score, label }: { score: number; label?: string }) {
  const color = score > 70 ? "#c0392b" : score > 40 ? "#b58a00" : "#2e7d32";
  const name = label ? label[0].toUpperCase() + label.slice(1) : "Sentiment";
  return (
    <span
      style={{ display: "block", marginTop: 4, fontSize: 11, fontWeight: 600, color, opacity: 0.85 }}
      title={`Sentiment score ${score}/100`}
    >
      ☻ {name} · {score}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.pRow}>
      <span className={styles.pRowLabel}>{label}</span>
      <span className={styles.pRowValue}>{value}</span>
    </div>
  );
}
