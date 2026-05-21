import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PULSE — Inclusive Correspondence",
  description: "People-centric Framework for Correspondence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <header role="banner">
          <nav aria-label="Main navigation">
            <a href="/" aria-label="PULSE Home">PULSE</a>
            <ul>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/correspondence">Correspondence</a></li>
              <li><a href="/chat">Ask PULSE</a></li>
              <li><a href="/proxy">Proxy Access</a></li>
              <li><a href="/settings">Settings</a></li>
            </ul>
          </nav>
        </header>
        <main id="main-content" role="main">
          {children}
        </main>
        <footer role="contentinfo">
          <p>PULSE Framework &copy; {new Date().getFullYear()}</p>
        </footer>
      </body>
    </html>
  );
}
