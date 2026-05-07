import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Shield, Droplets, Award, Clock, ChevronRight, ArrowRight } from "lucide-react";
import { IMAGES } from "../data";
import { ProductCard } from "./ProductCard";
import { GoldButton } from "./GoldButton";
import { useI18n } from "../i18n";
import { usePublicCatalog } from "../hooks/usePublicCatalog";
import { usePublicTaxonomy } from "../hooks/usePublicTaxonomy";
import { getPublicHotProductsConfig, type HotProductsConfig } from "../catalogApi";
import { resolveMediaUrl } from "../media";
import { MobileTaxonomyDrawer } from "./MobileTaxonomyDrawer";

function Countdown() {
  const { t } = useI18n();
  const [time, setTime] = useState({ h: 5, m: 32, s: 48 });
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex gap-2 md:gap-4">
      {[
        { label: t("hours"), value: pad(time.h) },
        { label: t("minutes"), value: pad(time.m) },
        { label: t("seconds"), value: pad(time.s) },
      ].map((item) => (
        <div key={item.label} className="text-center">
          <div className="text-2xl md:text-5xl text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>{item.value}</div>
          <div className="text-[9px] md:text-[10px] tracking-[0.15em] md:tracking-[0.2em] uppercase text-muted-foreground mt-0.5 md:mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { categories } = usePublicCatalog({ status: "on" });
  const { brands, models } = usePublicTaxonomy();
  const [hotConfig, setHotConfig] = useState<HotProductsConfig>({ brands: [] });
  const [hotLoading, setHotLoading] = useState(true);
  const [activeHotBrandId, setActiveHotBrandId] = useState("");
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);
  const [mobileDrawerBrandId, setMobileDrawerBrandId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setHotLoading(true);
    getPublicHotProductsConfig()
      .then((config) => {
        if (!alive) return;
        setHotConfig({ brands: config.brands ?? [] });
        setActiveHotBrandId((current) => current || "");
      })
      .catch(() => {
        if (!alive) return;
        setHotConfig({ brands: [] });
      })
      .finally(() => {
        if (!alive) return;
        setHotLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (hotConfig.brands.length === 0) return;
    if (activeHotBrandId === "") return;
    if (hotConfig.brands.some((item) => item.brandId === activeHotBrandId)) return;
    setActiveHotBrandId("");
  }, [activeHotBrandId, hotConfig.brands]);

  useEffect(() => {
    const selectedBrand = searchParams.get("brand");
    setMobileDrawerBrandId(selectedBrand || null);
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

  const activeHotGroup = hotConfig.brands.find((item) => item.brandId === activeHotBrandId) ?? null;
  const allHotProducts = hotConfig.brands.flatMap((group) => group.products ?? []).filter((product, index, list) => list.findIndex((item) => item.id === product.id) === index);
  const bestSellerProducts = activeHotBrandId ? activeHotGroup?.products ?? [] : allHotProducts;
  const bestSellerHref = activeHotGroup?.brandId ? `/category?brand=${encodeURIComponent(activeHotGroup.brandId)}` : "/category";
  const brandStoryTitle =
    lang === "zh"
      ? "VS Factory 是您购买奢华腕表的理想之选"
      : "VS Factory Is Your Ideal Destination For Luxury Watches";
  const brandStoryBody =
    lang === "zh"
      ? "VS Factory 是一家专营奢华腕表的公司，在纽约、迈阿密和阿斯彭均设有精品店。我们专注于瑞士腕表品牌，包括爱彼(Audemars Piguet)、百达翡丽(Patek Philippe)、理查德·米勒(Richard Mille)和劳力士(Rolex)。我们成功的关键在于拥有丰富的理查德·米勒、爱彼和百达翡丽腕表库存，以及忠实的客户群体。VS Factory 在谷歌上拥有超过 500 条五星好评，这充分证明了客户的信任和忠诚。"
      : "VS Factory is a luxury watch company with boutiques in New York, Miami, and Aspen. We specialize in Swiss watch brands including Audemars Piguet, Patek Philippe, Richard Mille, and Rolex. Our success is driven by a strong inventory of Richard Mille, Audemars Piguet, and Patek Philippe watches, along with a loyal client base backed by more than 500 five-star Google reviews.";

  function closeMobileDrawer() {
    setMobileCollectionsOpen(false);
    const selectedBrand = searchParams.get("brand");
    setMobileDrawerBrandId(selectedBrand || null);
  }

  function navigateWithDrawer(path: string) {
    closeMobileDrawer();
    navigate(path);
  }

  function navigateToCategory(brand: string | null, model: string | null) {
    const params = new URLSearchParams(location.search);
    params.delete("cat");
    params.delete("sort");
    if (!brand || brand === "all") params.delete("brand");
    else params.set("brand", brand);
    if (!model || model === "all") params.delete("model");
    else params.set("model", model);
    closeMobileDrawer();
    navigate(`/category${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative flex h-[70svh] min-h-[560px] items-center md:h-screen md:min-h-screen">
        <div className="absolute inset-0">
          <img src={IMAGES.banner} alt="Luxury Watch" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent md:from-black/80 md:via-black/50" />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-20 pb-12 md:px-8 md:pt-0 md:pb-0">
          <p className="text-primary text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase mb-3 md:mb-4">{t("swissCraftsmanship")}</p>
          <h1 className="text-3xl md:text-7xl text-white max-w-xl leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t("timePerfected")}
          </h1>
          <p className="text-white/60 mt-4 md:mt-6 max-w-md text-xs md:text-sm md:text-base">
            {t("heroDesc")}
          </p>
          <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-3 md:gap-4">
            <Link to="/category">
              <GoldButton fullWidth className="md:w-auto">{t("exploreCollection")}</GoldButton>
            </Link>
            <Link to="/product/1">
              <GoldButton variant="outline" fullWidth className="md:w-auto">{t("viewFlagship")}</GoldButton>
            </Link>
          </div>
        </div>
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight size={18} className="text-primary rotate-90" />
        </div>
      </section>

      {/* Best Sellers */}
      {!hotLoading && hotConfig.brands.length > 0 ? (
      <section className="py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-12">
            <div>
              <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">{t("curatedSelection")}</p>
              <h2 className="text-2xl md:text-4xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("bestSellers")}</h2>
            </div>
            <Link to={bestSellerHref} className="text-primary text-xs tracking-[0.2em] uppercase flex items-center gap-2 hover:gap-3 transition-all self-start sm:self-auto">
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
          </div>

          {hotConfig.brands.length > 0 ? (
            <div className="-mx-4 mb-6 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setActiveHotBrandId("")}
                className={[
                  "shrink-0 rounded-full border px-5 py-2.5 text-sm transition-all",
                  activeHotBrandId === ""
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(212,179,106,0.22)]"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/60 hover:text-primary",
                ].join(" ")}
              >
                {t("all")}
              </button>
              {hotConfig.brands.map((group) => (
                <button
                  key={group.brandId}
                  onClick={() => setActiveHotBrandId(group.brandId)}
                  className={[
                    "shrink-0 rounded-full border px-5 py-2.5 text-sm transition-all",
                    activeHotBrandId === group.brandId
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(212,179,106,0.22)]"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/60 hover:text-primary",
                  ].join(" ")}
                >
                  {group.brandName}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6 xl:grid-cols-5">
            {bestSellerProducts.map((p) => (
              <div key={p.id}>
                  <ProductCard product={p} enableAddToCart />
              </div>
            ))}
          </div>

          {!hotLoading && bestSellerProducts.length === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-secondary/40 px-4 py-10 text-center text-sm text-muted-foreground">
              {t("noRecommended")}
            </div>
          ) : null}
        </div>
      </section>
      ) : null}

      {/* Categories */}
      <section className="py-16 md:py-28 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-8 md:mb-14">
            <div className="rounded-[28px] border border-primary/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-5 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.16)] md:px-10 md:py-9">
              <p className="text-primary text-[10px] tracking-[0.3em] uppercase mb-3">{t("browse")}</p>
              <h2
                className="max-w-4xl text-2xl leading-tight text-foreground md:text-[42px]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {brandStoryTitle}
              </h2>
              <p className="mt-4 max-w-5xl text-sm leading-7 text-muted-foreground md:text-base">
                {brandStoryBody}
              </p>
              <Link
                to="/about"
                className="mt-5 inline-flex items-center gap-2 text-primary text-xs tracking-[0.2em] uppercase transition-all hover:gap-3"
              >
                了解更多 <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 md:hidden snap-x snap-mandatory">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category?cat=${cat.id}`}
                className="group relative min-w-[168px] snap-start overflow-hidden rounded-2xl border border-border/60 bg-background/10"
              >
                <img
                  src={resolveMediaUrl(cat.image)}
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[1.05/1] w-full object-cover transition-transform duration-700 group-active:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-base text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {cat.name}
                  </div>
                  <div className="mt-1 text-[10px] tracking-[0.18em] uppercase text-white/70">
                    {t("explore")}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex md:hidden">
            <Link
              to="/category"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
            >
              {t("viewAll")} <ArrowRight size={13} />
            </Link>
          </div>

          <div className="hidden md:grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {categories.map((cat) => (
              <Link key={cat.id} to={`/category?cat=${cat.id}`} className="group relative overflow-hidden rounded-xl md:rounded-2xl border border-border/60 bg-background/10 aspect-[3/4]">
                <img src={resolveMediaUrl(cat.image)} alt={cat.name} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-[10px] md:text-sm tracking-[0.25em] md:tracking-[0.3em] uppercase">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* USPs */}
      <section className="py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-12">
            {[
              { icon: Droplets, title: t("waterResistant"), desc: t("waterResistantDesc") },
              { icon: Shield, title: t("yearWarranty"), desc: t("fullCoverage") },
              { icon: Award, title: t("certified"), desc: t("swissChronometer") },
              { icon: Clock, title: t("precision"), desc: t("precisionDesc") },
            ].map((usp) => (
              <div key={usp.title} className="text-center">
                <usp.icon size={24} className="text-primary mx-auto mb-3 md:mb-4" strokeWidth={1} />
                <h4 className="text-foreground text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase mb-1">{usp.title}</h4>
                <p className="text-muted-foreground text-xs md:text-sm">{usp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-16 md:py-28 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-8 md:gap-20 items-center">
          <div>
            <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-border/60 bg-background/10">
              <img src={IMAGES.mechanism} alt="Watch mechanism" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <p className="text-primary text-xs tracking-[0.3em] uppercase mb-4">{t("ourHeritage")}</p>
            <h2 className="text-2xl md:text-4xl text-foreground mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>{t("brandStoryTitle")}</h2>
            <p className="text-muted-foreground mb-4">{t("brandStoryP1")}</p>
            <p className="text-muted-foreground mb-6 md:mb-8">{t("brandStoryP2")}</p>
            <GoldButton variant="outline" fullWidth className="md:w-auto">{t("discoverOurStory")}</GoldButton>
          </div>
        </div>
      </section>

      {/* Flash Sale */}
      <section className="py-16 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMAGES.store} alt="Store" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 text-center">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-4">{t("limitedTimeOffer")}</p>
          <h2 className="text-2xl md:text-5xl text-white mb-6 md:mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>{t("flashSaleEndsIn")}</h2>
          <div className="flex justify-center mb-8">
            <Countdown />
          </div>
          <p className="text-white/60 mb-8 max-w-md mx-auto">{t("flashSaleDesc")}</p>
          <Link to="/category">
            <GoldButton>{t("shopTheSale")}</GoldButton>
          </Link>
        </div>
      </section>

      <MobileTaxonomyDrawer
        open={mobileCollectionsOpen}
        onClose={closeMobileDrawer}
        onNavigateHome={() => navigateWithDrawer("/")}
        onNavigateAbout={() => navigateWithDrawer("/about")}
        brands={brands}
        models={models}
        viewBrandId={mobileDrawerBrandId}
        onViewBrandChange={setMobileDrawerBrandId}
        selectedBrandId={searchParams.get("brand")}
        selectedModelId={searchParams.get("model")}
        onSelectModel={(brandId, modelId) => navigateToCategory(brandId, modelId)}
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
