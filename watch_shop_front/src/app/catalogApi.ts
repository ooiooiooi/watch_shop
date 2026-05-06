import type { Product } from "./data";

export type Category = { id: string; name: string; image: string };
export type Brand = { id: string; name: string; image?: string };
export type WatchModel = { id: string; brandId: string; name: string; image?: string };

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = text || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        const p = parsed as Record<string, unknown>;
        const m = (p.message ?? p.error) as unknown;
        if (typeof m === "string" && m.trim()) msg = m.trim();
      }
    } catch {
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function getPublicCategories(): Promise<Category[]> {
  return requestJson<Category[]>("/api/public/categories");
}

export type ProductQuery = {
  category?: string;
  status?: "on" | "off";
  brand?: string;
  model?: string;
  brandId?: string;
  modelId?: string;
  q?: string;
  sort?: "featured" | "price-asc" | "price-desc";
};

export type PageResponse<T> = { items: T[]; total: number; page: number; size: number };

export async function getPublicProductsPage(query?: ProductQuery & { page?: number; size?: number }): Promise<PageResponse<Product>> {
  const sp = new URLSearchParams();
  if (query?.category) sp.set("category", query.category);
  if (query?.status) sp.set("status", query.status);
  if (query?.brand) sp.set("brand", query.brand);
  if (query?.model) sp.set("model", query.model);
  if (query?.brandId) sp.set("brandId", query.brandId);
  if (query?.modelId) sp.set("modelId", query.modelId);
  if (query?.q) sp.set("q", query.q);
  if (query?.sort) sp.set("sort", query.sort);
  if (query?.page != null) sp.set("page", String(query.page));
  if (query?.size != null) sp.set("size", String(query.size));
  const qs = sp.toString();
  return requestJson<PageResponse<Product>>(`/api/public/products/page${qs ? `?${qs}` : ""}`);
}

export async function getPublicProducts(query?: ProductQuery): Promise<Product[]> {
  const res = await getPublicProductsPage({ ...(query ?? {}), page: 0, size: 24 });
  return res.items;
}

export async function getPublicProduct(id: string): Promise<Product> {
  return requestJson<Product>(`/api/public/products/${encodeURIComponent(id)}`);
}

export async function getPublicRelatedProducts(id: string, limit?: number): Promise<Product[]> {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  const qs = params.toString();
  return requestJson<Product[]>(`/api/public/products/${encodeURIComponent(id)}/related${qs ? `?${qs}` : ""}`);
}

export async function getPublicBrands(): Promise<Brand[]> {
  return requestJson<Brand[]>("/api/public/brands");
}

export async function getPublicModels(brandId?: string): Promise<WatchModel[]> {
  const params = new URLSearchParams();
  if (brandId) params.set("brandId", brandId);
  const qs = params.toString();
  return requestJson<WatchModel[]>(`/api/public/models${qs ? `?${qs}` : ""}`);
}

export type CustomerServiceConfig = {
  whatsapp: string | null;
  displayName: string | null;
  hours: string | null;
  defaultMessage: string | null;
  orderMode: string | null;
  orderButtonLabel: string | null;
  orderMessageTemplate: string | null;
  showBuyButtons: boolean | null;
};

export async function getPublicCustomerServiceConfig(): Promise<CustomerServiceConfig> {
  return requestJson<CustomerServiceConfig>("/api/public/settings/customer-service");
}
