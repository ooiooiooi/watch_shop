import { ShoppingBag } from "lucide-react";
import { Link, useLocation } from "react-router";
import type { Product } from "../data";
import { useCart } from "../cart";
import { Tag, getDisplayTag } from "./Tag";
import { useI18n } from "../i18n";
import { Skeleton } from "./ui/skeleton";
import { resolveMediaUrl } from "../media";

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={["block overflow-hidden rounded-[26px] border border-border/70 bg-gradient-to-b from-secondary/25 to-secondary/10", className ?? ""].join(" ")}>
      <div className="relative overflow-hidden aspect-[3/4]">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
      <div className="p-4 md:p-5">
        <Skeleton className="h-3 w-1/2 mb-3" />
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  );
}

export function ProductCard({
  product,
  className,
  enableAddToCart = false,
}: {
  product: Product;
  className?: string;
  enableAddToCart?: boolean;
}) {
  const { t } = useI18n();
  const location = useLocation();
  const { addItem } = useCart();
  const gallery = ((product.images?.length ? product.images : [product.image]) ?? [])
    .map((src) => (src ?? "").trim())
    .filter(Boolean)
    .filter((src, index, arr) => arr.indexOf(src) === index);
  const primaryImage = resolveMediaUrl(gallery[0] ?? product.image);
  const hoverImage = resolveMediaUrl(gallery[1] ?? null);
  const displayTag = getDisplayTag(product);
  const detailHref = `/product/${product.id}${location.search || ""}`;

  function handleAddToCart(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      brand: product.brand ?? null,
      collection: product.collection ?? null,
      image: gallery[0] ?? product.image ?? null,
      price: product.price,
      quantity: 1,
    });
  }

  return (
    <div
      className={[
        "group block overflow-hidden rounded-[26px] border border-border/70 bg-gradient-to-b from-secondary/25 to-secondary/10 transition-all",
        "hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_18px_50px_rgba(0,0,0,0.18)]",
        className ?? "",
      ].join(" ")}
    >
      <Link to={detailHref} className="block">
        <div className="relative overflow-hidden aspect-[3/4]">
          <div className="absolute inset-x-0 top-0 z-[2] h-24 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
          {hoverImage ? (
            <img
              src={hoverImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 z-0 h-full w-full object-contain p-3 opacity-0 transition-all duration-700 ease-out group-hover:scale-[1.08] group-hover:opacity-100"
            />
          ) : null}
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className={[
              "relative z-[1] h-full w-full transition-all duration-700 ease-out",
              hoverImage
                ? "object-cover opacity-100 group-hover:scale-[0.98] group-hover:opacity-0"
                : "object-cover group-hover:scale-[1.06]",
            ].join(" ")}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          {displayTag && (
            <div className="absolute top-4 left-4 z-[3]">
              <Tag label={displayTag} />
            </div>
          )}
          {product.originalPrice && (
            <div className="absolute top-4 right-4 z-[3] rounded-full bg-red-600/90 px-3 py-1 text-[11px] tracking-widest uppercase text-white">
              {t("sale")}
            </div>
          )}
          <div className="absolute bottom-4 left-4 z-[3] text-[10px] tracking-[0.22em] uppercase text-white/80">
            {product.brand || product.collection}
          </div>
        </div>
        <div className="p-4 md:p-5">
          <p className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
            {product.brand ? product.brand : product.collection}
            {product.brand ? <span className="opacity-60"> · </span> : null}
            {product.brand ? <span className="opacity-70">{product.collection}</span> : null}
          </p>
          <h3 className="mt-2 line-clamp-2 text-lg leading-snug tracking-wide text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            {product.name}
          </h3>
        </div>
      </Link>
      <div className="px-4 pb-4 md:px-5 md:pb-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-xl text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
              ${product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-sm line-through text-muted-foreground">${product.originalPrice.toLocaleString()}</span>
            )}
          </div>
          {enableAddToCart ? (
            <button
              onClick={handleAddToCart}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-secondary/85 px-3 text-[9px] uppercase tracking-[0.14em] text-foreground transition-all hover:border-primary hover:text-primary"
            >
              <ShoppingBag size={12} />
              {t("addToCart")}
            </button>
          ) : (
            <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground transition-colors group-hover:text-primary">
              View
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
