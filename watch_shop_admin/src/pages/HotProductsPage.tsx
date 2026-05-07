import { useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, FlameIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { Brand, Product } from "../catalog";
import * as api from "../api/adminApi";
import { resolveMediaUrl } from "../utils/media";

type DedupedBrand = Brand & { relatedIds: string[] };

function dedupeBrands(brands: Brand[]): DedupedBrand[] {
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
}

export function HotProductsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brands, setBrands] = useState<DedupedBrand[]>([]);
  const [config, setConfig] = useState<api.HotProductsConfig>({ brands: [] });
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [brandToAdd, setBrandToAdd] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [search, setSearch] = useState("");
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availablePage, setAvailablePage] = useState(0);
  const [availablePageSize] = useState(12);
  const [availableTotal, setAvailableTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([api.getHotProductsConfig(), api.getBrands()])
      .then(([hot, allBrands]) => {
        if (!alive) return;
        const deduped = dedupeBrands(allBrands);
        setBrands(deduped);
        setConfig({ brands: hot.brands ?? [] });
        setSelectedBrandId(hot.brands?.[0]?.brandId ?? "");
        setBrandToAdd(deduped[0]?.id ?? "");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedGroup = useMemo(
    () => config.brands.find((item) => item.brandId === selectedBrandId) ?? null,
    [config.brands, selectedBrandId],
  );

  const selectedBrandMeta = useMemo(
    () => brands.find((item) => item.id === selectedBrandId) ?? null,
    [brands, selectedBrandId],
  );

  const filteredBrands = useMemo(() => {
    const keyword = brandSearch.trim().toLowerCase();
    if (!keyword) return brands;
    return brands.filter((brand) => brand.name.toLowerCase().includes(keyword) || brand.id.toLowerCase().includes(keyword));
  }, [brandSearch, brands]);

  useEffect(() => {
    if (selectedGroup) return;
    setSelectedBrandId(config.brands[0]?.brandId ?? "");
  }, [config.brands, selectedGroup]);

  useEffect(() => {
    if (!filteredBrands.length) return;
    if (filteredBrands.some((item) => item.id === brandToAdd)) return;
    setBrandToAdd(filteredBrands[0]?.id ?? "");
  }, [brandToAdd, filteredBrands]);

  useEffect(() => {
    setAvailablePage(0);
  }, [search, selectedBrandId]);

  useEffect(() => {
    let alive = true;
    if (!selectedGroup) {
      setAvailableProducts([]);
      setAvailableTotal(0);
      return;
    }
    setAvailableLoading(true);
    api
      .getProductsPage({
        brand: selectedBrandMeta?.name ?? selectedGroup.brandName,
        status: "on",
        q: search.trim() || undefined,
        page: availablePage,
        size: availablePageSize,
      })
      .then((res) => {
        if (!alive) return;
        setAvailableProducts(res.items);
        setAvailableTotal(res.total);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "加载品牌商品失败");
        setAvailableProducts([]);
        setAvailableTotal(0);
      })
      .finally(() => {
        if (!alive) return;
        setAvailableLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [availablePage, availablePageSize, search, selectedBrandMeta, selectedGroup]);

  const availablePageCount = Math.max(1, Math.ceil(availableTotal / availablePageSize));
  const canGoPrev = availablePage > 0;
  const canGoNext = availablePage + 1 < availablePageCount;

  function selectBrand(brandId: string) {
    setSelectedBrandId(brandId);
    setSearch("");
    setAvailablePage(0);
    setAvailableProducts([]);
    setAvailableTotal(0);
    setError(null);
  }

  function addBrand() {
    const brand = brands.find((item) => item.id === brandToAdd);
    if (!brand) return;
    if (config.brands.some((item) => item.brandId === brand.id)) {
      selectBrand(brand.id);
      return;
    }
    const next = {
      brandId: brand.id,
      brandName: brand.name,
      productIds: [],
      products: [],
    };
    setConfig((prev) => ({ brands: [...prev.brands, next] }));
    selectBrand(brand.id);
  }

  function removeBrand(brandId: string) {
    setConfig((prev) => ({ brands: prev.brands.filter((item) => item.brandId !== brandId) }));
  }

  function clearAll() {
    setConfig({ brands: [] });
    setSelectedBrandId("");
    setSearch("");
  }

  function addProduct(product: Product) {
    if (!selectedGroup) return;
    setConfig((prev) => ({
      brands: prev.brands.map((group) =>
        group.brandId !== selectedGroup.brandId
          ? group
          : {
              ...group,
              productIds: group.productIds.includes(product.id) ? group.productIds : [...group.productIds, product.id],
              products: group.products?.some((item) => item.id === product.id) ? group.products : [...(group.products ?? []), product],
            },
      ),
    }));
  }

  function removeProduct(productId: string) {
    if (!selectedGroup) return;
    setConfig((prev) => ({
      brands: prev.brands.map((group) =>
        group.brandId !== selectedGroup.brandId
          ? group
          : {
              ...group,
              productIds: group.productIds.filter((id) => id !== productId),
              products: (group.products ?? []).filter((item) => item.id !== productId),
            },
      ),
    }));
  }

  function moveProduct(productId: string, direction: -1 | 1) {
    if (!selectedGroup) return;
    setConfig((prev) => ({
      brands: prev.brands.map((group) => {
        if (group.brandId !== selectedGroup.brandId) return group;
        const index = group.productIds.indexOf(productId);
        const nextIndex = index + direction;
        if (index < 0 || nextIndex < 0 || nextIndex >= group.productIds.length) return group;
        const nextIds = [...group.productIds];
        [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
        const productsById = new Map((group.products ?? []).map((item) => [item.id, item] as const));
        return {
          ...group,
          productIds: nextIds,
          products: nextIds.map((id) => productsById.get(id)).filter(Boolean) as Product[],
        };
      }),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = await api.updateHotProductsConfig({
        brands: config.brands.map((group) => ({
          brandId: group.brandId,
          brandName: group.brandName,
          productIds: group.productIds,
          products: [],
        })),
      });
      setConfig(next);
      setSelectedBrandId(next.brands[0]?.brandId ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">热门商品</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">按品牌配置首页热门商品，前台支持品牌切换展示。</p>
        </div>
        <button className="admin-btn admin-btn-primary h-10 px-4" onClick={save} disabled={loading || saving}>
          {saving ? "保存中..." : "保存并发布"}
        </button>
      </div>

      {error && <div className="text-sm text-red-300">{error}</div>}

      <div className="rounded-xl admin-panel p-5 space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {config.brands.map((group) => (
              <button
                key={group.brandId}
                className={[
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  selectedBrandId === group.brandId
                    ? "bg-[linear-gradient(180deg,var(--gold-2),var(--gold))] text-[#14110a]"
                    : "bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--text)]",
                ].join(" ")}
                onClick={() => selectBrand(group.brandId)}
              >
                {group.brandName}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
            <input
              className="admin-input h-10 w-full sm:min-w-[200px] xl:w-auto"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="搜索品牌名 / ID"
              disabled={loading}
            />
            <select className="admin-input h-10 w-full sm:min-w-[220px] xl:w-auto" value={brandToAdd} onChange={(e) => setBrandToAdd(e.target.value)} disabled={loading || filteredBrands.length === 0}>
              {filteredBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <button className="admin-btn admin-btn-ghost h-10 px-4" onClick={addBrand} disabled={!brandToAdd || loading || filteredBrands.length === 0}>
              <PlusIcon size={16} />
              添加品牌
            </button>
            <button className="admin-btn admin-btn-danger h-10 px-4" onClick={clearAll} disabled={loading || config.brands.length === 0}>
              清空全部
            </button>
          </div>
        </div>

        {!selectedGroup ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--muted)]">
            先添加一个品牌，再为该品牌选择热门商品。
          </div>
        ) : (
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div key={selectedBrandId} className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--gold-2)]">已选商品</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{selectedGroup.brandName} · 最多 12 个，前面的排前面展示</div>
                </div>
                <button className="admin-btn admin-btn-danger h-9 px-3" onClick={() => removeBrand(selectedGroup.brandId)}>
                  移除品牌
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {(selectedGroup.products ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--line)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                    这个品牌还没有配置热门商品。
                  </div>
                ) : (
                  (selectedGroup.products ?? []).map((product, index) => (
                    <div key={product.id} className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                        <img src={resolveMediaUrl(product.image)} alt={product.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--panel-2)] px-2 py-1 text-[11px] tracking-[0.2em] uppercase text-[var(--gold-2)]">
                              <FlameIcon size={12} />
                              #{index + 1}
                            </div>
                            <div className="mt-2 truncate text-sm font-semibold text-[var(--text)]" title={product.name}>
                              {product.name}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted)]">{product.id}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-[var(--gold-2)]">${product.price.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button className="admin-btn admin-btn-ghost h-8 px-3" onClick={() => moveProduct(product.id, -1)} disabled={index === 0}>
                            <ArrowUpIcon size={14} />
                          </button>
                          <button
                            className="admin-btn admin-btn-ghost h-8 px-3"
                            onClick={() => moveProduct(product.id, 1)}
                            disabled={index === (selectedGroup.products?.length ?? 0) - 1}
                          >
                            <ArrowDownIcon size={14} />
                          </button>
                          <button className="admin-btn admin-btn-danger h-8 px-3" onClick={() => removeProduct(product.id)}>
                            <Trash2Icon size={14} />
                          </button>
                        </div>
                      </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--gold-2)]">品牌商品库</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    从 {selectedGroup.brandName} 里挑选要放到首页的热门商品。当前已选 {(selectedGroup.products ?? []).length} / 12
                  </div>
                </div>
                <input
                  className="admin-input h-10 w-full sm:w-[220px] sm:min-w-[220px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索商品名 / ID"
                />
              </div>

              <div className="mt-4 grid gap-3">
                {availableLoading ? (
                  <div className="px-4 py-10 text-center text-sm text-[var(--muted)]">加载中...</div>
                ) : availableProducts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                    该品牌暂无可选商品。
                  </div>
                ) : (
                  availableProducts.map((product) => {
                    const selected = selectedGroup.productIds.includes(product.id);
                    return (
                      <div key={product.id} className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                          <img src={resolveMediaUrl(product.image)} alt={product.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-[var(--text)]" title={product.name}>
                              {product.name}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted)]">{product.id}</div>
                            <div className="mt-2 text-sm text-[var(--gold-2)]">${product.price.toLocaleString()}</div>
                          </div>
                          <button
                            className={selected ? "admin-btn admin-btn-ghost h-9 w-full shrink-0 px-3 opacity-60 sm:w-auto" : "admin-btn admin-btn-primary h-9 w-full shrink-0 px-3 sm:w-auto"}
                            onClick={() => addProduct(product)}
                            disabled={selected || selectedGroup.productIds.length >= 12}
                          >
                            {selected ? "已添加" : selectedGroup.productIds.length >= 12 ? "已满 12 个" : "加入"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {!availableLoading && availableTotal > 0 ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    共 {availableTotal} 个商品，当前第 {availablePage + 1} / {availablePageCount} 页
                  </div>
                  <div className="flex gap-2">
                    <button className="admin-btn admin-btn-ghost h-9 px-3" onClick={() => setAvailablePage((p) => Math.max(0, p - 1))} disabled={!canGoPrev}>
                      上一页
                    </button>
                    <button className="admin-btn admin-btn-ghost h-9 px-3" onClick={() => setAvailablePage((p) => p + 1)} disabled={!canGoNext}>
                      下一页
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
