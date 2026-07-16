import type { Metadata, Viewport } from "next";
import { Fraunces, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// Fraunces stands in for "The Seasons" (a licensed Anthropic typeface, not
// redistributable here) — closest free serif with the same warm, editorial feel.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PULSE — Inclusive Correspondence",
  description: "People-centric Framework for Correspondence",
};

// maximumScale:1 stops iOS Safari's auto-zoom when focusing a chat input (its trigger is
// inputs with font-size < 16px). Since iOS 10, pinch-zoom still works regardless — so this
// doesn't hurt accessibility, it only suppresses the focus zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${bricolage.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
