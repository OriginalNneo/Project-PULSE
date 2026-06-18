export default function HomePage() {
  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: "24px",
    flex: "1 1 260px",
    minWidth: 220,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

  const statBoxStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 10,
    padding: "20px 28px",
    textAlign: "center",
    flex: "1 1 160px",
    minWidth: 140,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(135deg, #1a2c3d 0%, #1a5276 100%)",
          borderRadius: 12,
          padding: "2.5rem 2.5rem",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Central Provident Fund Board
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#fff",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          PULSE &mdash; CPF Multilingual Assistant
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.82)",
            margin: 0,
            maxWidth: 620,
            lineHeight: 1.6,
          }}
        >
          People-centric Framework for Correspondence. PULSE helps Singapore residents navigate CPF
          matters in their preferred language or dialect &mdash; through Telegram, web chat, or the
          officer dashboard.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <a
            href="/chat"
            style={{
              background: "#2980b9",
              color: "#fff",
              textDecoration: "none",
              padding: "10px 22px",
              borderRadius: 6,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Start Chatting
          </a>
          <a
            href="/correspondence"
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              textDecoration: "none",
              padding: "10px 22px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            My Correspondence
          </a>
        </div>
      </section>

      {/* Quick stats */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { value: "7", label: "Languages Supported" },
          { value: "4", label: "CPF Account Types" },
          { value: "24/7", label: "Available" },
          { value: "3", label: "Interaction Channels" },
        ].map(({ value, label }) => (
          <div key={label} style={statBoxStyle}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#1a5276",
                lineHeight: 1.1,
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <section>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#1a2c3d",
            marginBottom: 16,
          }}
        >
          What PULSE does
        </h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {/* Correspondence */}
          <div style={cardStyle}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "#eaf4fb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              📄
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#1a2c3d",
                margin: 0,
              }}
            >
              Correspondence
            </h3>
            <p style={{ fontSize: 14, color: "#444", margin: 0, lineHeight: 1.6 }}>
              View and manage CPF letters and notices sent to you. Filter by category — tax,
              housing, healthcare, employment. Complex government language is simplified so it&apos;s
              easy to understand.
            </p>
            <a
              href="/correspondence"
              style={{
                fontSize: 13,
                color: "#2980b9",
                textDecoration: "none",
                fontWeight: 600,
                marginTop: "auto",
              }}
            >
              View Correspondence &rarr;
            </a>
          </div>

          {/* Chat */}
          <div style={cardStyle}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "#eafaf1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              💬
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#1a2c3d",
                margin: 0,
              }}
            >
              PULSE Chat
            </h3>
            <p style={{ fontSize: 14, color: "#444", margin: 0, lineHeight: 1.6 }}>
              Ask any CPF question in your preferred language — English, Mandarin, Malay, Tamil,
              Hindi, Malayalam, Punjabi, or several Chinese dialects. The assistant handles it via
              Telegram or this web interface.
            </p>
            <a
              href="/chat"
              style={{
                fontSize: 13,
                color: "#2980b9",
                textDecoration: "none",
                fontWeight: 600,
                marginTop: "auto",
              }}
            >
              Open Chat &rarr;
            </a>
          </div>

          {/* Proxy */}
          <div style={cardStyle}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "#fef9e7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              👥
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#1a2c3d",
                margin: 0,
              }}
            >
              Proxy Access
            </h3>
            <p style={{ fontSize: 14, color: "#444", margin: 0, lineHeight: 1.6 }}>
              Allow a family member or caregiver to manage your correspondence on your behalf.
              Useful for elderly residents or those with accessibility needs. Set specific
              permissions and expiry dates.
            </p>
            <a
              href="/proxy"
              style={{
                fontSize: 13,
                color: "#2980b9",
                textDecoration: "none",
                fontWeight: 600,
                marginTop: "auto",
              }}
            >
              Manage Proxy Access &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* CCU Officer link */}
      <div
        style={{
          background: "#f0f4f8",
          border: "1px solid #d0dce8",
          borderRadius: 10,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{ fontSize: 15, fontWeight: 700, color: "#1a2c3d", marginBottom: 4 }}
          >
            CCU Officer Dashboard
          </div>
          <p style={{ fontSize: 14, color: "#555", margin: 0 }}>
            For Customer Care Unit officers handling escalated cases, live emotion monitoring,
            and queue management.
          </p>
        </div>
        <a
          href="/officer-dashboard"
          style={{
            background: "#1a2c3d",
            color: "#fff",
            textDecoration: "none",
            padding: "10px 20px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          Open Officer Dashboard &rarr;
        </a>
      </div>
    </div>
  );
}
