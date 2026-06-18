"use client";

import { usePathname } from "next/navigation";

const FULLSCREEN_ROUTES = ["/officer"];

export function AppHeader() {
  const pathname = usePathname();
  if (FULLSCREEN_ROUTES.some((r) => pathname?.startsWith(r))) return null;

  return (
    <header role="banner">
      <nav aria-label="Main navigation">
        <a href="/officer" aria-label="CCU Dashboard">PULSE</a>
      </nav>
    </header>
  );
}

export function AppFooter() {
  const pathname = usePathname();
  if (FULLSCREEN_ROUTES.some((r) => pathname?.startsWith(r))) return null;

  return (
    <footer role="contentinfo">
      <p>PULSE Framework &copy; {new Date().getFullYear()}</p>
    </footer>
  );
}
