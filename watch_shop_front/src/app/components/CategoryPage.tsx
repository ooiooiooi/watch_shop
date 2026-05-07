import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { useI18n } from "../i18n";
import { usePublicTaxonomy } from "../hooks/usePublicTaxonomy";
import { getPublicProductsPage } from "../catalogApi";
import type { Product } from "../data";
import { MobileTaxonomyDrawer } from "./MobileTaxonomyDrawer";

export function CategoryPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [brandId, setBrandId] = useState(() => searchParams.get("brand") || "all");
  const [modelId, setModelId] = useState(() => searchParams.get("model") || "all");

  const searchQuery = searchParams.get("q") || "";

  const { brands, models } = usePublicTaxonomy();

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(() => searchParams.get("brand") || null);
  const [mobileDrawerBrandId, setMobileDrawerBrandId] = useState<string | null>(null);

  const selectedBrandId = brandId === "all" ? null : brandId;
  const selectedModelId = modelId === "all" ? null : modelId;

  useEffect(() => {
    const nextBrand = searchParams.get("brand") || "all";
    const nextModel = searchParams.get("model") || "all";

    if (nextBrand !== brandId) setBrandId(nextBrand);
    if (nextModel !== modelId) setModelId(nextModel);
    if (nextBrand === "all") {
      setExpandedBrandId((prev) => prev);
    } else {
      setExpandedBrandId(nextBrand);
    }
    setMobileDrawerBrandId(nextBrand === "all" ? null : nextBrand);
    setMobileCollectionsOpen(false);
  }, [searchParams]);

  useEffect(() => {
    function handleToggleDrawer() {
      if (window.innerWidth >= 1024) return;
      setMobileCollectionsOpen((prev) => !prev);
    }

    window.addEventListener("toggle-category-drawer", handleToggleDrawer);
    return () => window.removeEventListener("toggle-category-drawer", handleToggleDrawer);
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileCollectionsOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("category-drawer-state", { detail: { open: mobileCollectionsOpen } }));
  }, [mobileCollectionsOpen]);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        brandId: selectedBrandId,
        modelId: selectedModelId,
        q: searchQuery,
      }),
    [selectedBrandId, selectedModelId, searchQuery]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getPublicProductsPage({
          status: "on",
          brandId: selectedBrandId ?? undefined,
          modelId: selectedModelId ?? undefined,
          sort: "featured",
          q: searchQuery || undefined,
          page: 0,
          size: 24,
        });
        if (!alive) return;
        setProducts(res.items);
        setTotal(res.total);
        setPage(0);
      } catch {
        if (!alive) return;
        setProducts([]);
        setTotal(0);
        setPage(0);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [queryKey]);

  const canLoadMore = products.length < total;

  async function loadMore() {
    if (loading || !canLoadMore) return;
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = await getPublicProductsPage({
        status: "on",
        brandId: selectedBrandId ?? undefined,
        modelId: selectedModelId ?? undefined,
        sort: "featured",
        q: searchQuery || undefined,
        page: nextPage,
        size: 24,
      });
      setProducts((prev) => [...prev, ...res.items]);
      setTotal(res.total);
      setPage(nextPage);
    } catch {
      // Error loading more products - silently fail, user can retry
    } finally {
      setLoading(false);
    }
  }

  function updateUrl(next: { brand?: string; model?: string; q?: string }) {
    const sp = new URLSearchParams(searchParams);
    sp.delete("cat");
    sp.delete("sort");

    if (next.brand !== undefined) {
      if (!next.brand || next.brand === "all") sp.delete("brand");
      else sp.set("brand", next.brand);
    }

    if (next.model !== undefined) {
      if (!next.model || next.model === "all") sp.delete("model");
      else sp.set("model", next.model);
    }

    if (next.q !== undefined) {
      if (!next.q) sp.delete("q");
      else sp.set("q", next.q);
    }

    setSearchParams(sp);
  }

  function resetBrowsePosition() {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  const sortedBrands = useMemo(() => [...brands].sort((a, b) => a.name.localeCompare(b.name)), [brands]);

  const activeBrandName = useMemo(() => {
    if (brandId === "all") return t("allBrands");
    return brands.find((b) => b.id === brandId)?.name ?? brandId;
  }, [brands, brandId, t]);

  const activeModelName = useMemo(() => {
    if (modelId === "all") return null;
    return models.find((m) => m.id === modelId)?.name ?? modelId;
  }, [models, modelId]);

  function closeMobileDrawer() {
    setMobileCollectionsOpen(false);
    setMobileDrawerBrandId(brandId === "all" ? null : brandId);
  }

  function handleMobileDrawerNavigate(path: string) {
    closeMobileDrawer();
    navigate(path);
  }

  const renderSidebarContent = (isMobile?: boolean) => (
    <>
      <div className={`flex items-end justify-between gap-3 border-b border-black/10 px-5 py-4 md:px-6 ${isMobile ? "items-center" : ""}`}>
        {isMobile && (
          <button
            onClick={() => setMobileCollectionsOpen(false)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-zinc-900"
          >
            <X size={18} />
          </button>
        )}
        <div className={isMobile ? "text-center flex-1" : ""}>
          <div className="text-[10px] tracking-[0.24em] uppercase text-zinc-500">{t("shopByBrand")}</div>
          <div className={`mt-1 leading-none text-zinc-950 ${isMobile ? "text-2xl" : "text-[32px]"}`} style={{ fontFamily: "'Playfair Display', serif" }}>
            {t("filterBrand")}
          </div>
        </div>
        <div className={`shrink-0 rounded-full bg-zinc-950 px-3 py-1 text-[10px] tracking-[0.18em] uppercase text-white ${isMobile ? "" : ""}`}>
          {total.toLocaleString()} {isMobile ? "" : t("results")}
        </div>
      </div>
      <div className="divide-y divide-black/8">
        <button
          onClick={() => {
            setBrandId("all");
            setModelId("all");
            setExpandedBrandId(null);
            resetBrowsePosition();
            updateUrl({ brand: "all", model: "all" });
            if (isMobile) setMobileCollectionsOpen(false);
          }}
          className={[
            "group flex w-full items-center justify-between px-5 py-4 text-left transition-colors md:px-6",
            brandId === "all" ? "bg-black text-white" : "bg-transparent text-zinc-900 hover:bg-black/[0.04]",
          ].join(" ")}
        >
          <span className={`text-[15px] ${brandId === "all" ? "font-medium" : ""}`}>{t("allBrands")}</span>
          <ArrowRight size={16} className={brandId === "all" ? "opacity-100" : "opacity-35"} />
        </button>
        {sortedBrands.map((brand) => {
          const active = brandId === brand.id;
          const expanded = expandedBrandId === brand.id;
          const brandModels = models.filter((m) => m.brandId === brand.id).sort((a, b) => a.name.localeCompare(b.name));
          return (
            <div key={brand.id} className="flex flex-col border-b border-black/8 last:border-b-0">
              <div
                className={[
                  "group flex items-center gap-2 px-3 py-2 md:px-4",
                  active ? "bg-black text-white" : "bg-transparent text-zinc-900 hover:bg-black/[0.04]",
                ].join(" ")}
              >
                <button
                  onClick={() => {
                    setBrandId(brand.id);
                    setModelId("all");
                    setExpandedBrandId(brand.id);
                    resetBrowsePosition();
                    updateUrl({ brand: brand.id, model: "all" });
                    if (isMobile) setMobileCollectionsOpen(false);
                  }}
                  className="min-w-0 flex-1 px-2 py-2 text-left"
                >
                  <span className={`block truncate pr-3 text-[15px] ${active ? "font-medium" : ""}`}>{brand.name}</span>
                </button>
                {brandModels.length > 0 ? (
                  <button
                    type="button"
                    aria-label={expanded ? `collapse ${brand.name} models` : `expand ${brand.name} models`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedBrandId((prev) => (prev === brand.id ? null : brand.id));
                    }}
                    className={[
                      "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors",
                      active
                        ? "border-white/18 bg-white/10 text-white hover:bg-white/16"
                        : "border-black/10 bg-black/[0.04] text-zinc-900 hover:bg-black/[0.08]",
                    ].join(" ")}
                  >
                    {expanded ? <Minus size={18} /> : <Plus size={18} />}
                  </button>
                ) : (
                  <span className="inline-flex h-11 w-11 shrink-0" />
                )}
              </div>
              {expanded && brandModels.length > 0 && (
                <div className="bg-black/5 divide-y divide-black/5">
                  <button
                    onClick={() => {
                      setBrandId(brand.id);
                      setModelId("all");
                      resetBrowsePosition();
                      updateUrl({ brand: brand.id, model: "all" });
                      if (isMobile) setMobileCollectionsOpen(false);
                    }}
                    className={`w-full px-8 py-3.5 text-left text-[14px] ${modelId === "all" ? "text-zinc-950 font-medium" : "text-zinc-600 hover:text-black hover:bg-black/[0.02]"}`}
                  >
                    {t("allModels")}
                  </button>
                  {brandModels.map((m) => {
                    const mActive = modelId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setBrandId(brand.id);
                          setModelId(m.id);
                          resetBrowsePosition();
                          updateUrl({ brand: brand.id, model: m.id });
                          if (isMobile) setMobileCollectionsOpen(false);
                        }}
                        className={`w-full px-8 py-3.5 text-left text-[14px] ${mActive ? "text-zinc-950 font-medium" : "text-zinc-600 hover:text-black hover:bg-black/[0.02]"}`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-black/10 px-5 py-5 md:px-6 mt-auto">
        <div className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">{t("refineSelection")}</div>
        <div className="mt-3 text-sm leading-relaxed text-zinc-700">
          {searchQuery ? `"${searchQuery}"` : t("selectBrandHint")}
        </div>
      </div>
    </>
  );

  return (
    <div className="pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="hidden overflow-y-auto max-h-[calc(100vh-120px)] sticky top-28 rounded-[30px] border border-border/60 bg-[#f6f1e8] text-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.18)] lg:flex lg:flex-col">
            {renderSidebarContent()}
          </aside>

          <div className="flex flex-col min-w-0">
            <div className="mb-6 md:mb-8">
              <div className="min-w-0">
                <div className="text-[10px] tracking-[0.22em] uppercase text-primary">{t("curatedSelection")}</div>
                <h2 className="mt-2 text-3xl md:text-4xl text-foreground leading-none truncate" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {activeModelName || activeBrandName}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground truncate">
                  {activeModelName
                    ? `${activeBrandName ?? ""} · ${activeModelName} · ${products.length.toLocaleString()} / ${total.toLocaleString()} ${t("results")}`
                    : `${activeBrandName} · ${products.length.toLocaleString()} / ${total.toLocaleString()} ${t("results")}`}
                </p>
              </div>
            </div>

            <div id="category-products" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 scroll-mt-28">
              {loading && products.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} className="min-w-0" />
                ))
              ) : (
                products.map((p) => (
                  <ProductCard key={p.id} product={p} className="min-w-0" />
                ))
              )}
            </div>

            {canLoadMore && (
              <div className="mt-8 md:mt-10 text-center">
                <button
                  onClick={loadMore}
                  className="h-10 md:h-11 rounded-full border border-border text-muted-foreground text-[10px] md:text-[11px] tracking-[0.15em] md:tracking-[0.18em] uppercase px-6 md:px-8 cursor-pointer hover:border-primary/60 hover:text-primary transition-colors whitespace-nowrap shrink-0"
                  disabled={loading}
                >
                  {loading ? t("loading") : t("loadMore")}
                </button>
              </div>
            )}

            {products.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                <p>{loading ? t("loading") : t("noProducts")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileTaxonomyDrawer
        open={mobileCollectionsOpen}
        onClose={closeMobileDrawer}
        onNavigateHome={() => handleMobileDrawerNavigate("/")}
        onNavigateAbout={() => handleMobileDrawerNavigate("/about")}
        brands={brands}
        models={models}
        viewBrandId={mobileDrawerBrandId}
        onViewBrandChange={setMobileDrawerBrandId}
        selectedBrandId={selectedBrandId}
        selectedModelId={selectedModelId}
        onSelectModel={(nextBrandId, nextModelId) => {
          setBrandId(nextBrandId);
          setModelId(nextModelId ?? "all");
          setExpandedBrandId(nextBrandId);
          resetBrowsePosition();
          updateUrl({ brand: nextBrandId, model: nextModelId ?? "all" });
          closeMobileDrawer();
        }}
        allBrandsLabel={t("allBrands")}
        allModelsLabel={t("allModels")}
        homeLabel={t("home")}
        aboutLabel={t("about")}
        shopByBrandLabel={t("shopByBrand")}
        brandLabel={t("filterBrand")}
      />
    </div>
  );
}
