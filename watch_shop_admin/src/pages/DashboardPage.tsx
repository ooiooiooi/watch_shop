import { useCatalog } from "../store/catalogStore";

export function DashboardPage() {
  const { products, categories } = useCatalog();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">仪表盘</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">当前为纯前端本地数据（localStorage）</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl admin-panel p-5">
          <div className="text-sm text-[var(--muted)]">商品数量</div>
          <div className="mt-2 text-3xl font-semibold">{products.length}</div>
        </div>
        <div className="rounded-xl admin-panel p-5">
          <div className="text-sm text-[var(--muted)]">分类数量</div>
          <div className="mt-2 text-3xl font-semibold">{categories.length}</div>
        </div>
        <div className="rounded-xl admin-panel p-5">
          <div className="text-sm text-[var(--muted)]">登录账号</div>
          <div className="mt-2 text-lg font-medium">admin</div>
        </div>
      </div>
    </div>
  );
}
