import { Link } from "react-router";
import { Search, ShoppingBag, Menu, X, Globe, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useI18n, LANG_LABELS, type Lang } from "../i18n";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { lang, setLang, t } = useI18n();
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const langs = Object.keys(LANG_LABELS) as Lang[];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16 md:h-20">
        <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/" className="text-xl tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
          Aurelian
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          <Link to="/" className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors">{t("home")}</Link>
          <Link to="/category" className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors">{t("collections")}</Link>
          <Link to="/product/1" className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors">{t("about")}</Link>
        </nav>

        <div className="flex items-center gap-5">
          {/* Language Switcher */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Globe size={16} />
              <span className="text-[10px] tracking-[0.15em] uppercase hidden sm:inline">{LANG_LABELS[lang]}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-3 bg-background border border-border shadow-xl min-w-[120px] py-1 z-50">
                {langs.map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs tracking-[0.15em] transition-colors cursor-pointer ${
                      lang === l
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Search size={18} className="text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
          <div className="relative">
            <ShoppingBag size={18} className="text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] w-4 h-4 flex items-center justify-center rounded-full">2</span>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-background border-t border-border px-4 py-6 space-y-4">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-xs tracking-[0.2em] uppercase text-foreground">{t("home")}</Link>
          <Link to="/category" onClick={() => setMenuOpen(false)} className="block text-xs tracking-[0.2em] uppercase text-foreground">{t("collections")}</Link>
          <div className="flex gap-3 pt-4 border-t border-border mt-2 flex-wrap">
            {langs.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[10px] tracking-[0.15em] px-3 py-1.5 border cursor-pointer transition-colors ${
                  lang === l
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:border-primary"
                }`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
