import { useState, useEffect } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router";
import { Shield, Truck, RotateCcw, MessageCircle } from "lucide-react";
import DOMPurify from "dompurify";
import { type Product, type ProductSku, type SpecGroup } from "../data";
import { ProductCard } from "./ProductCard";
import { Tag, getDisplayTag } from "./Tag";
import { useI18n } from "../i18n";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Skeleton } from "./ui/skeleton";
import { usePublicProduct } from "../hooks/usePublicProduct";
import { usePublicTaxonomy } from "../hooks/usePublicTaxonomy";
import { getPublicRelatedProducts } from "../catalogApi";
import { useCustomerService } from "../hooks/useCustomerService";
import { applyTemplate, buildWhatsAppHref } from "../utils/whatsapp";
import { resolveMediaUrl } from "../media";
import { useCart } from "../cart";
import { MobileTaxonomyDrawer } from "./MobileTaxonomyDrawer";

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
    <div className="rounded-xl md:rounded-2xl bg-secondary border border-border p-3 md:p-4 flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4">
      <span className="text-[10px] md:text-xs tracking-[0.12em] md:tracking-[0.15em] uppercase text-muted-foreground">{t("offerEndsIn")}</span>
      <div className="flex gap-1.5 md:gap-2">
        {[pad(time.h), pad(time.m), pad(time.s)].map((v, i) => (
          <span key={i} className="rounded-md bg-background text-primary px-1.5 md:px-2 py-0.5 md:py-1 text-xs md:text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{v}</span>
        ))}
      </div>
    </div>
  );
}

