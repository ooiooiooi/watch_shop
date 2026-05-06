import { useEffect, useMemo, useRef, useState } from "react";
import type { Brand, Product, ProductSku, SpecGroup, WatchModel } from "../catalog";
import * as api from "../api/adminApi";
import { createProduct, deleteProduct, updateProduct, useCatalog } from "../store/catalogStore";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ImageUpload } from "../components/ImageUpload";
import { uploadImage } from "../api/adminApi";
import { resolveMediaUrl } from "../utils/media";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

type ProductForm = {
  id: string;
  name: string;
  brand: string;
  model: string;
  reference: string;
  collection: string;
  image: string;
  images: string[];
  tag: string;
  category: string;
  description: string;
  status: "on" | "off";
  sortOrder: number;
  metaTitle: string;
  metaDescription: string;
  specGroups: { name: string; options: string }[];
  skus: {
    id: string;
    specs: Record<string, string>;
    price: string;
    originalPrice: string;
    stock: string;
    enabled: boolean;
  }[];
};

function toForm(p: Product): ProductForm {
  const groups = (p.specGroups ?? []).map((g) => ({ name: g.name, options: g.options.join(", ") }));
  const skus = (p.skus ?? []).map((s) => ({
    id: s.id,
    specs: s.specs,
    price: String(s.price),
    originalPrice: s.originalPrice == null ? "" : String(s.originalPrice),
    stock: String(s.stock),
    enabled: s.enabled,
  }));
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? "",
    model: p.model ?? "",
    reference: p.reference ?? "",
    collection: p.collection,
    image: p.image,
    images: p.images ?? [],
    tag: p.tag ?? "",
    category: p.category,
    description: p.description ?? "",
    status: p.status ?? "on",
    sortOrder: p.sortOrder ?? 0,
    metaTitle: p.metaTitle ?? "",
    metaDescription: p.metaDescription ?? "",
    specGroups: groups.length ? groups : [{ name: "Default", options: "Default" }],
    skus: skus.length
      ? skus
      : [
          {
            id: `${p.id}-default`,
            specs: { Default: "Default" },
            price: String(p.price),
            originalPrice: p.originalPrice == null ? "" : String(p.originalPrice),
            stock: "100",
            enabled: true,
          },
        ],
  };
}

function parseSpecGroups(groups: { name: string; options: string }[]): { ok: true; groups: SpecGroup[] } | { ok: false; message: string } {
  const parsed = groups
    .map((g) => ({
      name: g.name.trim(),
      options: g.options
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }))
    .filter((g) => g.name && g.options.length);

  if (parsed.length === 0) return { ok: false as const, message: "请至少配置 1 个规格组" };

  const names = parsed.map((g) => g.name);
  if (new Set(names).size !== names.length) return { ok: false as const, message: "规格组名称不能重复" };

  for (const g of parsed) {
    if (new Set(g.options).size !== g.options.length) return { ok: false as const, message: `规格「${g.name}」选项重复` };
  }

  return { ok: true as const, groups: parsed };
}

function skuKey(groups: SpecGroup[], specs: Record<string, string>) {
  return groups.map((g) => `${g.name}=${specs[g.name] ?? ""}`).join("|");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
}

function genSkuId(productId: string, groups: SpecGroup[], specs: Record<string, string>) {
  const parts = groups.map((g) => slugify(specs[g.name] ?? "x")).filter(Boolean);
  const suffix = parts.length ? parts.join("-") : "default";
  return `${productId}-${suffix}`;
}

function cartesian(groups: SpecGroup[]) {
  const combos: Record<string, string>[] = [];
  const walk = (idx: number, acc: Record<string, string>) => {
    if (idx >= groups.length) {
      combos.push(acc);
      return;
    }
    const g = groups[idx]!;
    for (const opt of g.options) {
      walk(idx + 1, { ...acc, [g.name]: opt });
    }
  };
  walk(0, {});
  return combos;
}

