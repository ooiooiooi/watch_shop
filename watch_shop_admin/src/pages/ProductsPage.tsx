import { useMemo, useState } from "react";
import type { Product, ProductSku, SpecGroup } from "../catalog";
import { useCatalog, writeProducts } from "../store/catalogStore";
import { Modal } from "../components/Modal";

type ProductForm = {
  id: string;
  name: string;
  collection: string;
  image: string;
  tag: string;
  category: string;
  description: string;
  status: "on" | "off";
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
    collection: p.collection,
    image: p.image,
    tag: p.tag ?? "",
    category: p.category,
    description: p.description ?? "",
    status: p.status ?? "on",
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

  if (parsed.length === 0) return { ok: false, message: "请至少配置 1 个规格组" };

  const names = parsed.map((g) => g.name);
  if (new Set(names).size !== names.length) return { ok: false, message: "规格组名称不能重复" };

  for (const g of parsed) {
    if (new Set(g.options).size !== g.options.length) return { ok: false, message: `规格「${g.name}」选项重复` };
  }

  return { ok: true, groups: parsed };
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

export function ProductsPage() {
  const { products, categories } = useCatalog();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "on" | "off">("all");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>({
    id: "",
    name: "",
    collection: "",
    image: "",
    tag: "",
    category: categories[0]?.id ?? "",
    description: "",
    status: "on",
    specGroups: [{ name: "Default", options: "Default" }],
    skus: [
      { id: "new-default", specs: { Default: "Default" }, price: "", originalPrice: "", stock: "100", enabled: true },
    ],
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products;
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (statusFilter !== "all") list = list.filter((p) => (p.status ?? "on") === statusFilter);
    if (!q) return list;
    return list.filter((p) => {
      return (
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q) ||
        (p.tag ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, categoryFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      id: "",
      name: "",
      collection: "",
      image: "",
      tag: "",
      category: categories[0]?.id ?? "",
      description: "",
      status: "on",
      specGroups: [{ name: "Default", options: "Default" }],
      skus: [
        { id: "new-default", specs: { Default: "Default" }, price: "", originalPrice: "", stock: "100", enabled: true },
      ],
    });
    setError(null);
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm(toForm(product));
    setError(null);
    setOpen(true);
  }

  function generateSkuTable() {
    setError(null);
    const parsed = parseSpecGroups(form.specGroups);
    if (!parsed.ok) {
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

  function save() {
    setError(null);

    const id = form.id.trim();
    const name = form.name.trim();
    const collection = form.collection.trim();
    const image = form.image.trim();
    const tag = form.tag.trim();
    const category = form.category.trim();
    const description = form.description.trim();
    const status = form.status;

    if (!id) return setError("商品 ID 不能为空");
    if (!name) return setError("商品名称不能为空");
    if (!collection) return setError("系列（collection）不能为空");
    if (!category) return setError("分类不能为空");
    if (!categories.some((c) => c.id === category)) return setError("分类不存在，请先创建分类");
    if (!image) return setError("图片 URL 不能为空");

    const parsed = parseSpecGroups(form.specGroups);
    if (!parsed.ok) return setError(parsed.message);

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

    if (skuList.length === 0) return setError("请先生成并配置 SKU");
    if (skuList.some((s) => !Number.isFinite(s.price) || s.price <= 0)) return setError("SKU 价格必须为大于 0 的数字");
    if (skuList.some((s) => !Number.isFinite(s.stock) || s.stock < 0)) return setError("SKU 库存必须为大于等于 0 的数字");

    const derived = deriveListPrices(skuList);
    const priceNum = derived.minPrice;
    const originalPriceNum = derived.minOriginal;

    if (!editing) {
      if (products.some((p) => p.id === id)) return setError("商品 ID 已存在");
      const next: Product = {
        id,
        name,
        collection,
        price: priceNum,
        originalPrice: originalPriceNum,
        image,
        tag: tag || undefined,
        category,
        description: description || undefined,
        status,
        specGroups: groups,
        skus: skuList,
      };
      writeProducts([...products, next]);
      setOpen(false);
      return;
    }

    if (id !== editing.id) return setError("编辑时不允许修改商品 ID");

    const next: Product = {
      id,
      name,
      collection,
      price: priceNum,
      originalPrice: originalPriceNum,
      image,
      tag: tag || undefined,
      category,
      description: description || undefined,
      status,
      specGroups: groups,
      skus: skuList,
    };
    writeProducts(products.map((p) => (p.id === editing.id ? next : p)));
    setOpen(false);
  }

  function remove(product: Product) {
    setError(null);
    if (!window.confirm(`确认删除商品：${product.name}（${product.id}）？`)) return;
    writeProducts(products.filter((p) => p.id !== product.id));
  }

  function toggleStatus(product: Product) {
    const nextStatus = (product.status ?? "on") === "on" ? "off" : "on";
    const label = nextStatus === "on" ? "上架" : "下架";
    if (!window.confirm(`确认${label}商品：${product.name}（${product.id}）？`)) return;
    writeProducts(
      products.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
    );
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
            placeholder="搜索（id / name / collection / tag）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="admin-input w-full sm:w-auto"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
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
            onChange={(e) => setStatusFilter(e.target.value as "all" | "on" | "off")}
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

      {error && <div className="text-sm text-red-300">{error}</div>}

      <div className="md:hidden grid gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-xl admin-panel p-4">
            <div className="flex items-start gap-3">
              <img src={p.image} alt={p.name} className="h-14 w-14 rounded border border-[var(--line)] object-cover shrink-0" />
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
                  <a className="text-[var(--gold-2)] hover:underline" href={p.image} target="_blank" rel="noreferrer">
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
            暂无数据
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
                    <img src={p.image} alt={p.name} className="h-10 w-10 rounded border border-[var(--line)] object-cover" />
                    <div className="flex flex-col gap-1">
                      <a className="text-xs text-[var(--gold-2)] hover:underline" href={p.image} target="_blank" rel="noreferrer">
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
                  暂无数据
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
            <button className="admin-btn admin-btn-ghost" onClick={() => setOpen(false)}>
              取消
            </button>
            <button className="admin-btn admin-btn-primary" onClick={save}>
              保存
            </button>
          </>
        }
      >
        <div className="grid gap-4">
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
              <label className="text-sm font-medium text-[var(--muted)]">系列（collection）</label>
              <input
                className="admin-input w-full"
                value={form.collection}
                onChange={(e) => setForm((s) => ({ ...s, collection: e.target.value }))}
              />
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
              <label className="text-sm font-medium text-[var(--muted)]">标签（tag，可选）</label>
              <input
                className="admin-input w-full"
                value={form.tag}
                onChange={(e) => setForm((s) => ({ ...s, tag: e.target.value }))}
                placeholder="例如：Best Seller"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--muted)]">图片 URL（image）</label>
              <input
                className="admin-input w-full"
                value={form.image}
                onChange={(e) => setForm((s) => ({ ...s, image: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          {form.image.trim() && (
            <div className="rounded-md border border-[var(--line)] overflow-hidden bg-[var(--panel-2)]">
              <img src={form.image.trim()} alt="preview" className="h-[220px] w-full object-cover" />
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">描述（description，可选）</label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(199,166,106,0.2)]"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              rows={5}
            />
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
