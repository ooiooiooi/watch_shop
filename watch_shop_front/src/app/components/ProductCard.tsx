import { Link } from "react-router";
import type { Product } from "../data";
import { Tag } from "./Tag";
import { useI18n } from "../i18n";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useI18n();
  return (
    <Link to={`/product/${product.id}`} className="group block min-w-[260px] md:min-w-[300px]">
      <div className="relative overflow-hidden bg-secondary aspect-[3/4]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.tag && (
          <div className="absolute top-4 left-4">
            <Tag label={product.tag} />
          </div>
        )}
        {product.originalPrice && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-2 py-1 text-xs tracking-widest uppercase">
            {t("sale")}
          </div>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">{product.collection}</p>
        <h3 className="text-foreground tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>{product.name}</h3>
        <div className="flex items-center gap-3">
          <span className="text-primary">${product.price.toLocaleString()}</span>
          {product.originalPrice && (
            <span className="text-muted-foreground line-through text-sm">${product.originalPrice.toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
