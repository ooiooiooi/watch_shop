import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { Shield, Droplets, Award, Clock, ChevronRight, ArrowRight } from "lucide-react";
import { IMAGES, products, categories } from "../data";
import { ProductCard } from "./ProductCard";
import { GoldButton } from "./GoldButton";
import { useI18n } from "../i18n";

function Countdown() {
  const { t } = useI18n();
  const [time, setTime] = useState({ h: 23, m: 45, s: 12 });
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
    <div className="flex gap-4">
      {[
        { label: t("hours"), value: pad(time.h) },
        { label: t("minutes"), value: pad(time.m) },
        { label: t("seconds"), value: pad(time.s) },
      ].map((item) => (
        <div key={item.label} className="text-center">
          <div className="text-3xl md:text-5xl text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>{item.value}</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative h-screen flex items-center">
        <div className="absolute inset-0">
          <img src={IMAGES.banner} alt="Luxury Watch" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 w-full">
          <p className="text-primary text-xs tracking-[0.4em] uppercase mb-4">{t("swissCraftsmanship")}</p>
          <h1 className="text-4xl md:text-7xl text-white max-w-xl leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t("timePerfected")}
          </h1>
          <p className="text-white/60 mt-6 max-w-md text-sm md:text-base">
            {t("heroDesc")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link to="/category">
              <GoldButton>{t("exploreCollection")}</GoldButton>
            </Link>
            <Link to="/product/1">
              <GoldButton variant="outline">{t("viewFlagship")}</GoldButton>
            </Link>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight size={20} className="text-primary rotate-90" />
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">{t("curatedSelection")}</p>
              <h2 className="text-2xl md:text-4xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("bestSellers")}</h2>
            </div>
            <Link to="/category" className="text-primary text-xs tracking-[0.2em] uppercase flex items-center gap-2 hover:gap-3 transition-all">
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-6 overflow-x-auto px-4 md:px-8 pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
          {products.filter((p) => p.status === "on").map((p) => (
            <div key={p.id} className="snap-start shrink-0">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 md:py-28 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">{t("browse")}</p>
            <h2 className="text-2xl md:text-4xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("collections")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.map((cat) => (
              <Link key={cat.id} to={`/category?cat=${cat.id}`} className="group relative overflow-hidden aspect-[3/4]">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs md:text-sm tracking-[0.3em] uppercase">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* USPs */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { icon: Droplets, title: t("waterResistant"), desc: t("waterResistantDesc") },
              { icon: Shield, title: t("yearWarranty"), desc: t("fullCoverage") },
              { icon: Award, title: t("certified"), desc: t("swissChronometer") },
              { icon: Clock, title: t("precision"), desc: t("precisionDesc") },
            ].map((usp) => (
              <div key={usp.title} className="text-center">
                <usp.icon size={28} className="text-primary mx-auto mb-4" strokeWidth={1} />
                <h4 className="text-foreground text-xs tracking-[0.2em] uppercase mb-1">{usp.title}</h4>
                <p className="text-muted-foreground text-sm">{usp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-20 md:py-28 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <div className="aspect-[4/5] overflow-hidden">
              <img src={IMAGES.mechanism} alt="Watch mechanism" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <p className="text-primary text-xs tracking-[0.3em] uppercase mb-4">{t("ourHeritage")}</p>
            <h2 className="text-2xl md:text-4xl text-foreground mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>{t("brandStoryTitle")}</h2>
            <p className="text-muted-foreground mb-4">{t("brandStoryP1")}</p>
            <p className="text-muted-foreground mb-8">{t("brandStoryP2")}</p>
            <GoldButton variant="outline">{t("discoverOurStory")}</GoldButton>
          </div>
        </div>
      </section>

      {/* Flash Sale */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={IMAGES.store} alt="Store" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 text-center">
          <p className="text-primary text-xs tracking-[0.3em] uppercase mb-4">{t("limitedTimeOffer")}</p>
          <h2 className="text-3xl md:text-5xl text-white mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>{t("flashSaleEndsIn")}</h2>
          <div className="flex justify-center mb-10">
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
