import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { I18nProvider } from "../i18n";

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <I18nProvider>
      <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
        <Header />
        <main>
          <Outlet />
        </main>
        <Footer />
      </div>
    </I18nProvider>
  );
}