import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { Shield, Droplets, Award, Clock, ChevronRight, ArrowRight } from "lucide-react";
import { IMAGES } from "../data";
import { ProductCard } from "./ProductCard";
import { GoldButton } from "./GoldButton";
import { useI18n } from "../i18n";
import { usePublicCatalog } from "../hooks/usePublicCatalog";
import { resolveMediaUrl } from "../media";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const { products, categories } = usePublicCatalog({ status: "on" });

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative h-screen flex items-center">
        <div className="absolute inset-0">
          <img src={IMAGES.banner} alt="Luxury Watch" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent md:from-black/80 md:via-black/50" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 w-full">
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
      <section className="py-16 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-12">
            <div>
              <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">{t("curatedSelection")}</p>
              <h2 className="text-2xl md:text-4xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("bestSellers")}</h2>
            </div>
            <Link to="/category" className="text-primary text-xs tracking-[0.2em] uppercase flex items-center gap-2 hover:gap-3 transition-all self-start sm:self-auto">
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-4 md:gap-6 overflow-x-auto px-4 md:px-8 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
          {products.filter((p) => p.status === "on").map((p) => (
            <div key={p.id} className="snap-start shrink-0 w-[240px] sm:w-[260px] md:w-[300px]">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-28 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-8 flex items-end justify-between gap-4 md:mb-14">
            <div className="text-left md:text-center md:w-full">
              <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">{t("browse")}</p>
              <h2 className="text-2xl md:text-4xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("collections")}</h2>
              <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground md:mx-auto md:text-sm">
                {t("categoryDesc")}
              </p>
            </div>
            <Link
              to="/category"
              className="hidden md:inline-flex shrink-0 items-center gap-2 text-primary text-xs tracking-[0.2em] uppercase hover:gap-3 transition-all"
            >
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
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
    </div>
  );
}