function deriveListPrices(skus: ProductSku[]) {
  const enabled = skus.filter((s) => s.enabled);
  const list = enabled.length ? enabled : skus;
  const minPrice = list.reduce((min, s) => (s.price < min ? s.price : min), list[0]!.price);
  const originalPrices = list.map((s) => s.originalPrice).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const minOriginal = originalPrices.length ? Math.min(...originalPrices) : undefined;
  const totalStock = list.reduce((sum, s) => sum + (Number.isFinite(s.stock) ? s.stock : 0), 0);
  return { minPrice, minOriginal, totalStock };
}

function normalizeHttpUrl(input: string): { ok: true; url: string } | { ok: false; message: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false as const, message: "图片 URL 不能为空" };
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(normalized);
    if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false as const, message: "只支持 http/https 图片链接" };
    return { ok: true as const, url: u.toString() };
  } catch {
    return { ok: false as const, message: "图片 URL 格式不正确" };
  }
}

export function ProductsPage() {
  const { categories, loading, error: loadError } = useCatalog();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "on" | "off">("all");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>({
    id: "",
    name: "",
    brand: "",
    model: "",
    reference: "",
    collection: "",
    image: "",
    images: [],
    tag: "",
    category: categories[0]?.id ?? "",
    description: "",
    status: "on",
    sortOrder: 0,
    metaTitle: "",
    metaDescription: "",
    specGroups: [{ name: "Default", options: "Default" }],
    skus: [
      { id: "new-default", specs: { Default: "Default" }, price: "", originalPrice: "", stock: "100", enabled: true },
    ],
  });

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<WatchModel[]>([]);

  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Product[]>([]);
  const [pageInput, setPageInput] = useState("1");
  const [confirm, setConfirm] = useState<null | { kind: "delete" | "toggle"; product: Product; nextStatus?: "on" | "off" }>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [detailImageUrl, setDetailImageUrl] = useState("");
  const [detailImageError, setDetailImageError] = useState<string | null>(null);
  const formErrorRef = useRef<HTMLDivElement | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [b, m] = await Promise.all([api.getBrands(), api.getModels()]);
        if (!alive) return;
        setBrands(b);
        setModels(m);
      } catch {
        if (!alive) return;
        setBrands([]);
        setModels([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setListLoading(true);
    });
    api
      .getProductsPage({
        q: query.trim() || undefined,
        category: categoryFilter,
        status: statusFilter,
        page,
        size: pageSize,
      })
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "加载失败";
        setError(msg);
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!alive) return;
        setListLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [categoryFilter, page, pageSize, query, statusFilter]);

  async function refreshList(nextPage?: number) {
    const targetPage = nextPage ?? page;
    setListLoading(true);
    setError(null);
    try {
      const res = await api.getProductsPage({
        q: query.trim() || undefined,
        category: categoryFilter,
        status: statusFilter,
        page: targetPage,
        size: pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
      if (res.items.length === 0 && targetPage > 0 && res.total > 0) {
        setPage(targetPage - 1);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载失败";
      setError(msg);
      setItems([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }

  const dedupedBrands = useMemo(() => {
    const groups = new Map<string, { primary: Brand; all: Brand[] }>();
    for (const brand of brands) {
      const key = brand.name.trim().toLowerCase();
      const current = groups.get(key);
      if (!current) {
        groups.set(key, { primary: brand, all: [brand] });
        continue;
      }
      current.all.push(brand);
      const primaryScore = current.primary.id.startsWith("wc-") ? 1 : 0;
      const nextScore = brand.id.startsWith("wc-") ? 1 : 0;
      if (nextScore < primaryScore || (nextScore === primaryScore && brand.id.localeCompare(current.primary.id) < 0)) {
        current.primary = brand;
      }
    }
    return Array.from(groups.values())
      .map(({ primary, all }) => ({ ...primary, relatedIds: all.map((item) => item.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [brands]);

  const brandSelectValue = useMemo(() => {
    if (!form.brand) return "";
    const b = dedupedBrands.find((x) => x.name === form.brand);
    return b?.id ?? "";
  }, [dedupedBrands, form.brand]);

  const availableModels = useMemo(() => {
    if (!brandSelectValue) return [];
    const brand = dedupedBrands.find((item) => item.id === brandSelectValue);
    if (!brand) return [];
    return models
      .filter((m) => brand.relatedIds.includes(m.brandId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [models, dedupedBrands, brandSelectValue]);

  const modelSelectValue = useMemo(() => {
    if (!form.model) return "";
    const m = availableModels.find((x) => x.name === form.model);
    return m?.id ?? "";
  }, [availableModels, form.model]);

  const filtered = items;

  function showFormError(message: string) {
    setError(message);
    requestAnimationFrame(() => {
      formErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function openCreate() {
    setEditing(null);
    setForm({
      id: "",
      name: "",
      brand: "",
      model: "",
      reference: "",
      collection: "",
      image: "",
      images: [],
      tag: "",
      category: categories[0]?.id ?? "",
      description: "",
      status: "on",
      sortOrder: 0,
      metaTitle: "",
      metaDescription: "",
      specGroups: [{ name: "Default", options: "Default" }],
      skus: [
        { id: "new-default", specs: { Default: "Default" }, price: "", originalPrice: "", stock: "100", enabled: true },
      ],
    });
    setError(null);
    setDetailImageUrl("");
    setDetailImageError(null);
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm(toForm(product));
    setError(null);
    setDetailImageUrl("");
    setDetailImageError(null);
    setOpen(true);
  }

  function addDetailImage() {
    setDetailImageError(null);
    const parsed = normalizeHttpUrl(detailImageUrl);
    if (parsed.ok === false) return setDetailImageError(parsed.message);
    setForm((s) => {
      const exists = s.images.some((x) => x.trim() === parsed.url);
      if (exists) return s;
      return { ...s, images: [...s.images, parsed.url] };
    });
    setDetailImageUrl("");
  }

  function generateSkuTable() {
    setError(null);
    const parsed = parseSpecGroups(form.specGroups);
    if (parsed.ok === false) {
      setError(parsed.message);
      return;
    }

    const groups = parsed.groups;
    const combos = cartesian(groups);
    const existingByKey = new Map<string, ProductForm["skus"][number]>();
    for (const s of form.skus) {
      existingByKey.set(skuKey(groups, s.specs), s);
    }

    const next = combos.map((specs) => {
      const key = skuKey(groups, specs);
      const existing = existingByKey.get(key);
      return {
        id: existing?.id ?? genSkuId(form.id.trim() || "new", groups, specs),
        specs,
        price: existing?.price ?? form.skus[0]?.price ?? "",
        originalPrice: existing?.originalPrice ?? form.skus[0]?.originalPrice ?? "",
        stock: existing?.stock ?? "0",
        enabled: existing?.enabled ?? true,
      };
    });

    setForm((s) => ({ ...s, skus: next }));
  }

  async function save() {
    if (saveBusy) return;
    setError(null);

    const id = form.id.trim();
    const name = form.name.trim();
    const brand = form.brand.trim();
    const model = form.model.trim();
    const reference = form.reference.trim();
    const collection = form.collection.trim();
    const image = form.image.trim();
    const images = form.images;
    const tag = form.tag.trim();
    const category = form.category.trim();
    const description = form.description.trim();
    const status = form.status;
    const sortOrder = Number(form.sortOrder);
    const metaTitle = form.metaTitle.trim();
    const metaDescription = form.metaDescription.trim();

    if (!id) return showFormError("商品 ID 不能为空");
    if (!name) return showFormError("商品名称不能为空");
    if (!collection) return showFormError("系列（collection）不能为空");
    if (!category) return showFormError("分类不能为空");
    if (!categories.some((c) => c.id === category)) return showFormError("分类不存在，请先创建分类");
    if (!image) return showFormError("图片 URL 不能为空");

    const parsed = parseSpecGroups(form.specGroups);
    if (parsed.ok === false) return showFormError(parsed.message);

    const groups = parsed.groups;
    const skuList: ProductSku[] = form.skus.map((s) => {
      const price = Number(s.price);
      const stock = Number(s.stock);
      const original = s.originalPrice.trim() ? Number(s.originalPrice) : undefined;
      return {
        id: s.id.trim() || genSkuId(id, groups, s.specs),
        specs: s.specs,
        price,
        originalPrice: original,
        stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
        enabled: s.enabled,
      };
    });

    if (skuList.length === 0) return showFormError("请先生成并配置 SKU");
    if (skuList.some((s) => !Number.isFinite(s.price) || s.price <= 0)) return showFormError("SKU 价格必须为大于 0 的数字");
    if (skuList.some((s) => !Number.isFinite(s.stock) || s.stock < 0)) return showFormError("SKU 库存必须为大于等于 0 的数字");

    const derived = deriveListPrices(skuList);
    const priceNum = derived.minPrice;
    const originalPriceNum = derived.minOriginal;

    setSaveBusy(true);

    if (!editing) {
      const next: Product = {
        id,
        name,
        brand: brand || undefined,
        model: model || undefined,
        brandId: brandSelectValue || undefined,
        modelId: modelSelectValue || undefined,
        reference: reference || undefined,
        collection,
        price: priceNum,
        originalPrice: originalPriceNum,
        image,
        images: images.length ? images : undefined,
        tag: tag || undefined,
      category,
      description: description || undefined,
      status,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      metaTitle,
      metaDescription,
      specGroups: groups,
      skus: skuList,
    };
    try {
      await createProduct(next);
        setOpen(false);
        setPage(0);
        await refreshList(0);
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "保存失败";
        showFormError(msg);
        return;
      } finally {
        setSaveBusy(false);
      }
    }

    if (id !== editing.id) return showFormError("编辑时不允许修改商品 ID");

    const next: Product = {
      id,
      name,
      brand: brand || undefined,
      model: model || undefined,
      brandId: brandSelectValue || undefined,
      modelId: modelSelectValue || undefined,
      reference: reference || undefined,
      collection,
      price: priceNum,
      originalPrice: originalPriceNum,
      image,
      images: images.length ? images : undefined,
      tag: tag || undefined,
      category,
      description: description || undefined,
      status,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      metaTitle,
      metaDescription,
      specGroups: groups,
      skus: skuList,
    };
    try {
      await updateProduct(next);
      setOpen(false);
      await refreshList();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存失败";
      showFormError(msg);
    } finally {
      setSaveBusy(false);
    }
  }

  async function remove(product: Product) {
    setError(null);
    setConfirm({ kind: "delete", product });
  }

  async function toggleStatus(product: Product) {
    const nextStatus = (product.status ?? "on") === "on" ? "off" : "on";
    setConfirm({ kind: "toggle", product, nextStatus });
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt("复制下面内容：", value);
    }
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={confirm != null}
        title={
          confirm?.kind === "delete"
            ? "确认删除"
            : confirm?.nextStatus === "off"
              ? "确认下架"
              : "确认上架"
        }
        description={
          confirm ? (
            <div className="space-y-2">
              <div className="text-[var(--text)]">
                {confirm.product.name}（{confirm.product.id}）
              </div>
              <div>
                {confirm.kind === "delete"
                  ? "删除后无法恢复。"
                  : confirm.nextStatus === "off"
                    ? "下架后前台将不再展示该商品。"
                    : "上架后前台可展示并被搜索到。"}
              </div>
            </div>
          ) : null
        }
        cancelText="取消"
        confirmText={confirmBusy ? "处理中..." : "确认"}
        confirmVariant={confirm?.kind === "delete" || confirm?.nextStatus === "off" ? "danger" : "primary"}
        onCancel={() => {
          if (confirmBusy) return;
          setConfirm(null);
        }}
        onConfirm={async () => {
          if (!confirm || confirmBusy) return;
          setConfirmBusy(true);
          try {
            if (confirm.kind === "delete") {
              await deleteProduct(confirm.product.id);
              setConfirm(null);
              window.location.reload();
              return;
            } else {
              await updateProduct({ ...confirm.product, status: confirm.nextStatus ?? "on" });
            }
            await refreshList();
            setConfirm(null);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "操作失败";
            setError(msg);
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">商品管理</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            字段：上/下架 + 规格组 + SKU（价格/原价/库存/启用）
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <input
            className="admin-input w-full sm:w-[280px]"
            placeholder="搜索（id / name / brand / model / ref / collection / tag）"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            className="admin-input w-full sm:w-auto"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">全部分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>
          <select
            className="admin-input w-full sm:w-auto"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "on" | "off");
              setPage(0);
            }}
          >
            <option value="all">全部状态</option>
            <option value="on">上架</option>
            <option value="off">下架</option>
          </select>
          <button className="admin-btn admin-btn-primary w-full sm:w-auto" onClick={openCreate}>
            新增商品
          </button>
        </div>
      </div>

      {(loadError || error) && <div className="text-sm text-red-300">{loadError || error}</div>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-[var(--muted)]">
        <div>
          共 {total.toLocaleString()} 条 · 第 {(page + 1).toLocaleString()} 页 / {totalPages.toLocaleString()} 页
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
          <select
            className="admin-input h-9"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 30, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}/页
              </option>
            ))}
          </select>
          <input
            className="admin-input h-9 w-full sm:w-28"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const n = Number(pageInput);
              if (!Number.isFinite(n)) return;
              const next = Math.min(Math.max(1, Math.floor(n)), totalPages) - 1;
              setPage(next);
            }}
            placeholder="跳页"
          />
          <button className="admin-btn admin-btn-ghost h-9 px-3" disabled={page <= 0 || listLoading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            上一页
          </button>
          <button
            className="admin-btn admin-btn-ghost h-9 px-3"
            disabled={listLoading || (page + 1) * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      </div>

      <div className="md:hidden grid gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl admin-panel p-4">
            <div className="flex items-start gap-3">
              <img src={resolveMediaUrl(p.image)} alt={p.name} className="h-14 w-14 rounded border border-[var(--line)] object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" title={p.name}>
                      {p.name}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)] font-mono">
                      ID: {p.id} · {p.category}
                    </div>
                  </div>
                  {(p.status ?? "on") === "on" ? (
                    <span className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[var(--gold-2)] shrink-0">
                      <span className="h-2 w-2 rounded-full bg-[var(--gold)]" />
                      上架
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[var(--muted)] shrink-0">
                      <span className="h-2 w-2 rounded-full bg-[var(--line)]" />
                      下架
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="border border-[var(--line)] bg-[var(--panel-2)] rounded-md px-3 py-2">
                    <div className="text-[11px] text-[var(--muted)] tracking-[0.2em] uppercase">价格（起）</div>
                    <div className="mt-1 text-sm">${p.price.toLocaleString()}</div>
                  </div>
                  <div className="border border-[var(--line)] bg-[var(--panel-2)] rounded-md px-3 py-2">
                    <div className="text-[11px] text-[var(--muted)] tracking-[0.2em] uppercase">库存</div>
                    <div className="mt-1 text-sm">
                      {(p.skus ?? []).reduce((sum, s) => sum + (s.enabled ? s.stock : 0), 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs">
                  <a className="text-[var(--gold-2)] hover:underline" href={resolveMediaUrl(p.image)} target="_blank" rel="noreferrer">
                    打开图片
                  </a>
                  <button className="text-[var(--muted)] hover:text-[var(--text)]" onClick={() => copyText(p.image)}>
                    复制图片链接
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button className="admin-btn admin-btn-ghost h-10 px-3" onClick={() => openEdit(p)}>
                编辑
              </button>
              <button className="admin-btn admin-btn-ghost h-10 px-3" onClick={() => toggleStatus(p)}>
                {(p.status ?? "on") === "on" ? "下架" : "上架"}
              </button>
              <button className="admin-btn admin-btn-danger h-10 px-3" onClick={() => remove(p)}>
                删除
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-xl admin-panel px-4 py-10 text-center text-[var(--muted)]">
            {loading || listLoading ? "加载中..." : "暂无数据"}
          </div>
        )}
      </div>

      <div className="hidden md:block rounded-xl admin-panel overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left w-[80px]">ID</th>
              <th className="px-4 py-3 text-left w-[260px]">名称</th>
              <th className="px-4 py-3 text-left w-[110px]">状态</th>
              <th className="px-4 py-3 text-left w-[120px]">分类</th>
              <th className="px-4 py-3 text-left w-[140px]">价格（起）</th>
              <th className="px-4 py-3 text-left w-[120px]">库存</th>
              <th className="px-4 py-3 text-left w-[140px]">图片</th>
              <th className="px-4 py-3 text-right w-[220px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                <td className="px-4 py-3 truncate" title={p.name}>
                  {p.name}
                </td>
                <td className="px-4 py-3">
                  {(p.status ?? "on") === "on" ? (
                    <span className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[var(--gold-2)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--gold)]" />
                      上架
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[var(--muted)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--line)]" />
                      下架
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.category}</td>
                <td className="px-4 py-3">${p.price.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {(p.skus ?? []).reduce((sum, s) => sum + (s.enabled ? s.stock : 0), 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={resolveMediaUrl(p.image)} alt={p.name} className="h-10 w-10 rounded border border-[var(--line)] object-cover" />
                    <div className="flex flex-col gap-1">
                      <a className="text-xs text-[var(--gold-2)] hover:underline" href={resolveMediaUrl(p.image)} target="_blank" rel="noreferrer">
                        打开
                      </a>
                      <button className="text-left text-xs text-[var(--muted)] hover:text-[var(--text)]" onClick={() => copyText(p.image)}>
                        复制链接
                      </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2 justify-end">
                    <button className="admin-btn admin-btn-ghost h-9 px-3" onClick={() => openEdit(p)}>
                      编辑
                    </button>
                    <button className="admin-btn admin-btn-ghost h-9 px-3" onClick={() => toggleStatus(p)}>
                      {(p.status ?? "on") === "on" ? "下架" : "上架"}
                    </button>
                    <button className="admin-btn admin-btn-danger h-9 px-3" onClick={() => remove(p)}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr className="border-t border-[var(--line)]">
                <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={8}>
                  {loading || listLoading ? "加载中..." : "暂无数据"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? "编辑商品" : "新增商品"}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="admin-btn admin-btn-ghost" onClick={() => setOpen(false)} disabled={saveBusy}>
              取消
            </button>
            <button className="admin-btn admin-btn-primary" onClick={save} disabled={saveBusy}>
              {saveBusy ? "保存中..." : "保存"}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          {error ? (
            <div
              ref={formErrorRef}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              保存失败：{error}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">ID</label>
              <input
                className="admin-input w-full disabled:bg-[var(--panel-2)]"
                value={form.id}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">名称</label>
              <input
                className="admin-input w-full"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">品牌（brand，可选）</label>
              <select
                className="admin-input w-full"
                value={brandSelectValue}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    setForm((s) => ({ ...s, brand: "", model: "" }));
                    return;
                  }
                  const b = dedupedBrands.find((x) => x.id === id);
                  setForm((s) => ({ ...s, brand: b?.name ?? "", model: "" }));
                }}
              >
                <option value="">不设置</option>
                {dedupedBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-[var(--muted)]">下拉已按品牌名去重，只显示一个可选品牌。</div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">型号（model，可选）</label>
              <select
                className="admin-input w-full"
                value={modelSelectValue}
                disabled={!brandSelectValue || availableModels.length === 0}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    setForm((s) => ({ ...s, model: "" }));
                    return;
                  }
                  const m = availableModels.find((x) => x.id === id);
                  setForm((s) => ({ ...s, model: m?.name ?? "" }));
                }}
              >
                <option value="">不设置</option>
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">参考号（ref，可选）</label>
              <input
                className="admin-input w-full"
                value={form.reference}
                onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))}
                placeholder="例如：116505"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">系列（collection）</label>
              <input
                className="admin-input w-full"
                value={form.collection}
                onChange={(e) => setForm((s) => ({ ...s, collection: e.target.value }))}
              />
              <div className="text-xs text-[var(--muted)]">前台会显示在商品卡片副标题、详情页标题上方，以及参数里的 Collection。</div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">分类（category）</label>
              <select
                className="admin-input w-full"
                value={form.category}
                onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">状态</label>
              <select
                className="admin-input w-full"
                value={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as "on" | "off" }))}
              >
                <option value="on">上架</option>
                <option value="off">下架</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">排序权重（数字小靠前）</label>
              <input
                className="admin-input w-full"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((s) => ({ ...s, sortOrder: parseInt(e.target.value) || 0 }))}
                placeholder="默认 0"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">SEO 标题 (metaTitle)</label>
              <input
                className="admin-input w-full"
                value={form.metaTitle}
                onChange={(e) => setForm((s) => ({ ...s, metaTitle: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">SEO 描述 (metaDescription)</label>
              <input
                className="admin-input w-full"
                value={form.metaDescription}
                onChange={(e) => setForm((s) => ({ ...s, metaDescription: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">标签（tag，可选）</label>
              <input
                className="admin-input w-full"
                value={form.tag}
                onChange={(e) => setForm((s) => ({ ...s, tag: e.target.value }))}
                placeholder="例如：Best Seller"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium text-[var(--muted)]">图片 URL（image）</label>
              <ImageUpload 
                value={form.image} 
                onChange={(url) => setForm((s) => ({ ...s, image: url }))} 
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-3">
              <div>
                <div className="text-sm font-semibold text-[var(--gold-2)]">详情图片（images）</div>
                <div className="mt-1 text-xs text-[var(--muted)]">添加商品详情图片，可点击"设为封面"将任意图片设为商品封面图</div>
                <div className="mt-1 text-xs text-[var(--muted)] font-mono">当前数量：{form.images.length}</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <input
                  className="admin-input h-9 w-full sm:w-[260px]"
                  value={detailImageUrl}
                  onChange={(e) => setDetailImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                <button className="admin-btn admin-btn-ghost h-9 px-3 w-full sm:w-auto" type="button" onClick={addDetailImage}>
                  添加链接
                </button>
                <label className="admin-btn admin-btn-primary h-9 px-3 w-full sm:w-auto cursor-pointer flex items-center justify-center">
                  上传图片
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setDetailImageError(null);
                      try {
                        const url = await uploadImage(file);
                        setForm((s) => {
                          if (s.images.includes(url)) return s;
                          return { ...s, images: [...s.images, url] };
                        });
                      } catch (err) {
                        setDetailImageError(err instanceof Error ? err.message : "上传失败");
                      } finally {
                        e.target.value = "";
                      }
                    }} 
                  />
                </label>
              </div>
            </div>
            {detailImageError && <div className="mb-3 text-sm text-red-300">{detailImageError}</div>}

            {form.images.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)] text-sm">
                暂无详情图片，点击上方按钮添加
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg border border-[var(--line)] bg-[var(--panel-2)] overflow-hidden">
                    <img src={resolveMediaUrl(img)} alt={`detail-${idx}`} className="h-32 w-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        className="px-2 py-1 rounded bg-primary text-xs text-primary-foreground hover:bg-primary/90 whitespace-nowrap shrink-0"
                        onClick={() => {
                          setForm((s) => ({ ...s, image: img }));
                        }}
                        title="设为封面图"
                      >
                        设为封面
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-red-600 text-xs text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                        onClick={() => {
                          setForm((s) => ({ ...s, images: s.images.filter((_, i) => i !== idx) }));
                        }}
                        title="删除图片"
                      >
                        删除
                      </button>
                    </div>
                    {form.image === img && (
                      <div className="absolute top-1 left-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                        封面
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">描述（description，可选）</label>
            <div className="bg-[var(--panel)] border border-[var(--line)] rounded-md overflow-hidden">
              <ReactQuill 
                theme="snow"
                value={form.description}
                onChange={(value) => setForm((s) => ({ ...s, description: value }))}
                className="min-h-[160px] custom-quill"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--gold-2)]">规格配置</div>
                <div className="mt-1 text-xs text-[var(--muted)]">配置规格组（如：颜色、尺码），并生成 SKU</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="admin-btn admin-btn-ghost h-9 px-3"
                  onClick={() => setForm((s) => ({ ...s, specGroups: [...s.specGroups, { name: "", options: "" }] }))}
                >
                  新增规格组
                </button>
                <button className="admin-btn admin-btn-primary h-9 px-3" onClick={generateSkuTable}>
                  生成 SKU
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {form.specGroups.map((g, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr_120px] items-end min-w-0">
                  <div className="grid gap-1">
                    <label className="text-xs text-[var(--muted)]">规格名</label>
                    <input
                      className="admin-input w-full"
                      value={g.name}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          specGroups: s.specGroups.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                        }))
                      }
                      placeholder="例如：Color"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs text-[var(--muted)]">选项（逗号分隔）</label>
                    <input
                      className="admin-input w-full"
                      value={g.options}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          specGroups: s.specGroups.map((x, i) => (i === idx ? { ...x, options: e.target.value } : x)),
                        }))
                      }
                      placeholder="例如：Black, Silver"
                    />
                  </div>
                  <button
                    className="admin-btn admin-btn-danger h-9 px-3 w-full md:w-auto"
                    onClick={() => setForm((s) => ({ ...s, specGroups: s.specGroups.filter((_, i) => i !== idx) }))}
                    disabled={form.specGroups.length <= 1}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold text-[var(--gold-2)]">SKU 列表</div>
                <div className="text-xs text-[var(--muted)]">可编辑：价格 / 原价 / 库存 / 启用</div>
              </div>
              
              {form.skus.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border border-[var(--line)] bg-[var(--panel-2)] flex flex-wrap items-end gap-3">
                  <div className="grid gap-1 flex-1 min-w-[120px]">
                    <label className="text-xs text-[var(--muted)]">批量价格</label>
                    <input id="batch-price" className="admin-input w-full h-9" placeholder="留空不改" />
                  </div>
                  <div className="grid gap-1 flex-1 min-w-[120px]">
                    <label className="text-xs text-[var(--muted)]">批量原价</label>
                    <input id="batch-orig-price" className="admin-input w-full h-9" placeholder="留空不改" />
                  </div>
                  <div className="grid gap-1 flex-1 min-w-[120px]">
                    <label className="text-xs text-[var(--muted)]">批量库存</label>
                    <input id="batch-stock" className="admin-input w-full h-9" placeholder="留空不改" />
                  </div>
                  <button 
                    type="button"
                    className="admin-btn admin-btn-ghost h-9 px-4 shrink-0"
                    onClick={() => {
                      const bp = (document.getElementById("batch-price") as HTMLInputElement).value.trim();
                      const bop = (document.getElementById("batch-orig-price") as HTMLInputElement).value.trim();
                      const bs = (document.getElementById("batch-stock") as HTMLInputElement).value.trim();
                      if (!bp && !bop && !bs) return;
                      setForm(s => ({
                        ...s,
                        skus: s.skus.map(sku => ({
                          ...sku,
                          price: bp || sku.price,
                          originalPrice: bop || sku.originalPrice,
                          stock: bs || sku.stock
                        }))
                      }));
                    }}
                  >
                    应用批量填充
                  </button>
                </div>
              )}

              <div className="mt-3 grid gap-3">
                {form.skus.map((s, idx) => (
                  <div key={s.id + idx} className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-[var(--muted)] truncate" title={s.id}>
                          {s.id}
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {Object.entries(s.specs)
                            .map(([k, v]) => `${k}:${v}`)
                            .join(" · ")}
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-[var(--muted)]">
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              skus: f.skus.map((x, i) => (i === idx ? { ...x, enabled: e.target.checked } : x)),
                            }))
                          }
                        />
                        启用
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="grid gap-1">
                        <div className="text-xs text-[var(--muted)]">价格</div>
                        <input
                          className="admin-input w-full h-9"
                          value={s.price}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              skus: f.skus.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)),
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <div className="text-xs text-[var(--muted)]">原价</div>
                        <input
                          className="admin-input w-full h-9"
                          value={s.originalPrice}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              skus: f.skus.map((x, i) => (i === idx ? { ...x, originalPrice: e.target.value } : x)),
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <div className="text-xs text-[var(--muted)]">库存</div>
                        <input
                          className="admin-input w-full h-9"
                          value={s.stock}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              skus: f.skus.map((x, i) => (i === idx ? { ...x, stock: e.target.value } : x)),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {form.skus.length === 0 && (
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-4 py-8 text-center text-[var(--muted)]">
                    暂无 SKU，请先生成
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
      </Modal>
    </div>
  );
}
