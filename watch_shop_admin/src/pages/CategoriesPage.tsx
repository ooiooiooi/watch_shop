import { useMemo, useState } from "react";
import type { Category } from "../catalog";
import { createCategory, deleteCategory, updateCategory, useCatalog } from "../store/catalogStore";
import { Modal } from "../components/Modal";
import { ImageUpload } from "../components/ImageUpload";
import { resolveMediaUrl } from "../utils/media";

type CategoryForm = {
  id: string;
  name: string;
  image: string;
};

export function CategoriesPage() {
  const { categories, products, loading, error: loadError } = useCatalog();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>({ id: "", name: "", image: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [categories, query]);


  function openCreate() {
    setEditing(null);
    setForm({ id: "", name: "", image: "" });
    setError(null);
    setOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm({ id: category.id, name: category.name, image: category.image });
    setError(null);
    setOpen(true);
  }

  async function save() {
    setError(null);
    const id = form.id.trim();
    const name = form.name.trim();
    const image = form.image.trim();
    if (!id) return setError("分类 ID 不能为空");
    if (!name) return setError("分类名称不能为空");
    if (!image) return setError("分类图片不能为空");

    try {
      if (!editing) {
        if (categories.some((c) => c.id === id)) return setError("分类 ID 已存在");
        await createCategory({ id, name, image });
        setOpen(false);
        return;
      }

      if (id !== editing.id) return setError("编辑时不允许修改分类 ID");
      await updateCategory({ id, name, image });
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存失败";
      setError(msg);
    }
  }

  async function remove(category: Category) {
    setError(null);
    if (products.some((p) => p.category === category.id)) {
      setError(`分类「${category.name}」下仍有商品，无法删除`);
      return;
    }
    if (!window.confirm(`确认删除分类：${category.name}（${category.id}）？`)) return;
    try {
      await deleteCategory(category.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "删除失败";
      setError(msg);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">分类管理</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">字段：id / name / image</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <input
            className="admin-input w-full sm:w-[260px]"
            placeholder="搜索（id / name）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="admin-btn admin-btn-primary" onClick={openCreate}>
            新增分类
          </button>
        </div>
      </div>

      {(loadError || error) && <div className="text-sm text-red-300">{loadError || error}</div>}

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
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={resolveMediaUrl(c.image)} alt={c.name} className="h-10 w-10 rounded border border-[var(--line)] object-cover" />
                    <div className="text-xs text-[var(--muted)] truncate max-w-[520px]">{c.image}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button className="admin-btn admin-btn-ghost h-9 px-3" onClick={() => openEdit(c)}>
                      编辑
                    </button>
                    <button className="admin-btn admin-btn-danger h-9 px-3" onClick={() => remove(c)}>
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
        title={editing ? "编辑分类" : "新增分类"}
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
              placeholder="例如：classic"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">名称</label>
            <input
              className="admin-input w-full"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="例如：Classic"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[var(--muted)]">图片 URL</label>
            <ImageUpload 
              value={form.image} 
              onChange={(url) => setForm((s) => ({ ...s, image: url }))} 
            />
          </div>
        </div>
        {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
      </Modal>
    </div>
  );
}
