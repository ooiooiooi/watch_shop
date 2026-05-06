import { useCallback, useEffect, useMemo, useState } from "react";
import type { Brand } from "../catalog";
import * as api from "../api/adminApi";
import { Modal } from "../components/Modal";
import { ImageUpload } from "../components/ImageUpload";
import { resolveMediaUrl } from "../utils/media";
import { normalizeTaxonomyError } from "../utils/taxonomyErrors";

type BrandForm = { id: string; name: string; image: string };

function slug(value: string) {
  const s = value.trim().toLowerCase();
  return s.replace(/[^a-z0-9]+/g, "-").replace(/(^-+)|(-+$)/g, "") || "x";
}

export function BrandsPage() {
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandForm>({ id: "", name: "", image: "" });

  const refresh = useCallback(async () => {
    setPageError(null);
    setLoading(true);
    try {
      const b = await api.getBrands();
      setBrands(b);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载失败";
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...brands].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((b) => b.id.toLowerCase().includes(q) || b.name.toLowerCase().includes(q));
  }, [brands, query]);

  function openCreate() {
    setEditing(null);
    setForm({ id: "", name: "", image: "" });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setForm({ id: brand.id, name: brand.name, image: brand.image ?? "" });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    setFormError(null);
    const name = form.name.trim();
    const id = (form.id.trim() || slug(name)).trim();
    const image = form.image.trim();
    if (!name) return setFormError("品牌名称不能为空");
    try {
      if (!editing) {
        await api.createBrand({ id, name, image: image || undefined });
        setOpen(false);
        await refresh();
        return;
      }
      if (id !== editing.id) return setFormError("编辑时不允许修改品牌 ID");
      await api.updateBrand({ id, name, image: image || undefined });
      setOpen(false);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存失败";
      setFormError(normalizeTaxonomyError(msg, "brand"));
    }
  }

  async function remove(brand: Brand) {
    setPageError(null);
    if (!window.confirm(`确认删除品牌：${brand.name}（${brand.id}）？`)) return;
    try {
      await api.deleteBrand(brand.id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "删除失败";
      setPageError(normalizeTaxonomyError(msg, "brand"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">品牌管理</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">字段：id / name / image（可选）</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <input
            className="admin-input w-full sm:w-[260px]"
            placeholder="搜索（id / name）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="admin-btn admin-btn-primary" onClick={openCreate}>
            新增品牌
          </button>
        </div>
      </div>

      {pageError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{pageError}</div>}

      <div className="rounded-xl admin-panel overflow-hidden">
        <div className="admin-scroll-x">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-left w-[180px]">ID</th>
                <th className="px-4 py-3 text-left w-[220px]">名称</th>
                <th className="px-4 py-3 text-left">图片</th>
                <th className="px-4 py-3 text-right w-[180px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-mono text-xs">{b.id}</td>
                  <td className="px-4 py-3">{b.name}</td>
                  <td className="px-4 py-3">
                    {b.image ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={resolveMediaUrl(b.image)} alt={b.name} className="h-10 w-10 rounded border border-[var(--line)] object-cover" />
                        <div className="text-xs text-[var(--muted)] truncate max-w-[520px]">{b.image}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--muted)]">-</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button className="admin-btn admin-btn-ghost h-9 px-3" onClick={() => openEdit(b)}>
                        编辑
                      </button>
                      <button className="admin-btn admin-btn-danger h-9 px-3" onClick={() => remove(b)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr className="border-t border-[var(--line)]">
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={4}>
                    {loading ? "加载中..." : "暂无数据"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title={editing ? "编辑品牌" : "新增品牌"}
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
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">ID</label>
            <input
              className="admin-input w-full disabled:bg-[var(--panel-2)]"
              value={form.id}
              disabled={Boolean(editing)}
              onChange={(e) => setForm((s) => ({ ...s, id: e.target.value }))}
              placeholder="留空则按名称自动生成"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">名称（前台 brand 字段）</label>
            <input className="admin-input w-full" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">图片 URL（可选）</label>
            <ImageUpload 
              value={form.image} 
              onChange={(url) => setForm((s) => ({ ...s, image: url }))} 
            />
          </div>
        </div>
        {formError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{formError}</div>}
      </Modal>
    </div>
  );
}
