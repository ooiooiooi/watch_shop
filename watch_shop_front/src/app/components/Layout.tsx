import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { I18nProvider, useI18n } from "../i18n";
import { WhatsAppFab } from "./WhatsAppFab";
import { CartProvider } from "../cart";
import { ShoppingCartDrawer } from "./ShoppingCartDrawer";

function LayoutContent() {
  const location = useLocation();
  const { pathname, search } = location;
  const { t } = useI18n();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  useEffect(() => {
    document.title = t("siteTitle");
  }, [t]);

  useEffect(() => {
    // Record each page once per browser session so the admin can inspect visited paths.
    const pageKey = `${pathname}${search}`;
    const storageKey = "visited-pages";
    const visitedPages = new Set<string>(JSON.parse(sessionStorage.getItem(storageKey) ?? "[]"));
    if (visitedPages.has(pageKey)) return;

    const payload = JSON.stringify({
      pagePath: pageKey,
      referrer: document.referrer || null,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/public/visits", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/public/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }

    visitedPages.add(pageKey);
    sessionStorage.setItem(storageKey, JSON.stringify(Array.from(visitedPages)));
  }, [pathname, search]);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
      <ShoppingCartDrawer />
    </div>
  );
}

export function Layout() {
  return (
    <I18nProvider>
      <CartProvider>
        <LayoutContent />
      </CartProvider>
    </I18nProvider>
  );
}
