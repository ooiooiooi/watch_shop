import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useCatalog } from "../store/catalogStore";
import { type DashboardStats, type DashboardTrendPoint, getDashboardStats } from "../api/adminApi";
import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  GlobeIcon,
  MessageCircleIcon,
  MousePointerClickIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";

type RangeDays = 7 | 30;

const RANGE_OPTIONS: Array<{ value: RangeDays; label: string }> = [
  { value: 7, label: "近 7 天" },
  { value: 30, label: "近 30 天" },
];

function formatCompact(value: number) {
  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(value >= 100_000 ? 0 : 1)}w`;
  }
  return value.toLocaleString();
}

function formatChange(value: number | null) {
  if (value == null || Number.isNaN(value)) return "无对比";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(value >= 100 ? 0 : 1)}%`;
}

function sumPoints(points: DashboardTrendPoint[], key: "visits" | "uniqueVisitors") {
  return points.reduce((sum, point) => sum + point[key], 0);
}

function getChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : null;
  }
  return ((current - previous) / previous) * 100;
}

function buildPolyline(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  if (!points.length) return "";
  const start = points[0];
  const end = points[points.length - 1];
  return `M ${start.x} ${baseline} L ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${end.x} ${baseline} Z`;
}

function ChangeChip({ value }: { value: number | null }) {
  const isNeutral = value == null;
  const positive = value != null && value >= 0;
  const Icon = positive ? ArrowUpIcon : ArrowDownIcon;
  const label = formatChange(value);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        isNeutral
          ? "bg-white/6 text-[var(--muted)] ring-1 ring-white/10"
          : positive
          ? "bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-500/25"
          : "bg-rose-500/12 text-rose-200 ring-1 ring-rose-500/25"
      }`}
    >
      {value != null ? <Icon size={12} /> : null}
      {label}
    </span>
  );
}

function TrendChart({ points }: { points: DashboardTrendPoint[] }) {
  const width = 760;
  const height = 280;
  const top = 18;
  const bottom = 28;
  const horizontal = 10;
  const chartHeight = height - top - bottom;
  const chartWidth = width - horizontal * 2;
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.visits, point.uniqueVisitors]));
  const step = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  const visitPoints = points.map((point, index) => ({
    x: horizontal + index * step,
    y: top + chartHeight - (point.visits / maxValue) * chartHeight,
  }));
  const uvPoints = points.map((point, index) => ({
    x: horizontal + index * step,
    y: top + chartHeight - (point.uniqueVisitors / maxValue) * chartHeight,
  }));

  const baseline = height - bottom;
  const gridValues = [0, 0.25, 0.5, 0.75, 1];
  const tickIndexes = points.length <= 7 ? points.map((_, index) => index) : [0, 5, 11, 17, 23, 29].filter((index) => index < points.length);

  return (
    <div className="rounded-[28px] border border-[rgba(201,169,110,0.18)] bg-[radial-gradient(circle_at_top,rgba(227,197,139,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:p-5">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
        <defs>
          <linearGradient id="visitsArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(227,197,139,0.32)" />
            <stop offset="100%" stopColor="rgba(227,197,139,0)" />
          </linearGradient>
        </defs>

        {gridValues.map((value) => {
          const y = top + chartHeight - chartHeight * value;
          return (
            <line
              key={value}
              x1={horizontal}
              x2={width - horizontal}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="4 8"
            />
          );
        })}

        <path d={buildAreaPath(visitPoints, baseline)} fill="url(#visitsArea)" />
        <polyline fill="none" stroke="rgba(227,197,139,0.95)" strokeWidth="3" points={buildPolyline(visitPoints)} />
        <polyline fill="none" stroke="rgba(129,212,250,0.95)" strokeWidth="2.5" points={buildPolyline(uvPoints)} />

        {visitPoints.map((point, index) => {
          if (!tickIndexes.includes(index)) return null;
          return <circle key={`visit-${points[index]?.date}`} cx={point.x} cy={point.y} r="3.6" fill="rgba(227,197,139,1)" />;
        })}

        {uvPoints.map((point, index) => {
          if (!tickIndexes.includes(index)) return null;
          return <circle key={`uv-${points[index]?.date}`} cx={point.x} cy={point.y} r="3.2" fill="rgba(129,212,250,1)" />;
        })}
      </svg>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] tracking-[0.2em] text-[var(--muted)] uppercase">
        {tickIndexes.map((index) => (
          <span key={points[index]?.date}>{points[index]?.label}</span>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  meta,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="rounded-2xl admin-panel p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(227,197,139,0.14),transparent_40%)]" />
      <div className="relative z-10 flex items-center justify-between">
        <div className="text-sm text-[var(--muted)] font-medium">{title}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(201,169,110,0.15)] text-[var(--gold)]">{icon}</div>
      </div>
      <div className="relative z-10 mt-4 text-3xl font-bold tracking-tight text-[var(--text)]">{value}</div>
      {meta ? <div className="relative z-10 mt-3">{meta}</div> : null}
    </div>
  );
}

export function DashboardPage() {
  const { products, categories } = useCatalog();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<RangeDays>(7);
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const trendSampleCount = Array.isArray(stats?.dailyTrend) ? stats.dailyTrend.length : 0;

  useEffect(() => {
    let alive = true;
    getDashboardStats()
      .then((data) => {
        if (alive) {
          setStats(data);
          setStatsError(null);
          setLoadingStats(false);
        }
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : "统计加载失败";
        console.error("Failed to load stats", e);
        if (alive) {
          setStatsError(message);
          setLoadingStats(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const trend = useMemo(() => {
    const allPoints = stats?.dailyTrend ?? [];
    const current = allPoints.slice(-rangeDays);
    const previous = allPoints.slice(-rangeDays * 2, -rangeDays);
    const currentVisits = sumPoints(current, "visits");
    const currentUv = sumPoints(current, "uniqueVisitors");
    const previousVisits = sumPoints(previous, "visits");
    const previousUv = sumPoints(previous, "uniqueVisitors");
    const peakDay = current.reduce<DashboardTrendPoint | null>((max, point) => {
      if (!max || point.visits > max.visits) return point;
      return max;
    }, null);
    const avgDailyVisits = current.length ? currentVisits / current.length : 0;
    const avgDailyUv = current.length ? currentUv / current.length : 0;
    const visitShare = currentVisits > 0 ? currentUv / currentVisits : 0;

    return {
      current,
      currentVisits,
      currentUv,
      avgDailyVisits,
      avgDailyUv,
      visitShare,
      peakDay,
      visitsChange: getChange(currentVisits, previousVisits),
      uvChange: getChange(currentUv, previousUv),
    };
  }, [rangeDays, stats]);

  const insightLines = useMemo(() => {
    if (!trend.current.length) {
      return ["当前暂无足够访问记录，趋势图会在产生新访问后自动补齐。"];
    }

    const visitDirection =
      trend.visitsChange == null ? "与上一周期暂无可比数据" : trend.visitsChange >= 0 ? "访问量保持上升" : "访问量出现回落";
    const uvDirection =
      trend.uvChange == null ? "访客规模待继续观察" : trend.uvChange >= 0 ? "新增访客同步增长" : "访客获取效率偏弱";
    const shareText =
      trend.visitShare >= 0.7 ? "访客去重后占比高，流量更偏真实用户。" : "同一访客重复访问较多，可继续观察回访行为。";

    return [
      `${visitDirection}，当前周期 PV 为 ${trend.currentVisits.toLocaleString()}。`,
      `${uvDirection}，当前周期 UV 为 ${trend.currentUv.toLocaleString()}。`,
      `${shareText} 峰值日出现在 ${trend.peakDay?.label ?? "--"}。`,
    ];
  }, [trend]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[rgba(201,169,110,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(227,197,139,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,169,110,0.24)] bg-[rgba(201,169,110,0.08)] px-3 py-1 text-xs tracking-[0.24em] uppercase text-[var(--gold-2)]">
              <TrendingUpIcon size={14} />
              趋势分析
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[0.08em] text-[var(--gold-2)]">仪表盘</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              聚合最近 60 天访问记录，支持查看近 7 天与近 30 天走势，并自动生成基础趋势判断。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => {
              const active = rangeDays === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRangeDays(option.value)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    active
                      ? "bg-[linear-gradient(180deg,var(--gold-2),var(--gold))] text-[#17120a] shadow-[0_10px_24px_rgba(201,169,110,0.24)]"
                      : "border border-[var(--line)] bg-[rgba(255,255,255,0.02)] text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--text)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3 text-[var(--text)]">访问统计</h2>
        {statsError ? <div className="mb-3 text-sm text-red-300">{statsError}</div> : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="今日访问量 (PV)"
            value={loadingStats ? "..." : (stats?.todayVisits ?? 0).toLocaleString()}
            icon={<MousePointerClickIcon size={18} />}
            meta={<div className="text-xs text-[var(--muted)]">用于判断今日站点曝光热度</div>}
          />
          <StatCard
            title="今日访客数 (UV)"
            value={loadingStats ? "..." : (stats?.todayUniqueVisitors ?? 0).toLocaleString()}
            icon={<UsersIcon size={18} />}
            meta={<div className="text-xs text-[var(--muted)]">去重访客，可观察拉新效果</div>}
          />
          <StatCard
            title="累计访问量"
            value={loadingStats ? "..." : (stats?.totalVisits ?? 0).toLocaleString()}
            icon={<EyeIcon size={18} />}
            meta={<div className="text-xs text-[var(--muted)]">历史总 PV，反映整体站点体量</div>}
          />
          <StatCard
            title="累计访客数"
            value={loadingStats ? "..." : (stats?.totalUniqueVisitors ?? 0).toLocaleString()}
            icon={<GlobeIcon size={18} />}
            meta={<div className="text-xs text-[var(--muted)]">历史总 UV，反映触达用户规模</div>}
          />
          <StatCard
            title="今日咨询人数"
            value={loadingStats ? "..." : (stats?.todayInquiryUsers ?? 0).toLocaleString()}
            icon={<MessageCircleIcon size={18} />}
            meta={<div className="text-xs text-[var(--muted)]">当天点击 WhatsApp 发起咨询的独立人数</div>}
          />
          <StatCard
            title="累计咨询人数"
            value={loadingStats ? "..." : (stats?.totalInquiryUsers ?? 0).toLocaleString()}
            icon={<MessageCircleIcon size={18} />}
            meta={<div className="text-xs text-[var(--muted)]">历史累计发起咨询的独立人数</div>}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="rounded-[28px] admin-panel p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium text-[var(--text)]">访问趋势图</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">金色代表 PV，蓝色代表 UV，按天展示真实访问走势。</p>
            </div>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--gold-2)]" />
                PV
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
                UV
              </span>
            </div>
          </div>
          <div className="mt-5">
            <TrendChart points={trend.current} />
          </div>
        </div>

        <div className="rounded-[28px] admin-panel p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-[var(--text)]">趋势分析</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">基于当前周期与上一周期的对比。</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(201,169,110,0.15)] text-[var(--gold)]">
              <ActivityIcon size={18} />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">当前周期 PV</div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{formatCompact(trend.currentVisits)}</div>
                </div>
                <ChangeChip value={trend.visitsChange} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">当前周期 UV</div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{formatCompact(trend.currentUv)}</div>
                </div>
                <ChangeChip value={trend.uvChange} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">日均访问</div>
                <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{formatCompact(Math.round(trend.avgDailyVisits))}</div>
                <div className="mt-2 text-xs text-[var(--muted)]">日均 UV {formatCompact(Math.round(trend.avgDailyUv))}</div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-4">
                <div className="text-xs tracking-[0.2em] uppercase text-[var(--muted)]">峰值日期</div>
                <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{trend.peakDay?.label ?? "--"}</div>
                <div className="mt-2 text-xs text-[var(--muted)]">单日 PV {formatCompact(trend.peakDay?.visits ?? 0)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(201,169,110,0.2)] bg-[rgba(201,169,110,0.08)] p-4">
              <div className="text-xs tracking-[0.22em] uppercase text-[var(--gold-2)]">自动结论</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--text)]">
                {insightLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3 text-[var(--text)]">系统概览</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl admin-panel p-5">
            <div className="text-sm text-[var(--muted)]">商品数量</div>
            <div className="mt-2 text-3xl font-semibold">{safeProducts.length}</div>
          </div>
          <div className="rounded-xl admin-panel p-5">
            <div className="text-sm text-[var(--muted)]">分类数量</div>
            <div className="mt-2 text-3xl font-semibold">{safeCategories.length}</div>
          </div>
          <div className="rounded-xl admin-panel p-5">
            <div className="text-sm text-[var(--muted)]">登录账号</div>
            <div className="mt-2 text-lg font-medium">admin</div>
          </div>
          <div className="rounded-xl admin-panel p-5">
            <div className="text-sm text-[var(--muted)]">趋势样本天数</div>
            <div className="mt-2 text-3xl font-semibold">{trendSampleCount}</div>
            <div className="mt-2 text-xs text-[var(--muted)]">当前已缓存最近 60 天访问记录</div>
          </div>
        </div>
      </div>
    </div>
  );
}
