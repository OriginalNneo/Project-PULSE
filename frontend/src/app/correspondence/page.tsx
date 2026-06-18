"use client";

import { useState } from "react";

const FILTERS = ["All", "Tax", "Housing", "Healthcare", "Employment"] as const;
type Filter = (typeof FILTERS)[number];

const DEMO_LETTER = {
  title: "CPF Annual Statement 2024",
  category: "Housing",
  date: "Jan 2025",
  status: "Unread",
  description:
    "Your CPF Annual Statement summarises the balance in your Ordinary, Special, MediSave and Retirement accounts as at 31 December 2024.",
};

export default function CorrespondenceListPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [showDemoNote, setShowDemoNote] = useState(false);

  const infoBannerStyle: React.CSSProperties = {
    background: "#eaf4fb",
    border: "1px solid #aed6f1",
    borderLeft: "4px solid #2980b9",
    borderRadius: 8,
    padding: "14px 18px",
    color: "#1a5276",
    fontSize: 14,
    lineHeight: 1.6,
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: "20px 24px",
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border: active ? "none" : "1px solid #ddd",
    background: active ? "#1a5276" : "#fff",
    color: active ? "#fff" : "#555",
    transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page heading */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a2c3d", margin: 0 }}>
          My Correspondence
        </h1>
        <p style={{ fontSize: 14, color: "#666", marginTop: 6 }}>
          CPF letters and notices linked to your account
        </p>
      </div>

      {/* Info banner */}
      <div style={infoBannerStyle}>
        <strong>About this section:</strong> This section shows CPF letters and notices linked to
        your account. In production, correspondence is retrieved via SingPass MyInfo. In this demo,
        no live letters are connected &mdash; you are seeing a sample entry below to illustrate what
        the interface looks like.
      </div>

      {/* Filter tabs */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "14px 20px",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#444", marginRight: 4 }}>
          Filter:
        </span>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            style={tabStyle(activeFilter === f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div
        style={{
          ...cardStyle,
          textAlign: "center",
          padding: "40px 24px",
          color: "#888",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#555", marginBottom: 6 }}>
          No correspondence found
        </div>
        <p style={{ fontSize: 14, color: "#888", margin: 0, maxWidth: 440, marginInline: "auto" }}>
          Letters will appear here once your account is linked via SingPass. Visit{" "}
          <a href="https://www.singpass.gov.sg" style={{ color: "#2980b9" }}>
            singpass.gov.sg
          </a>{" "}
          to connect your account.
        </p>
      </div>

      {/* Demo letter card */}
      {(activeFilter === "All" || activeFilter === DEMO_LETTER.category) && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#888",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Sample — Demo Entry
          </div>
          <div
            style={{
              ...cardStyle,
              borderLeft: "4px solid #2980b9",
              display: "flex",
              gap: 20,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* Left: text */}
            <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#eaf4fb",
                    color: "#1a5276",
                    padding: "2px 9px",
                    borderRadius: 12,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {DEMO_LETTER.category}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#fdecea",
                    color: "#c0392b",
                    padding: "2px 9px",
                    borderRadius: 12,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {DEMO_LETTER.status}
                </span>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2c3d" }}>
                {DEMO_LETTER.title}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>Issued: {DEMO_LETTER.date}</div>
              <p style={{ fontSize: 14, color: "#555", margin: 0, lineHeight: 1.6 }}>
                {DEMO_LETTER.description}
              </p>
            </div>

            {/* Right: action */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "flex-end",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setShowDemoNote(true)}
                style={{
                  background: "#2980b9",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 20px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                View
              </button>
              {showDemoNote && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#888",
                    fontStyle: "italic",
                    maxWidth: 140,
                    textAlign: "right",
                  }}
                >
                  Demo only — no document available
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeFilter !== "All" && activeFilter !== DEMO_LETTER.category && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "32px 24px",
            color: "#aaa",
            fontSize: 14,
          }}
        >
          No {activeFilter.toLowerCase()} letters found.
        </div>
      )}
    </div>
  );
}
