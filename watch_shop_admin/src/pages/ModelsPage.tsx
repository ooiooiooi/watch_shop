import { useCallback, useEffect, useMemo, useState } from "react";
import type { Brand, WatchModel } from "../catalog";
import * as api from "../api/adminApi";
import { Modal } from "../components/Modal";
import { ImageUpload } from "../components/ImageUpload";
import { resolveMediaUrl } from "../utils/media";
import { normalizeTaxonomyError } from "../utils/taxonomyErrors";

type ModelForm = { id: string; brandId: string; name: string; image: string };

function slug(value: string) {
  const s = value.trim().toLowerCase();
  return s.replace(/[^a-z0-9]+/g, "-").replace(/(^-+)|(-+$)/g, "") || "x";
}

export function ModelsPage() {
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<WatchModel[]>([]);
  const [brandFilter, setBrandFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WatchModel | null>(null);
  const [form, setForm] = useState<ModelForm>({ id: "", brandId: "", name: "", image: "" });

  const refresh = useCallback(async () => {
    setPageError(null);
    setLoading(true);
    try {
      const [b, m] = await Promise.all([api.getBrands(), api.getModels()]);
      setBrands(b);
      setModels(m);
      if (brandFilter !== "all" && !b.some((x) => x.id === brandFilter)) setBrandFilter("all");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载失败";
      setPageError(msg);
    } finally {
      setLoading(false);
    }
  }, [brandFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredBrands = useMemo(() => {
    return [...brands].sort((a, b) => a.name.localeCompare(b.name));
  }, [brands]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = brandFilter === "all" ? models : models.filter((m) => m.brandId === brandFilter);
    list = [...list].sort((a, b) => (a.brandId + a.name).localeCompare(b.brandId + b.name));
    if (!q) return list;
    return list.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.brandId.toLowerCase().includes(q));
  }, [models, brandFilter, query]);

  function openCreate() {
    setEditing(null);
    setForm({ id: "", brandId: filteredBrands[0]?.id ?? "", name: "", image: "" });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(model: WatchModel) {
    setEditing(model);
    setForm({ id: model.id, brandId: model.brandId, name: model.name, image: model.image ?? "" });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    setFormError(null);
    const brandId = form.brandId.trim();
    const name = form.name.trim();
    const id = (form.id.trim() || slug(`${brandId}-${name}`)).trim();
    const image = form.image.trim();
    if (!brandId) return setFormError("请选择品牌");
    if (!name) return setFormError("型号名称不能为空");
    try {
      if (!editing) {
        await api.createModel({ id, brandId, name, image: image || undefined });
        setOpen(false);
        await refresh();
        return;
      }
      if (id !== editing.id) return setFormError("编辑时不允许修改型号 ID");
      await api.updateModel({ id, brandId, name, image: image || undefined });
      setOpen(false);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存失败";
      setFormError(normalizeTaxonomyError(msg, "model"));
    }
  }

  async function remove(model: WatchModel) {
    setPageError(null);
    if (!window.confirm(`确认删除型号：${model.name}（${model.id}）？`)) return;
    try {
      await api.deleteModel(model.id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "删除失败";
      setPageError(normalizeTaxonomyError(msg, "model"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">型号管理</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">字段：id / brandId / name / image（可选）</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <input
            className="admin-input w-full sm:w-[260px]"
            placeholder="搜索（id / brandId / name）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="admin-input w-full sm:w-auto" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="all">全部品牌</option>
            {filteredBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.id})
              </option>
            ))}
          </select>
          <button className="admin-btn admin-btn-primary w-full sm:w-auto" onClick={openCreate} disabled={filteredBrands.length === 0}>
            新增型号
          </button>
        </div>
      </div>

      {pageError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{pageError}</div>}

      <div className="rounded-xl admin-panel overflow-hidden">
        <div className="admin-scroll-x">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-[var(--panel-2)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-left w-[170px]">ID</th>
                <th className="px-4 py-3 text-left w-[150px]">品牌ID</th>
                <th className="px-4 py-3 text-left w-[240px]">名称</th>
                <th className="px-4 py-3 text-left">图片</th>
                <th className="px-4 py-3 text-right w-[180px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-mono text-xs">{m.id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.brandId}</td>
                  <td className="px-4 py-3">{m.name}</td>
                  <td className="px-4 py-3">
                    {m.image ? (
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={resolveMediaUrl(m.image)} alt={m.name} className="h-10 w-10 rounded border border-[var(--line)] object-cover" />
                        <div className="text-xs text-[var(--muted)] truncate max-w-[520px]">{m.image}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-[var(--muted)]">-</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button className="admin-btn admin-btn-ghost h-9 px-3" onClick={() => openEdit(m)}>
                        编辑
                      </button>
                      <button className="admin-btn admin-btn-danger h-9 px-3" onClick={() => remove(m)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr className="border-t border-[var(--line)]">
                  <td className="px-4 py-10 text-center text-[var(--muted)]" colSpan={5}>
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
        title={editing ? "编辑型号" : "新增型号"}
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
              placeholder="留空则按品牌+型号自动生成"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">品牌</label>
            <select className="admin-input w-full" value={form.brandId} onChange={(e) => setForm((s) => ({ ...s, brandId: e.target.value }))}>
              <option value="">请选择</option>
              {filteredBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.id})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">名称（前台 model 字段）</label>
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
