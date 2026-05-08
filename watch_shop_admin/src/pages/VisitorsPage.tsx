import { useEffect, useMemo, useState } from "react";
import { ActivityIcon, GlobeIcon, MonitorIcon, SearchIcon, ShieldIcon } from "lucide-react";
import { getVisitorLogs, type VisitorLog } from "../api/adminApi";

const PAGE_SIZE = 20;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function summarizeDevice(userAgent: string | null) {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "未知设备";
  if (ua.includes("iphone")) return "iPhone / Safari";
  if (ua.includes("ipad")) return "iPad / Safari";
  if (ua.includes("android")) return "Android 设备";
  if (ua.includes("mac os")) return "Mac 桌面端";
  if (ua.includes("windows")) return "Windows 桌面端";
  if (ua.includes("linux")) return "Linux 设备";
  return "其他设备";
}

function formatEventType(type: string | null) {
  return type === "INQUIRY" ? "咨询事件" : "访问事件";
}

function formatEventSource(source: string | null) {
  switch (source) {
    case "header":
      return "头部按钮";
    case "floating_fab":
      return "悬浮按钮";
    case "shopping_cart":
      return "购物车";
    case "product_detail":
      return "商品详情";
    case "maintenance_page":
      return "维护页";
    default:
      return source || "-";
  }
}

function StatTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl admin-panel p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(201,169,110,0.12)] text-[var(--gold)]">
          {icon}
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold text-[var(--text)]">{value}</div>
      <div className="mt-2 text-xs text-[var(--muted)]">{hint}</div>
    </div>
  );
}

export function VisitorsPage() {
  const [items, setItems] = useState<VisitorLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getVisitorLogs({ page, size: PAGE_SIZE, q: query || undefined })
      .then((res) => {
        if (!alive) return;
        setItems(Array.isArray(res.items) ? res.items : []);
        setTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "访客记录加载失败";
        setError(msg);
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page, query]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page + 1, pageCount);

  const summary = useMemo(() => {
    const uniqueIps = new Set(items.map((item) => item.ipAddress ?? "").filter(Boolean));
    const uniquePages = new Set(items.map((item) => item.pagePath ?? "").filter(Boolean));
    return {
      pageVisits: items.length,
      uniqueIps: uniqueIps.size,
      uniquePages: uniquePages.size,
    };
  }, [items]);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[rgba(201,169,110,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(227,197,139,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,169,110,0.24)] bg-[rgba(201,169,110,0.08)] px-3 py-1 text-xs tracking-[0.24em] uppercase text-[var(--gold-2)]">
              <ShieldIcon size={14} />
              访客记录
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[0.08em] text-[var(--gold-2)]">访客访问明细</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              查看最近访问与咨询记录的 IP、来源页面、咨询入口和设备信息，方便排查真实询盘来源。
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[var(--muted)]">
            当前展示第 {currentPage} / {pageCount} 页，共 {total.toLocaleString()} 条记录
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile icon={<ActivityIcon size={18} />} label="当前页访问数" value={summary.pageVisits.toLocaleString()} hint="按当前筛选条件统计本页记录" />
        <StatTile icon={<GlobeIcon size={18} />} label="当前页独立 IP" value={summary.uniqueIps.toLocaleString()} hint="可快速判断是否存在重复访问" />
        <StatTile icon={<MonitorIcon size={18} />} label="当前页页面数" value={summary.uniquePages.toLocaleString()} hint="用于观察访问分布是否集中" />
      </div>

      <div className="rounded-2xl admin-panel p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-medium text-[var(--text)]">筛选记录</div>
            <div className="mt-1 text-sm text-[var(--muted)]">支持搜索 IP、事件类型、页面路径、来源地址和设备信息</div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
            <div className="relative flex-1">
              <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                className="admin-input w-full pl-9"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(0);
                    setQuery(input.trim());
                  }
                }}
                placeholder="搜索 IP、事件、页面、来源、设备"
              />
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-primary h-11 px-5"
              onClick={() => {
                setPage(0);
                setQuery(input.trim());
              }}
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="text-sm text-red-300">{error}</div> : null}

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl admin-panel px-5 py-10 text-center text-[var(--muted)]">访客记录加载中...</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl admin-panel px-5 py-10 text-center text-[var(--muted)]">暂无访客记录</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl admin-panel p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em]">
                    <span className="rounded-full bg-[rgba(201,169,110,0.12)] px-3 py-1 text-[var(--gold-2)]">IP {item.ipAddress ?? "-"}</span>
                    <span className={`rounded-full px-3 py-1 ${item.eventType === "INQUIRY" ? "bg-emerald-500/15 text-emerald-200" : "bg-white/6 text-[var(--muted)]"}`}>
                      {formatEventType(item.eventType)}
                    </span>
                    <span className="rounded-full bg-white/6 px-3 py-1 text-[var(--muted)]">{summarizeDevice(item.userAgent)}</span>
                  </div>

                  <div>
                    <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">咨询入口</div>
                    <div className="mt-1 break-all text-sm text-[var(--text)]">{formatEventSource(item.eventSource)}</div>
                  </div>

                  <div>
                    <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">页面路径</div>
                    <div className="mt-1 break-all text-sm font-medium text-[var(--text)]">{item.pagePath || "-"}</div>
                  </div>

                  <div>
                    <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">商品 ID</div>
                    <div className="mt-1 break-all text-sm text-[var(--muted)]">{item.productId || "-"}</div>
                  </div>

                  <div>
                    <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">来源地址</div>
                    <div className="mt-1 break-all text-sm text-[var(--muted)]">{item.referrer || "-"}</div>
                  </div>

                  <div>
                    <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">设备信息</div>
                    <div className="mt-1 break-all text-sm text-[var(--muted)]">{item.userAgent || "-"}</div>
                  </div>
                </div>

                <div className="shrink-0 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-right">
                  <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">访问时间</div>
                  <div className="mt-2 text-sm font-medium text-[var(--text)]">{formatDateTime(item.visitedAt)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl admin-panel p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[var(--muted)]">
          共 {total.toLocaleString()} 条记录，当前第 {currentPage} / {pageCount} 页
        </div>
        <div className="flex gap-2">
          <button type="button" className="admin-btn admin-btn-ghost h-10 px-4" disabled={page <= 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            上一页
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost h-10 px-4"
            disabled={loading || currentPage >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
