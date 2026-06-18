import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { MemberSession, PageKey, RecommendedAction, UiProfile } from "@/lib/pulse";
import { pulseCssVariables } from "@/lib/pulse";
import styles from "./AdaptiveShell.module.css";

type PulseStyle = CSSProperties & Record<`--${string}`, string>;

interface AdaptiveShellProps {
  pageKey: PageKey;
  uiProfile: UiProfile;
  session: MemberSession;
  title: string;
  children: ReactNode;
}

export function AdaptiveShell({
  pageKey,
  uiProfile,
  session,
  title,
  children,
}: AdaptiveShellProps) {
  const isReduced = uiProfile.mode === "simplified" || uiProfile.mode === "assisted";

  return (
    <section
      className={`${styles.shell} ${styles[uiProfile.mode]}`}
      style={pulseCssVariables as PulseStyle}
      data-page-key={pageKey}
      aria-labelledby={`${pageKey}-title`}
    >
      <div className={styles.headerRow}>
        <div>
          <p className={styles.kicker}>Adaptive service shell</p>
          <h1 id={`${pageKey}-title`}>{title}</h1>
        </div>
        <span className={styles.modeBadge}>{uiProfile.mode}</span>
      </div>

      {isReduced ? (
        <SimplifiedActionPanel actions={uiProfile.recommendedActions.slice(0, 3)} />
      ) : (
        <StandardNavigation actions={uiProfile.recommendedActions} />
      )}

      <div className={styles.content}>{children}</div>

      {uiProfile.mode === "assisted" ? (
        <AssistanceDock
          pageKey={pageKey}
          sessionId={session.sessionId}
          supportContext={uiProfile.supportContext}
        />
      ) : null}
    </section>
  );
}

function StandardNavigation({ actions }: { actions: RecommendedAction[] }) {
  return (
    <nav className={styles.standardNav} aria-label="Recommended member actions">
      {actions.map((action) => (
        <RecommendedActionButton key={action.actionKey} action={action} />
      ))}
    </nav>
  );
}

function SimplifiedActionPanel({ actions }: { actions: RecommendedAction[] }) {
  return (
    <div className={styles.actionPanel} aria-label="Recommended next actions">
      {actions.map((action) => (
        <RecommendedActionButton key={action.actionKey} action={action} />
      ))}
    </div>
  );
}

function RecommendedActionButton({ action }: { action: RecommendedAction }) {
  return (
    <Link className={styles.actionButton} href={action.href}>
      <span>{action.label}</span>
      <small>{action.description}</small>
    </Link>
  );
}

function AssistanceDock({
  pageKey,
  sessionId,
  supportContext,
}: {
  pageKey: PageKey;
  sessionId: string;
  supportContext?: string;
}) {
  return (
    <aside className={styles.assistanceDock} aria-label="Assistance">
      <div>
        <strong>Support ready</strong>
        <span>{supportContext ?? "Guided help is available"}</span>
      </div>
      <button type="button" data-page-key={pageKey} data-session-id={sessionId}>
        Request help
      </button>
    </aside>
  );
}
