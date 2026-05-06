import type { Brand, Category, Product, WatchModel } from "../catalog";

const TOKEN_KEY = "watch_shop_admin_token";
const TOKEN_EXPIRY_SKEW_MS = 30_000;

export type PageResponse<T> = { items: T[]; total: number; page: number; size: number };
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

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now() + TOKEN_EXPIRY_SKEW_MS;
}

export function getToken() {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) {
    window.localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

function redirectToLoginIfNeeded() {
  if (typeof window === "undefined") return;
  if (window.location.hash.startsWith("#/login")) return;
  window.location.hash = "#/login";
}

async function throwIfUnauthorized(res: Response, requestUrl: string) {
  if (res.status !== 401 && res.status !== 403) return;
  const isLoginRequest = requestUrl.includes("/api/admin/auth/login");
  if (isLoginRequest) return;
  clearToken();
  redirectToLoginIfNeeded();
  throw new Error("登录已失效，请重新登录");
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const requestUrl = String(input);
    await throwIfUnauthorized(res, requestUrl);
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(username: string, password: string) {
  const data = await requestJson<{ token: string; username: string; mustChangePassword: boolean }>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function changePassword(oldPassword: string, newPassword: string) {
  return requestJson<void>("/api/admin/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export type DashboardTrendPoint = {
  date: string;
  label: string;
  visits: number;
  uniqueVisitors: number;
};

export type DashboardStats = {
  todayVisits: number;
  todayUniqueVisitors: number;
  totalVisits: number;
  totalUniqueVisitors: number;
  dailyTrend: DashboardTrendPoint[];
};

export type VisitorLog = {
  id: number;
  ipAddress: string | null;
  pagePath: string | null;
  referrer: string | null;
  userAgent: string | null;
  visitedAt: string;
};

export async function getDashboardStats() {
  const data = await requestJson<Partial<DashboardStats>>("/api/admin/stats");
  return {
    todayVisits: typeof data?.todayVisits === "number" ? data.todayVisits : 0,
    todayUniqueVisitors: typeof data?.todayUniqueVisitors === "number" ? data.todayUniqueVisitors : 0,
    totalVisits: typeof data?.totalVisits === "number" ? data.totalVisits : 0,
    totalUniqueVisitors: typeof data?.totalUniqueVisitors === "number" ? data.totalUniqueVisitors : 0,
    dailyTrend: Array.isArray(data?.dailyTrend) ? data.dailyTrend : [],
  } satisfies DashboardStats;
}

export async function getVisitorLogs(params?: { page?: number; size?: number; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.size != null) qs.set("size", String(params.size));
  if (params?.q) qs.set("q", params.q);
  const s = qs.toString();
  return requestJson<PageResponse<VisitorLog>>(`/api/admin/stats/visitors${s ? `?${s}` : ""}`);
}

export async function uploadImage(file: File): Promise<string> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    await throwIfUnauthorized(res, "/api/admin/upload");
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.url;
}
export async function getCategories(): Promise<Category[]> {
  return requestJson<Category[]>("/api/admin/categories");
}

export async function createCategory(category: Category): Promise<Category> {
  return requestJson<Category>("/api/admin/categories", { method: "POST", body: JSON.stringify(category) });
}

export async function updateCategory(category: Category): Promise<Category> {
  return requestJson<Category>(`/api/admin/categories/${encodeURIComponent(category.id)}`, {
    method: "PUT",
    body: JSON.stringify(category),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await requestJson<void>(`/api/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getProducts(params?: { category?: string; status?: "all" | "on" | "off"; q?: string }): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== "all") qs.set("category", params.category);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.q) qs.set("q", params.q);
  const s = qs.toString();
  return requestJson<Product[]>(`/api/admin/products${s ? `?${s}` : ""}`);
}

export async function getProductsPage(params?: {
  category?: string;
  status?: "all" | "on" | "off";
  brand?: string;
  model?: string;
  q?: string;
  sort?: "featured" | "price-asc" | "price-desc";
  page?: number;
  size?: number;
}): Promise<PageResponse<Product>> {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== "all") qs.set("category", params.category);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.brand) qs.set("brand", params.brand);
  if (params?.model) qs.set("model", params.model);
  if (params?.q) qs.set("q", params.q);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.size != null) qs.set("size", String(params.size));
  const s = qs.toString();
  return requestJson<PageResponse<Product>>(`/api/admin/products/page${s ? `?${s}` : ""}`);
}

export async function createProduct(product: Product): Promise<Product> {
  return requestJson<Product>("/api/admin/products", { method: "POST", body: JSON.stringify(product) });
}

export async function updateProduct(product: Product): Promise<Product> {
  return requestJson<Product>(`/api/admin/products/${encodeURIComponent(product.id)}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await requestJson<void>(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function resetCatalog(): Promise<void> {
  await requestJson<void>("/api/admin/catalog/reset", { method: "POST" });
}

export async function getBrands(): Promise<Brand[]> {
  return requestJson<Brand[]>("/api/admin/brands");
}

export async function createBrand(brand: Brand): Promise<Brand> {
  return requestJson<Brand>("/api/admin/brands", { method: "POST", body: JSON.stringify(brand) });
}

export async function updateBrand(brand: Brand): Promise<Brand> {
  return requestJson<Brand>(`/api/admin/brands/${encodeURIComponent(brand.id)}`, {
    method: "PUT",
    body: JSON.stringify(brand),
  });
}

export async function deleteBrand(id: string): Promise<void> {
  await requestJson<void>(`/api/admin/brands/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getModels(params?: { brandId?: string }): Promise<WatchModel[]> {
  const qs = new URLSearchParams();
  if (params?.brandId) qs.set("brandId", params.brandId);
  const s = qs.toString();
  return requestJson<WatchModel[]>(`/api/admin/models${s ? `?${s}` : ""}`);
}

export async function getCustomerServiceConfig(): Promise<CustomerServiceConfig> {
  return requestJson<CustomerServiceConfig>("/api/admin/settings/customer-service");
}

export async function updateCustomerServiceConfig(input: CustomerServiceConfig): Promise<CustomerServiceConfig> {
  return requestJson<CustomerServiceConfig>("/api/admin/settings/customer-service", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function createModel(model: WatchModel): Promise<WatchModel> {
  return requestJson<WatchModel>("/api/admin/models", { method: "POST", body: JSON.stringify(model) });
}

export async function updateModel(model: WatchModel): Promise<WatchModel> {
  return requestJson<WatchModel>(`/api/admin/models/${encodeURIComponent(model.id)}`, {
    method: "PUT",
    body: JSON.stringify(model),
  });
}

export async function deleteModel(id: string): Promise<void> {
  await requestJson<void>(`/api/admin/models/${encodeURIComponent(id)}`, { method: "DELETE" });
}
