import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Search, Menu, X, Globe, ChevronDown, MessageCircle, ShoppingBag, Watch } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n, LANG_LABELS, type Lang } from "../i18n";
import { useCustomerService } from "../hooks/useCustomerService";
import { buildWhatsAppHref } from "../utils/whatsapp";
import { usePublicTaxonomy } from "../hooks/usePublicTaxonomy";
import { useCart } from "../cart";
import { recordInquiry } from "../engagement";

export function Header() {
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { lang, setLang, t } = useI18n();
  const { config } = useCustomerService();
  const { brands } = usePublicTaxonomy();
  const { totalItems, openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const langRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  // Sync search query with URL when on search page
  useEffect(() => {
    const q = searchParams.get("q");
    const nextQuery = q ?? "";
    if (searchQuery !== nextQuery) {
      setSearchQuery(nextQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        if (!searchQuery.trim()) {
          setSearchOpen(false);
        }
      }
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setBrandOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchQuery]);

  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/category?q=${encodeURIComponent(trimmed)}`);
      setSearchOpen(false);
    }
  }, [searchQuery, navigate]);

  const handleSearchClick = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => {
      const input = document.getElementById("header-search-input");
      if (input) input.focus();
    }, 50);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchOpen(false);
    // Go to category page
    navigate("/category");
  }, [navigate]);

  const langs = Object.keys(LANG_LABELS) as Lang[];
  const contactHref = config.whatsapp ? buildWhatsAppHref(config.whatsapp, config.defaultMessage ?? t("csDefaultMessage")) : null;
  const usesTaxonomyDrawer =
    location.pathname === "/" || location.pathname.startsWith("/category") || location.pathname.startsWith("/product/");

  useEffect(() => {
    function handleCategoryDrawerState(event: Event) {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setCategoryDrawerOpen(Boolean(detail?.open));
    }

    window.addEventListener("category-drawer-state", handleCategoryDrawerState);
    return () => window.removeEventListener("category-drawer-state", handleCategoryDrawerState);
  }, []);

  useEffect(() => {
    if (!usesTaxonomyDrawer) {
      setCategoryDrawerOpen(false);
    }
  }, [usesTaxonomyDrawer]);

  const handleMobileMenuClick = useCallback(() => {
    if (!usesTaxonomyDrawer) return;
    window.dispatchEvent(new Event("toggle-category-drawer"));
  }, [usesTaxonomyDrawer]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16 md:h-20">
        <button className="md:hidden text-foreground" onClick={handleMobileMenuClick}>
          {categoryDrawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/" className="text-xl tracking-[0.3em] uppercase text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
          VS Factory
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-10">
          <Link to="/" className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors">{t("home")}</Link>
          <Link to="/category" className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors">{t("collections")}</Link>
          <Link to="/about" className="text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors">{t("about")}</Link>
        </nav>

        {/* Desktop Search Bar - Centered, Prominent */}
        <div ref={searchRef} className="hidden md:flex flex-1 max-w-xl mx-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full">
            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search watches, brands, models..."
                className="w-full h-11 rounded-full bg-secondary/70 border-2 border-border/50 pl-12 pr-12 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all hover:border-primary/70"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear search and go back"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-md"
              >
                <Search size={16} />
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-3 md:gap-4">

          {/* Mobile Search Button */}
          <button
            onClick={handleSearchClick}
            className="md:hidden text-muted-foreground hover:text-primary transition-colors"
          >
            <Search size={20} />
          </button>

          {/* Brand Selector - More Prominent */}
          <div ref={brandRef} className="hidden lg:block relative">
            <button
              onClick={() => setBrandOpen(!brandOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-full border-2 border-border/50 bg-secondary/50 hover:border-primary/70 hover:text-primary transition-all cursor-pointer"
            >
              <Watch size={18} className="text-primary" />
              <span className="text-xs tracking-[0.18em] uppercase font-medium">Brands</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${brandOpen ? "rotate-180" : ""}`} />
            </button>
            {brandOpen && (
              <div className="absolute right-0 top-full mt-3 bg-background border-2 border-border shadow-2xl min-w-[200px] max-h-96 overflow-y-auto py-2 z-50 rounded-xl">
                <Link
                  to="/category?brand=all"
                  onClick={() => setBrandOpen(false)}
                  className="block px-5 py-3 text-xs tracking-[0.15em] text-primary font-medium hover:bg-primary/10 cursor-pointer border-b border-border/50"
                >
                  All Brands
                </Link>
                {brands.map((b) => (
                  <Link
                    key={b.id}
                    to={`/category?brand=${encodeURIComponent(b.id)}`}
                    onClick={() => setBrandOpen(false)}
                    className="block px-5 py-2.5 text-xs tracking-[0.15em] text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Mobile Search Overlay */}
          {searchOpen && (
            <div className="md:hidden fixed inset-x-0 top-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border p-4">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder") || "Search..."}
                  className="flex-1 h-10 rounded-full bg-secondary/50 border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-muted-foreground hover:text-foreground"
                  title="Clear search and go back"
                >
                  <X size={20} />
                </button>
                <button
                  type="submit"
                  className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Search size={18} />
                </button>
              </form>
            </div>
          )}

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

          <button
            onClick={openCart}
            className="relative text-muted-foreground hover:text-primary transition-colors"
            aria-label="open-cart"
            title={t("cart")}
          >
            <ShoppingBag size={18} />
            {totalItems > 0 ? (
              <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            ) : null}
          </button>

          {contactHref ? (
            <a
              href={contactHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => recordInquiry("header")}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="contact-whatsapp-header"
              title={t("contactWhatsapp")}
            >
              <MessageCircle size={18} />
            </a>
          ) : null}
        </div>
      </div>

    </header>
  );
}
