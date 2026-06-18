import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PULSE — Inclusive Correspondence",
  description: "People-centric Framework for Correspondence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh", margin: 0 }}>
        <header
          role="banner"
          style={{
            background: "#1a2c3d",
            color: "#fff",
            padding: "0 2rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <nav
            aria-label="Main navigation"
            style={{
              display: "flex",
              alignItems: "center",
              maxWidth: 1200,
              margin: "0 auto",
              height: 60,
              gap: "1.5rem",
            }}
          >
            {/* Logo */}
            <a
              href="/"
              aria-label="PULSE Home"
              style={{
                color: "#fff",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 21,
                letterSpacing: "-0.3px",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              <span style={{ color: "#5dade2" }}>P</span>ULSE
            </a>

            {/* Divider */}
            <span
              style={{
                width: 1,
                height: 28,
                background: "rgba(255,255,255,0.2)",
                flexShrink: 0,
              }}
            />

            {/* Nav links */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.15rem",
                flex: 1,
                flexWrap: "wrap",
              }}
            >
              {[
                { href: "/", label: "Home" },
                { href: "/dashboard", label: "Dashboard" },
                { href: "/correspondence", label: "Correspondence" },
                { href: "/chat", label: "Chat" },
                { href: "/proxy", label: "Proxy Access" },
                { href: "/settings", label: "Settings" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  style={{
                    color: "rgba(255,255,255,0.80)",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 500,
                    padding: "6px 11px",
                    borderRadius: 5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>

            {/* CCU Officers CTA */}
            <a
              href="/officer-dashboard"
              style={{
                background: "#2980b9",
                color: "#fff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                padding: "8px 16px",
                borderRadius: 6,
                flexShrink: 0,
                whiteSpace: "nowrap",
                border: "1px solid rgba(255,255,255,0.18)",
                letterSpacing: "0.2px",
              }}
            >
              CCU Officers ›
            </a>
          </nav>
        </header>

        <main
          id="main-content"
          role="main"
          style={{
            flex: 1,
            maxWidth: 1200,
            width: "100%",
            margin: "0 auto",
            padding: "2rem",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>

        <footer
          role="contentinfo"
          style={{
            background: "#f5f7f9",
            borderTop: "1px solid #e0e0e0",
            padding: "1.25rem 2rem",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
            PULSE (People-centric Framework for Correspondence) &mdash; Central Provident Fund
            Board &copy; {new Date().getFullYear()}
          </p>
          <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
            For official CPF enquiries visit{" "}
            <a
              href="https://www.cpf.gov.sg"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2980b9" }}
            >
              cpf.gov.sg
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
