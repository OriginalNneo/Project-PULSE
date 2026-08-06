"use client";

import { useState } from "react";

// The officer dashboard is a three-pane desktop console (nav rail + case list +
// conversation + detail panel) that doesn't reflow — below ~1000px it's cramped
// and below phone width it's unusable. Rather than redesign it for mobile, this
// overlay explains that and offers a way through. Which of the two messages
// shows is decided in globals.css by orientation, so there's no hydration flash.
const TEAL = "#0b6160";
const CREAM = "#fffcf5";
const FONT_HEADING = "var(--font-heading), Georgia, 'Times New Roman', serif";
const FONT_BODY = "var(--font-body), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function RotateIcon() {
  return (
    <svg width="72" height="46" viewBox="0 0 56 44" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* portrait phone → landscape phone, with a turn arrow between them */}
      <rect x="3" y="10" width="16" height="30" rx="3" />
      <line x1="8" y1="36" x2="14" y2="36" />
      <rect x="31" y="19" width="22" height="21" rx="3" />
      <line x1="49" y1="24" x2="49" y2="34" />
      <path d="M20 10c6-6 14-6 19 0" />
      <polyline points="39 3 39.6 10.4 32.6 10" />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" fill="none" stroke={TEAL} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="9" width="38" height="26" rx="3" />
      <line x1="18" y1="42" x2="30" y2="42" />
      <line x1="24" y1="35" x2="24" y2="42" />
    </svg>
  );
}

export default function DashboardSizeNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className="pulse-dash-notice"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dash-notice-heading"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: CREAM,
        display: "none",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 26px",
        fontFamily: FONT_BODY,
        color: TEAL,
      }}
    >
      <div className="pulse-dash-notice-rotate" style={{ display: "none", flexDirection: "column", alignItems: "center" }}>
        <RotateIcon />
        <h1 id="dash-notice-heading" style={{ fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 600, margin: "20px 0 10px", lineHeight: 1.25 }}>
          Rotate your phone
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "rgba(11,97,96,0.72)", maxWidth: 340 }}>
          The Officer Dashboard is a three-pane console built for a wide screen. Turn your phone sideways for more room — it's best viewed on a desktop.
        </p>
      </div>

      <div className="pulse-dash-notice-desktop" style={{ display: "none", flexDirection: "column", alignItems: "center" }}>
        <DesktopIcon />
        <h1 style={{ fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 600, margin: "20px 0 10px", lineHeight: 1.25 }}>
          Best viewed on desktop
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "rgba(11,97,96,0.72)", maxWidth: 360 }}>
          The Officer Dashboard puts a case list, a live conversation and a citizen detail panel side by side. It needs a wider screen to be usable — open this demo on a laptop or desktop.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28, width: "100%", maxWidth: 260 }}>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          style={{ background: TEAL, color: CREAM, border: "none", borderRadius: 10, padding: "13px 24px", fontSize: 14.5, fontWeight: 700, fontFamily: FONT_BODY, cursor: "pointer" }}
        >
          View anyway
        </button>
        <a
          href="/"
          style={{ background: "transparent", border: "1px solid rgba(11,97,96,0.22)", color: TEAL, borderRadius: 10, padding: "12px 24px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
        >
          Back to PULSE home
        </a>
      </div>
    </div>
  );
}
