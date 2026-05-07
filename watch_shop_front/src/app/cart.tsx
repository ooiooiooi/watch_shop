"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "watch_shop_cart_v1";

export type CartItem = {
  key: string;
  productId: string;
  skuId: string | null;
  name: string;
  brand: string | null;
  collection: string | null;
  image: string | null;
  price: number;
  quantity: number;
  specs: Record<string, string>;
};

export type AddCartItemInput = {
  productId: string;
  skuId?: string | null;
  name: string;
  brand?: string | null;
  collection?: string | null;
  image?: string | null;
  price: number;
  quantity?: number;
  specs?: Record<string, string>;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (input: AddCartItemInput) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function normalizeQuantity(value: number | undefined): number {
  if (!Number.isFinite(value) || value == null) return 1;
  return Math.max(1, Math.floor(value));
}

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const entry = item as Partial<CartItem>;
        if (!entry.key || !entry.productId || !entry.name) return null;
        return {
          key: String(entry.key),
          productId: String(entry.productId),
          skuId: entry.skuId ? String(entry.skuId) : null,
          name: String(entry.name),
          brand: entry.brand ? String(entry.brand) : null,
          collection: entry.collection ? String(entry.collection) : null,
          image: entry.image ? String(entry.image) : null,
          price: typeof entry.price === "number" && Number.isFinite(entry.price) ? entry.price : 0,
          quantity: normalizeQuantity(entry.quantity),
          specs: entry.specs && typeof entry.specs === "object" ? (entry.specs as Record<string, string>) : {},
        } satisfies CartItem;
      })
      .filter((item): item is CartItem => item !== null);
  } catch {
    return [];
  }
}

function makeCartKey(productId: string, skuId: string | null | undefined, specs?: Record<string, string>): string {
  const specKey = Object.entries(specs ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return [productId, skuId ?? "", specKey].join("::");
}

export function buildCartInquiryMessage(items: CartItem[], defaultMessage: string): string {
  const lines = items.flatMap((item, index) => {
    const specLine = Object.entries(item.specs)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    return [
      `${index + 1}. ${item.name}`,
      `ID: ${item.productId}`,
      item.skuId ? `SKU: ${item.skuId}` : null,
      item.brand ? `Brand: ${item.brand}` : null,
      specLine ? `Specs: ${specLine}` : null,
      `Qty: ${item.quantity}`,
    ].filter(Boolean) as string[];
  });

  return [defaultMessage, "", "Cart Items:", ...lines].join("\n");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStorage());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      items,
      totalItems,
      subtotal,
      isOpen,
      addItem(input) {
        const key = makeCartKey(input.productId, input.skuId ?? null, input.specs);
        setItems((prev) => {
          const qty = normalizeQuantity(input.quantity);
          const existing = prev.find((item) => item.key === key);
          if (existing) {
            return prev.map((item) =>
              item.key === key ? { ...item, quantity: item.quantity + qty, price: input.price } : item,
            );
          }
          return [
            ...prev,
            {
              key,
              productId: input.productId,
              skuId: input.skuId ?? null,
              name: input.name,
              brand: input.brand ?? null,
              collection: input.collection ?? null,
              image: input.image ?? null,
              price: input.price,
              quantity: qty,
              specs: input.specs ?? {},
            },
          ];
        });
        setIsOpen(true);
      },
      removeItem(key) {
        setItems((prev) => prev.filter((item) => item.key !== key));
      },
      updateQuantity(key, quantity) {
        if (quantity <= 0) {
          setItems((prev) => prev.filter((item) => item.key !== key));
          return;
        }
        setItems((prev) =>
          prev
            .map((item) => (item.key === key ? { ...item, quantity: normalizeQuantity(quantity) } : item))
            .filter((item) => item.quantity > 0),
        );
      },
      clearCart() {
        setItems([]);
      },
      openCart() {
        setIsOpen(true);
      },
      closeCart() {
        setIsOpen(false);
      },
    };
  }, [isOpen, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
