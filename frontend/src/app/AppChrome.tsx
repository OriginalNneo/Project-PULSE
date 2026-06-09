"use client";

import { usePathname } from "next/navigation";

/**
 * Global PULSE chrome (top nav + footer). Hidden on full-screen standalone
 * consoles like the CCU dashboard, which provide their own header/layout.
 */
const FULLSCREEN_ROUTES = ["/officer"];

export function AppHeader() {
  const pathname = usePathname();
  if (FULLSCREEN_ROUTES.some((r) => pathname?.startsWith(r))) return null;

  return (
    <header role="banner">
      <nav aria-label="Main navigation">
        <a href="/" aria-label="PULSE Home">PULSE</a>
        <ul>
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/correspondence">Correspondence</a></li>
          <li><a href="/chat">Ask PULSE</a></li>
          <li><a href="/console">Data &amp; AI</a></li>
          <li><a href="/officer">CCU Dashboard</a></li>
          <li><a href="/proxy">Proxy Access</a></li>
          <li><a href="/settings">Settings</a></li>
        </ul>
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
