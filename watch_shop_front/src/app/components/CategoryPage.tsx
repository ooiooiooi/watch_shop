import { useState } from "react";
import { useSearchParams } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import { products, categories } from "../data";
import { ProductCard } from "./ProductCard";
import { useI18n } from "../i18n";

export function CategoryPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "all";
  const [activeCategory, setActiveCategory] = useState(initialCat);
  const [sortBy, setSortBy] = useState("featured");

  let filteredBase = products.filter((p) => p.status === "on");
  let filtered = activeCategory === "all" ? filteredBase : filteredBase.filter((p) => p.category === activeCategory);

  if (sortBy === "price-asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sortBy === "price-desc") filtered = [...filtered].sort((a, b) => b.price - a.price);

  return (
    <div className="pt-20 md:pt-24">
      <div className="bg-secondary py-16 md:py-24 text-center">
        <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">{t("explore")}</p>
        <h1 className="text-3xl md:text-5xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("ourCollections")}</h1>
        <p className="text-muted-foreground mt-4 max-w-md mx-auto text-sm">{t("categoryDesc")}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
          <div className="flex gap-3 flex-wrap">
            {[{ id: "all", name: t("all") }, ...categories].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 text-[10px] tracking-[0.2em] uppercase border transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border border-border text-muted-foreground text-xs tracking-widest uppercase px-3 py-2 cursor-pointer focus:outline-none"
            >
              <option value="featured">{t("featured")}</option>
              <option value="price-asc">{t("priceLowHigh")}</option>
              <option value="price-desc">{t("priceHighLow")}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p>{t("noProducts")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
