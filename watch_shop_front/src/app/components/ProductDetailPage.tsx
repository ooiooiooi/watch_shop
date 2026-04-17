import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { Shield, Truck, RotateCcw, Package, Minus, Plus } from "lucide-react";
import { products, type ProductSku, type SpecGroup } from "../data";
import { ProductCard } from "./ProductCard";
import { GoldButton } from "./GoldButton";
import { Tag } from "./Tag";
import { useI18n } from "../i18n";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

function DetailCountdown() {
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
    <div className="bg-secondary border border-border p-4 flex items-center justify-between">
      <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">{t("offerEndsIn")}</span>
      <div className="flex gap-2">
        {[pad(time.h), pad(time.m), pad(time.s)].map((v, i) => (
          <span key={i} className="bg-background text-primary px-2 py-1 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{v}</span>
        ))}
      </div>
    </div>
  );
}

export function ProductDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const product = products.find((p) => p.id === id) || products[0];
  const [quantity, setQuantity] = useState(1);
  const recommended = products.filter((p) => p.id !== product.id && p.status === "on").slice(0, 4);
  const [activeMedia, setActiveMedia] = useState(0);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});

  const specGroups: SpecGroup[] = product.specGroups ?? [];
  const skus: ProductSku[] = product.skus ?? [];

  const gallery = [product.image, product.image, product.image, product.image];
  const heroImage = gallery[Math.min(activeMedia, gallery.length - 1)];

  useEffect(() => {
    setActiveMedia(0);
    setQuantity(1);
    const preferred =
      skus.find((s) => s.enabled && s.stock > 0) ?? skus.find((s) => s.enabled) ?? skus[0];
    setSelectedSpecs(preferred?.specs ?? {});
  }, [product.id]);

  const matchPartial = (sku: ProductSku, selected: Record<string, string>, ignore?: string) => {
    return specGroups.every((g) => {
      if (g.name === ignore) return true;
      const v = selected[g.name];
      if (!v) return true;
      return sku.specs[g.name] === v;
    });
  };

  const activeSku =
    skus.find((s) => s.enabled && matchPartial(s, selectedSpecs) && specGroups.every((g) => selectedSpecs[g.name] === s.specs[g.name])) ??
    skus.find((s) => s.enabled && matchPartial(s, selectedSpecs) && s.stock > 0) ??
    skus.find((s) => s.enabled && matchPartial(s, selectedSpecs)) ??
    skus.find((s) => s.enabled) ??
    skus[0];

  const displayPrice = activeSku?.price ?? product.price;
  const displayOriginalPrice = activeSku?.originalPrice ?? product.originalPrice;
  const saveAmount =
    displayOriginalPrice && displayOriginalPrice > displayPrice ? displayOriginalPrice - displayPrice : 0;
  const maxQty = Math.max(1, activeSku?.stock ?? 1);
  const canBuy = product.status === "on" && Boolean(activeSku?.enabled) && (activeSku?.stock ?? 0) > 0;
  const isOffShelf = product.status !== "on";

  return (
    <div className="pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground tracking-widest uppercase">
          <Link to="/" className="hover:text-primary transition-colors">{t("home")}</Link>
          <span>/</span>
          <Link to="/category" className="hover:text-primary transition-colors">{t("collections")}</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <div className="relative bg-secondary border border-border overflow-hidden">
              <div className="aspect-square">
                <img src={heroImage} alt={product.name} className="w-full h-full object-cover" />
              </div>
              {product.tag && (
                <div className="absolute top-6 left-6">
                  <Tag label={product.tag} />
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {gallery.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMedia(idx)}
                  className={[
                    "h-20 w-20 shrink-0 border overflow-hidden transition-colors",
                    idx === activeMedia ? "border-primary" : "border-border hover:border-primary/70",
                  ].join(" ")}
                  aria-label={`media-${idx + 1}`}
                >
                  <img src={src} alt={product.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-28">
            <div className="space-y-6">
              <div>
                <p className="text-primary text-xs tracking-[0.35em] uppercase mb-2">{product.collection}</p>
                <h1 className="text-3xl md:text-4xl text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {product.name}
                </h1>
                <p className="mt-2 text-xs tracking-[0.2em] uppercase text-muted-foreground">
                  SKU {product.id} · {product.category}
                </p>
              </div>

              <div className="flex items-end gap-4 flex-wrap">
                <span className="text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ${displayPrice.toLocaleString()}
                </span>
                {displayOriginalPrice && (
                  <span className="text-muted-foreground line-through">
                    ${displayOriginalPrice.toLocaleString()}
                  </span>
                )}
                {saveAmount > 0 && (
                  <span className="text-red-500 text-xs tracking-widest uppercase">
                    {t("save")} ${saveAmount.toLocaleString()}
                  </span>
                )}
              </div>

              {saveAmount > 0 && <DetailCountdown />}

              <div className="space-y-5 border-t border-border pt-6">
                {isOffShelf && (
                  <div className="border border-border bg-secondary p-4">
                    <div className="text-xs tracking-[0.25em] uppercase text-muted-foreground">该商品已下架</div>
                  </div>
                )}

                {specGroups.map((group) => {
                  return (
                    <div key={group.name}>
                      <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-3">
                        {group.name} · {selectedSpecs[group.name] || "—"}
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        {group.options.map((opt) => {
                          const exists = skus.some(
                            (s) => s.enabled && matchPartial(s, selectedSpecs, group.name) && s.specs[group.name] === opt
                          );
                          const hasStock = skus.some(
                            (s) =>
                              s.enabled &&
                              s.stock > 0 &&
                              matchPartial(s, selectedSpecs, group.name) &&
                              s.specs[group.name] === opt
                          );
                          const selected = selectedSpecs[group.name] === opt;
                          const disabled = !exists;
                          return (
                            <button
                              key={opt}
                              disabled={disabled || isOffShelf}
                              onClick={() => {
                                setSelectedSpecs((prev) => ({ ...prev, [group.name]: opt }));
                                setQuantity(1);
                              }}
                              className={[
                                "px-5 py-2 text-xs tracking-widest border transition-colors",
                                selected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border text-muted-foreground hover:border-primary",
                                disabled || isOffShelf ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                                exists && !hasStock && !selected ? "opacity-60" : "",
                              ].join(" ")}
                              aria-label={`${group.name}-${opt}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div>
                  <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mb-3">{t("quantity")}</p>
                  <div className="inline-flex items-center border border-border bg-secondary">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || !canBuy}
                      className="px-4 py-3 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="decrease"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-6 py-3 text-foreground text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                      disabled={quantity >= maxQty || !canBuy}
                      className="px-4 py-3 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="increase"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="mt-2 text-xs tracking-[0.15em] uppercase text-muted-foreground">
                    {activeSku ? `库存 ${activeSku.stock}` : ""}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <GoldButton fullWidth disabled={!canBuy}>{t("addToCart")}</GoldButton>
                  <GoldButton variant="outline" fullWidth disabled={!canBuy}>{t("buyNow")}</GoldButton>
                </div>

                <div className="space-y-2 pt-2">
                  {[
                    { icon: Truck, text: t("freeShipping") },
                    { icon: RotateCcw, text: t("dayReturns") },
                    { icon: Shield, text: t("yearWarranty") },
                    { icon: Package, text: t("luxuryPackaging") },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3 text-muted-foreground">
                      <item.icon size={16} className="text-primary shrink-0" strokeWidth={1.5} />
                      <span className="text-xs tracking-[0.15em] uppercase">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="border-t border-border pt-6">
            <Accordion type="single" collapsible defaultValue="desc">
              <AccordionItem value="desc" className="border-b-0">
                <AccordionTrigger className="hover:no-underline text-xs tracking-[0.3em] uppercase text-foreground">
                  DESCRIPTION
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <div className="space-y-4 text-sm leading-relaxed">
                    <p>{product.description}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="border-t border-border pt-6">
            <Accordion type="single" collapsible defaultValue="specs">
              <AccordionItem value="specs" className="border-b-0">
                <AccordionTrigger className="hover:no-underline text-xs tracking-[0.3em] uppercase text-foreground">
                  SPECIFICATIONS
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <dl className="grid grid-cols-1 gap-2 text-sm">
                    {[
                      ["MODEL", product.name],
                      ["COLLECTION", product.collection],
                      ["CATEGORY", product.category],
                      ["REFERENCE", product.id],
                      ...specGroups.map((g) => [g.name.toUpperCase(), selectedSpecs[g.name] || "—"]),
                      ["SKU ID", activeSku?.id || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-6 border-b border-border/60 py-2">
                        <dt className="text-xs tracking-[0.2em] uppercase text-muted-foreground">{k}</dt>
                        <dd className="text-right text-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <p className="text-primary text-xs tracking-[0.3em] uppercase mb-2">{t("youMayAlsoLike")}</p>
            <h2 className="text-2xl md:text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("recommended")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
