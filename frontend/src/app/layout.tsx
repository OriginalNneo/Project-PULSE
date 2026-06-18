import type { Metadata } from "next";
import "./globals.css";
import { AppHeader, AppFooter } from "./AppChrome";

export const metadata: Metadata = {
  title: "PULSE — Inclusive Correspondence",
  description: "People-centric Framework for Correspondence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AppHeader />
        <main id="main-content" role="main">
          {children}
        </main>
        <AppFooter />
      </body>
    </html>
  );
}