export function ProductDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const categoryHref = `/category${location.search || ""}`;
  const { product, loading: productLoading } = usePublicProduct(id);
  const { brands, models } = usePublicTaxonomy();
  const { config } = useCustomerService();
  const { addItem } = useCart();
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [mobileCollectionsOpen, setMobileCollectionsOpen] = useState(false);
  const [mobileDrawerBrandId, setMobileDrawerBrandId] = useState<string | null>(null);

  const selectedBrandId = new URLSearchParams(location.search).get("brand");
  const selectedModelId = new URLSearchParams(location.search).get("model");

  useEffect(() => {
    if (!product) return;
    setActiveMedia(0);
    const skus: ProductSku[] = product.skus ?? [];
    const preferred =
      skus.find((s) => s.enabled && s.stock > 0) ?? skus.find((s) => s.enabled) ?? skus[0];
    setSelectedSpecs(preferred?.specs ?? {});

    // Update Meta tags
    if (product.metaTitle || product.name) {
      document.title = product.metaTitle || `${product.name} | VS Factory`;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", product.metaDescription || product.description?.replace(/<[^>]*>?/gm, "").substring(0, 150) || "");
    }
  }, [product]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!product) return;
      setRecommendedLoading(true);
      try {
        const items = await getPublicRelatedProducts(product.id, 4);
        if (!alive) return;
        setRecommended(items);
      } catch {
        if (!alive) return;
        setRecommended([]);
      } finally {
        if (!alive) return;
        setRecommendedLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [product?.id]);

  useEffect(() => {
    setMobileDrawerBrandId(selectedBrandId || null);
  }, [selectedBrandId]);

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

  if (productLoading) {
    return (
      <div className="pt-20 md:pt-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16 items-start">
            <div>
              <Skeleton className="w-full aspect-square rounded-xl md:rounded-2xl" />
              <div className="mt-5 flex gap-3 md:gap-4 overflow-x-auto pb-2">
                <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl" />
                <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl" />
                <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl" />
              </div>
            </div>
            <div className="space-y-4 md:space-y-6">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="py-4 md:py-6 border-y border-border/50">
                <Skeleton className="h-8 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-20 md:pt-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 text-center">
          <div className="text-foreground text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t("productNotFound")}
          </div>
          <div className="mt-6">
            <Link to={categoryHref} className="text-primary hover:underline">
              {t("backToList")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const specGroups: SpecGroup[] = product.specGroups ?? [];
  const skus: ProductSku[] = product.skus ?? [];

  const gallery = (product.images && product.images.length > 0 ? product.images : [product.image])
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length > 0)
    .slice(0, 12);
  const heroImage = gallery[Math.min(activeMedia, gallery.length - 1)];

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
  const isOffShelf = product.status !== "on";

  const contactHref = (() => {
    if (!config.whatsapp) return null;
    const url = typeof window === "undefined" ? "" : window.location.href;
    const vars = {
      defaultMessage: config.defaultMessage ?? t("csDefaultMessage"),
      productName: product.name,
      productId: product.id,
      url,
    };
    const tpl = config.orderMessageTemplate ?? "{defaultMessage}\n{productName} (ID: {productId})\n{url}";
    const text = applyTemplate(tpl, vars).trim();
    return buildWhatsAppHref(config.whatsapp, text);
  })();
  const contactLabel = t("contactWhatsapp");

  const serviceHighlights = [
    { icon: Truck, title: "Preparing Watches", value: "24-48 Hours" },
    { icon: Truck, title: "Express Delivery", value: "5-10 Business Days" },
    { icon: Shield, title: "Warranty", value: "2 Years" },
    { icon: RotateCcw, title: "Free 14-Days Returns", value: "Patek Philippe Annual Calendar" },
  ];

  const displayTag = getDisplayTag(product);

  function closeMobileDrawer() {
    setMobileCollectionsOpen(false);
    setMobileDrawerBrandId(selectedBrandId || null);
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

  function handleAddToCart() {
    if (!product) return;
    addItem({
      productId: product.id,
      skuId: activeSku?.id ?? null,
      name: product.name,
      brand: product.brand ?? null,
      collection: product.collection ?? null,
      image: heroImage ?? product.image ?? null,
      price: displayPrice,
      quantity: 1,
      specs: activeSku?.specs ?? selectedSpecs,
    });
  }

  return (
    <div className="pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground tracking-widest uppercase flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">{t("home")}</Link>
          <span>/</span>
          <Link to={categoryHref} className="hover:text-primary transition-colors">{t("collections")}</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16 items-start">
          <div>
            <div className="relative rounded-xl md:rounded-2xl bg-secondary border border-border overflow-hidden">
              <div className="aspect-square">
                <img src={resolveMediaUrl(heroImage)} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
              {displayTag && (
                <div className="absolute top-3 md:top-6 left-3 md:left-6">
                  <Tag label={displayTag} />
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3 md:gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {gallery.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMedia(idx)}
                  className={[
                    "h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl border overflow-hidden transition-colors",
                    idx === activeMedia ? "border-primary" : "border-border hover:border-primary/70",
                  ].join(" ")}
                  aria-label={`media-${idx + 1}`}
                >
                  <img src={resolveMediaUrl(src)} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-28">
            <div className="space-y-4 md:space-y-6">
              <div>
                <p className="text-primary text-xs tracking-[0.3em] md:tracking-[0.35em] uppercase mb-2">{product.collection}</p>
                <h1 className="text-2xl md:text-4xl text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {product.name}
                </h1>
                <p className="mt-2 text-[10px] md:text-xs tracking-[0.15em] md:tracking-[0.2em] uppercase text-muted-foreground break-words">
                  SKU {product.id}
                  {product.brand ? ` · ${product.brand}` : ""}
                  {product.model ? ` · ${product.model}` : ""}
                  {product.reference ? ` · ${product.reference}` : ""}
                  {" · "}
                  {product.category}
                </p>
              </div>

              <div className="flex items-end gap-3 md:gap-4 flex-wrap">
                <span className="text-xl md:text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  ${displayPrice.toLocaleString()}
                </span>
                {displayOriginalPrice && (
                  <span className="text-muted-foreground line-through text-sm md:text-base">
                    ${displayOriginalPrice.toLocaleString()}
                  </span>
                )}
                {saveAmount > 0 && (
                  <span className="text-red-500 text-[10px] md:text-xs tracking-widest uppercase">
                    {t("save")} ${saveAmount.toLocaleString()}
                  </span>
                )}
              </div>

              {saveAmount > 0 && <DetailCountdown />}

              <div className="space-y-4 md:space-y-5 border-t border-border pt-5 md:pt-6">
                {isOffShelf && (
                  <div className="rounded-xl md:rounded-2xl border border-border bg-secondary p-3 md:p-4">
                    <div className="text-xs tracking-[0.2em] md:tracking-[0.25em] uppercase text-muted-foreground">{t("offShelf")}</div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOffShelf}
                    className="inline-flex min-h-[60px] w-full items-center justify-center rounded-full border border-primary/35 bg-secondary px-5 py-3 text-sm font-semibold tracking-[0.08em] text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("addToCart")}
                  </button>
                  {contactHref && (
                    <a
                      href={contactHref}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative inline-flex min-h-[60px] w-full items-center gap-4 overflow-hidden rounded-full border border-[#25d366]/35 bg-[linear-gradient(135deg,#1db954,#25d366)] px-5 py-3 text-white shadow-[0_18px_38px_rgba(37,211,102,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(37,211,102,0.3)]"
                    >
                      <span className="absolute inset-0 rounded-full border border-white/10 opacity-70" />
                      <span className="absolute left-5 flex h-10 w-10 items-center justify-center">
                        <span className="absolute h-10 w-10 rounded-full bg-white/20 animate-ping" />
                        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/18 backdrop-blur-sm">
                          <MessageCircle size={18} />
                        </span>
                      </span>
                      <span className="ml-14 min-w-0 flex-1">
                        <span className="block text-[10px] uppercase tracking-[0.26em] text-white/80">
                          WhatsApp
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold tracking-[0.08em] md:text-[15px]">
                          {contactLabel}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-white/16 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/90">
                        Live
                      </span>
                    </a>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {serviceHighlights.map((item) => (
                    <div key={item.title} className="flex items-start gap-3 md:gap-4 text-muted-foreground">
                      <item.icon size={18} className="mt-0.5 md:size-5 text-primary shrink-0" strokeWidth={1.5} />
                      <div className="flex min-w-0 flex-1 items-start justify-between gap-4 border-b border-border/40 pb-3">
                        <span className="text-xs md:text-sm text-foreground">{item.title}</span>
                        <span className="shrink-0 text-right text-xs md:text-sm text-muted-foreground">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16">
          <div className="border-t border-border pt-6">
            <Accordion type="single" collapsible defaultValue="desc">
              <AccordionItem value="desc" className="border-b-0">
                <AccordionTrigger className="hover:no-underline text-xs tracking-[0.2em] uppercase text-foreground">
                  {t("descriptionTitle")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <div
                    className="space-y-4 text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description || "") }}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="border-t border-border pt-6">
            <Accordion type="single" collapsible defaultValue="specs">
              <AccordionItem value="specs" className="border-b-0">
                <AccordionTrigger className="hover:no-underline text-xs tracking-[0.2em] uppercase text-foreground">
                  {t("specificationsTitle")}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <dl className="grid grid-cols-1 gap-2 text-sm">
                    {[
                      [t("specModel").toUpperCase(), product.model ?? product.name],
                      [t("specCollection").toUpperCase(), product.collection],
                      [t("specCategory").toUpperCase(), product.category],
                      [t("specReference").toUpperCase(), product.reference ?? product.id],
                      ...specGroups.map((g) => [g.name.toUpperCase(), selectedSpecs[g.name] || "—"]),
                      [t("specSkuId").toUpperCase(), activeSku?.id || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-4 md:gap-6 border-b border-border/60 py-2">
                        <dt className="text-xs tracking-[0.15em] uppercase text-muted-foreground break-words">{k}</dt>
                        <dd className="text-right text-foreground shrink-0">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      <section className="py-12 md:py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-primary text-xs tracking-[0.25em] md:tracking-[0.3em] uppercase mb-2">{t("youMayAlsoLike")}</p>
            <h2 className="text-xl md:text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{t("recommended")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {recommendedLoading && (
            <div className="mt-8 text-center text-muted-foreground text-sm">{t("loadingRecommended")}</div>
          )}
          {!recommendedLoading && recommended.length === 0 && (
            <div className="mt-8 text-center text-muted-foreground text-sm">{t("noRecommended")}</div>
          )}
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
        selectedBrandId={selectedBrandId}
        selectedModelId={selectedModelId}
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
