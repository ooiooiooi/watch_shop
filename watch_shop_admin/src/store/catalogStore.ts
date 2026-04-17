import * as React from "react";
import type { Category, Product, ProductSku, SpecGroup } from "../catalog";
import { seedCategories, seedProducts } from "../catalog";

const PRODUCTS_KEY = "watch_shop_admin_products";
const CATEGORIES_KEY = "watch_shop_admin_categories";
const CATALOG_CHANGED_EVENT = "watch_shop_admin_catalog_changed";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function notifyCatalogChanged() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(CATALOG_CHANGED_EVENT));
}

function ensureSeeded() {
  if (!canUseStorage()) return;
  if (!localStorage.getItem(PRODUCTS_KEY)) localStorage.setItem(PRODUCTS_KEY, JSON.stringify(seedProducts));
  if (!localStorage.getItem(CATEGORIES_KEY)) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(seedCategories));
}

export function readCategories(): Category[] {
  ensureSeeded();
  if (!canUseStorage()) return seedCategories;
  return safeParseJson<Category[]>(localStorage.getItem(CATEGORIES_KEY)) ?? seedCategories;
}

export function readProducts(): Product[] {
  ensureSeeded();
  if (!canUseStorage()) return seedProducts;
  const raw = safeParseJson<Product[]>(localStorage.getItem(PRODUCTS_KEY)) ?? seedProducts;
  return normalizeProducts(raw);
}

export function writeCategories(categories: Category[]) {
  ensureSeeded();
  if (!canUseStorage()) return;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  notifyCatalogChanged();
}

export function writeProducts(products: Product[]) {
  ensureSeeded();
  if (!canUseStorage()) return;
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalizeProducts(products)));
  notifyCatalogChanged();
}

export function resetCatalog() {
  ensureSeeded();
  if (!canUseStorage()) return;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(seedCategories));
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(normalizeProducts(seedProducts)));
  notifyCatalogChanged();
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

  React.useEffect(() => {
    const refresh = () => {
      setCategories(readCategories());
      setProducts(readProducts());
    };

    refresh();
    window.addEventListener(CATALOG_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CATALOG_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { categories, products };
}
