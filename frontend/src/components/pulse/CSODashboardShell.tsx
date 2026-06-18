import type { CSOAlertPriority, CSOAlertProjection } from "@/lib/pulse";
import { pulseCssVariables } from "@/lib/pulse";
import type { CSSProperties } from "react";
import styles from "./CSODashboardShell.module.css";

interface CSODashboardShellProps {
  alerts: CSOAlertProjection[];
}

type PulseStyle = CSSProperties & Record<`--${string}`, string>;

const priorityOrder: Record<CSOAlertPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function CSODashboardShell({ alerts }: CSODashboardShellProps) {
  const sortedAlerts = [...alerts].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );
  const activeAlert = sortedAlerts[0];
  const openCount = alerts.filter((alert) => alert.status === "open").length;
  const urgentCount = alerts.filter(
    (alert) => alert.priority === "high" || alert.priority === "critical",
  ).length;
  const assignedCount = alerts.filter((alert) => alert.status === "assigned").length;

  return (
    <section
      className={styles.console}
      style={pulseCssVariables as PulseStyle}
      aria-labelledby="cso-dashboard-title"
    >
      <header className={styles.commandBar}>
        <div className={styles.brandBlock}>
          <span className={styles.productMark}>PULSE</span>
          <div>
            <h1 id="cso-dashboard-title">CSO Triage Console</h1>
            <p>Live assistance queue for CPF digital support sessions</p>
          </div>
        </div>
        <div className={styles.statusStrip} aria-label="Queue status">
          <Metric label="Open" value={openCount} />
          <Metric label="Urgent" value={urgentCount} tone="danger" />
          <Metric label="Assigned" value={assignedCount} />
          <Metric label="System" value="Online" tone="success" />
        </div>
      </header>

      {activeAlert ? (
        <div className={styles.workbench}>
          <QueuePane alerts={sortedAlerts} activeAlertId={activeAlert.alertId} />
          <CasePane alert={activeAlert} />
          <AssistPane alert={activeAlert} />
        </div>
      ) : (
        <div className={styles.emptyState}>
          <h2>No live alerts</h2>
          <p>Queue snapshot loaded successfully. The dashboard is monitoring for new friction events.</p>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <div className={`${styles.metric} ${styles[tone]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function QueuePane({
  alerts,
  activeAlertId,
}: {
  alerts: CSOAlertProjection[];
  activeAlertId: string;
}) {
  return (
    <aside className={styles.queuePane} aria-label="Live alert queue">
      <div className={styles.paneHeader}>
        <div>
          <h2>Queue</h2>
          <p>{alerts.length} active alerts</p>
        </div>
        <button type="button" className={styles.secondaryButton}>Refresh</button>
      </div>

      <div className={styles.segmentedControl} aria-label="Queue filters">
        <button type="button" className={styles.segmentActive}>All</button>
        <button type="button">Urgent</button>
        <button type="button">Voice</button>
      </div>

      <ul className={styles.alertList}>
        {alerts.map((alert) => (
          <li key={alert.alertId}>
            <button
              type="button"
              className={alert.alertId === activeAlertId ? styles.activeAlert : styles.alertItem}
              aria-current={alert.alertId === activeAlertId}
            >
              <span className={styles.alertTopline}>
                <strong>{alert.memberAlias}</strong>
                <PriorityBadge priority={alert.priority} />
              </span>
              <span className={styles.alertTask}>{alert.currentTask}</span>
              <span className={styles.alertMeta}>
                <span>{formatAge(alert.createdAt)}</span>
                <span>{alert.channel}</span>
                <span>{alert.language}{alert.dialect ? `/${alert.dialect}` : ""}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function CasePane({ alert }: { alert: CSOAlertProjection }) {
  return (
    <main className={styles.casePane} aria-label="Selected alert detail">
      <section className={styles.caseHeader}>
        <div>
          <span className={styles.kicker}>Selected case</span>
          <h2>{alert.memberAlias}</h2>
          <p>{humanizePageKey(alert.pageKey)}</p>
        </div>
        <div className={styles.caseBadges}>
          <PriorityBadge priority={alert.priority} />
          <StatusBadge status={alert.status} />
        </div>
      </section>

      <section className={styles.roadblockBand} aria-labelledby="roadblock-title">
        <span className={styles.kicker} id="roadblock-title">Current roadblock</span>
        <p>{alert.roadblock}</p>
      </section>

      <section className={styles.caseFacts} aria-label="Case facts">
        <Fact label="Task" value={alert.currentTask} />
        <Fact label="Rule" value={alert.deterministicReason} />
        <Fact label="AI summary" value={alert.hermesSummary} />
      </section>

      <section className={styles.timelineSection} aria-labelledby="timeline-title">
        <div className={styles.sectionTitle}>
          <h3 id="timeline-title">Journey Signals</h3>
          <span>Most recent meaningful events</span>
        </div>
        <ol className={styles.timeline}>
          {alert.recentSignals.slice(-6).map((signal) => (
            <li key={`${signal.type}-${signal.occurredAt}`}>
              <time>{formatClock(signal.occurredAt)}</time>
              <div>
                <strong>{signal.label}</strong>
                <span>{signal.type}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function AssistPane({ alert }: { alert: CSOAlertProjection }) {
  return (
    <aside className={styles.assistPane} aria-label="Intervention actions">
      <div className={styles.paneHeader}>
        <div>
          <h2>Assist</h2>
          <p>{alert.sessionId}</p>
        </div>
      </div>

      <section className={styles.openingScript} aria-labelledby="opening-title">
        <span className={styles.kicker} id="opening-title">Suggested opening</span>
        <p>{alert.suggestedOpening}</p>
      </section>

      <div className={styles.actionStack}>
        <button type="button" className={styles.primaryButton}>Start live assist</button>
        <button type="button">Send simplified message</button>
        <button type="button">Offer callback</button>
        <button type="button">Transfer to specialist</button>
        <button type="button">Mark resolved</button>
        <button type="button" className={styles.ghostButton}>Dismiss alert</button>
      </div>

      <section className={styles.contextPanel} aria-labelledby="support-title">
        <div className={styles.sectionTitle}>
          <h3 id="support-title">Support Context</h3>
          <span>Privacy-safe notes</span>
        </div>
        {alert.riskFlags.length > 0 ? (
          <ul className={styles.contextList}>
            {alert.riskFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No active risk flags.</p>
        )}
      </section>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.factRow}>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: CSOAlertPriority }) {
  return <span className={`${styles.priorityBadge} ${styles[priority]}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: CSOAlertProjection["status"] }) {
  return <span className={styles.statusBadge}>{status.replace("_", " ")}</span>;
}

function formatClock(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

function formatAge(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m waiting`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m waiting`;
}

function humanizePageKey(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
