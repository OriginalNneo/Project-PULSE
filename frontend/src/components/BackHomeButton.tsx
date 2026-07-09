"use client";

// Floating translucent "back to home" pill, meant to sit above each tab's own
// chrome (simulated portal headers, nav rails, etc.) — that's why it's fixed
// and blurred rather than laid into each page's own layout.
export default function BackHomeButton() {
  return (
    <a
      href="/"
      aria-label="Back to PULSE home"
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 16px 9px 12px",
        borderRadius: 999,
        background: "rgba(255,252,245,0.7)",
        border: "1px solid rgba(11,97,96,0.18)",
        boxShadow: "0 4px 18px rgba(11,97,96,0.16)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#0b6160",
        textDecoration: "none",
        fontFamily: "var(--font-body), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 13.5,
        fontWeight: 600,
        transition: "background .15s ease, box-shadow .15s ease, transform .15s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "rgba(255,252,245,0.92)";
        el.style.boxShadow = "0 6px 22px rgba(11,97,96,0.22)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "rgba(255,252,245,0.7)";
        el.style.boxShadow = "0 4px 18px rgba(11,97,96,0.16)";
        el.style.transform = "translateY(0)";
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      Home
    </a>
  );
}
