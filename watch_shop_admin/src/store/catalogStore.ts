import * as React from "react";
import type { Category, Product, ProductSku, SpecGroup } from "../catalog";
import * as api from "../api/adminApi";

const CATALOG_CHANGED_EVENT = "watch_shop_admin_catalog_changed";

let cachedCategories: Category[] = [];
let cachedProducts: Product[] = [];

function notifyCatalogChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CATALOG_CHANGED_EVENT));
}

export async function refreshCatalog() {
  const [categories, products] = await Promise.all([api.getCategories(), api.getProducts()]);
  cachedCategories = categories;
  cachedProducts = normalizeProducts(products);
  notifyCatalogChanged();
  return { categories: cachedCategories, products: cachedProducts };
}

export function readCategories(): Category[] {
  return cachedCategories;
}

export function readProducts(): Product[] {
  return cachedProducts;
}

export async function createCategory(category: Category) {
  await api.createCategory(category);
  await refreshCatalog();
}

export async function updateCategory(category: Category) {
  await api.updateCategory(category);
  await refreshCatalog();
}

export async function deleteCategory(id: string) {
  await api.deleteCategory(id);
  await refreshCatalog();
}

export async function createProduct(product: Product) {
  await api.createProduct(product);
  await refreshCatalog();
}

export async function updateProduct(product: Product) {
  await api.updateProduct(product);
  await refreshCatalog();
}

export async function deleteProduct(id: string) {
  await api.deleteProduct(id);
  await refreshCatalog();
}

export async function resetCatalog() {
  await api.resetCatalog();
  await refreshCatalog();
}

function normalizeProducts(products: Product[]): Product[] {
  return products.map((p) => normalizeProduct(p));
}

function normalizeProduct(product: Product): Product {
  const status = product.status ?? "on";
  let specGroups: SpecGroup[] = Array.isArray(product.specGroups) ? product.specGroups : [];
  specGroups = specGroups
    .map((g) => ({
      name: String(g.name ?? "").trim() || "Spec",
      options: Array.isArray(g.options) ? g.options.map((o) => String(o).trim()).filter(Boolean) : [],
    }))
    .filter((g) => g.options.length > 0);

  let skus: ProductSku[] = Array.isArray(product.skus) ? product.skus : [];
  skus = skus
    .map((s) => ({
      id: String(s.id ?? "").trim() || `${product.id}-sku`,
      specs: (s.specs ?? {}) as Record<string, string>,
      price: Number(s.price ?? product.price),
      originalPrice: s.originalPrice == null ? product.originalPrice : Number(s.originalPrice),
      stock: Math.max(0, Number(s.stock ?? 0)),
      enabled: Boolean(s.enabled ?? true),
    }))
    .filter((s) => Number.isFinite(s.price));

  if (specGroups.length === 0) {
    specGroups = [{ name: "Default", options: ["Default"] }];
  }

  if (skus.length === 0) {
    skus = [
      {
        id: `${product.id}-default`,
        specs: { [specGroups[0].name]: specGroups[0].options[0] },
        price: product.price,
        originalPrice: product.originalPrice,
        stock: 100,
        enabled: true,
      },
    ];
  }

  const enabledSkus = skus.filter((s) => s.enabled);
  const priceSource = enabledSkus.length ? enabledSkus : skus;
  const minPrice = priceSource.reduce((min, s) => (s.price < min ? s.price : min), priceSource[0]!.price);
  const originalPrices = priceSource.map((s) => s.originalPrice).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const minOriginal = originalPrices.length ? Math.min(...originalPrices) : undefined;

  return {
    ...product,
    status,
    specGroups,
    skus,
    price: Number.isFinite(minPrice) ? minPrice : product.price,
    originalPrice: minOriginal,
  };
}

export function useCatalog() {
  const [categories, setCategories] = React.useState(() => readCategories());
  const [products, setProducts] = React.useState(() => readProducts());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const refresh = () => {
      setCategories(readCategories());
      setProducts(readProducts());
    };

    refresh();
    window.addEventListener(CATALOG_CHANGED_EVENT, refresh);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshCatalog();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "加载失败";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      window.removeEventListener(CATALOG_CHANGED_EVENT, refresh);
    };
  }, []);

  return { categories, products, loading, error, refresh: refreshCatalog };
}
