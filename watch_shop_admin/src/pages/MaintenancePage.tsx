import { useEffect, useState } from "react";
import * as api from "../api/adminApi";

const DEFAULT_TITLE = "网站维护中";
const DEFAULT_MESSAGE = "我们正在进行系统维护，请稍后再试。如需帮助，请通过 WhatsApp 联系我们。";
const DEFAULT_BUTTON_LABEL = "通过 WhatsApp发送询价";

export function MaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [buttonLabel, setButtonLabel] = useState(DEFAULT_BUTTON_LABEL);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .getMaintenanceConfig()
      .then((cfg) => {
        if (!alive) return;
        setEnabled(Boolean(cfg.enabled));
        setTitle(cfg.title?.trim() || DEFAULT_TITLE);
        setMessage(cfg.message?.trim() || DEFAULT_MESSAGE);
        setButtonLabel(cfg.buttonLabel?.trim() || DEFAULT_BUTTON_LABEL);
      })
      .catch((e) => {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "加载失败";
        setError(msg);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateMaintenanceConfig({
        enabled,
        title: title.trim() || null,
        message: message.trim() || null,
        buttonLabel: buttonLabel.trim() || null,
      });
      setEnabled(Boolean(res.enabled));
      setTitle(res.title?.trim() || DEFAULT_TITLE);
      setMessage(res.message?.trim() || DEFAULT_MESSAGE);
      setButtonLabel(res.buttonLabel?.trim() || DEFAULT_BUTTON_LABEL);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "保存失败";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">维护模式</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">开启后前台公开接口将返回维护状态，站点会统一显示维护页。</p>
        </div>
        <button className="admin-btn admin-btn-primary h-10 px-4" onClick={save} disabled={loading || saving}>
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {error ? <div className="text-sm text-red-300">{error}</div> : null}

      <div className="rounded-xl border border-[rgba(201,169,110,0.22)] bg-[rgba(201,169,110,0.08)] p-4 text-sm leading-6 text-[var(--text)]">
        当前状态：
        <span className={`ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${enabled ? "bg-amber-500/20 text-amber-100" : "bg-emerald-500/20 text-emerald-100"}`}>
          {enabled ? "维护中" : "正常访问"}
        </span>
      </div>

      <div className="rounded-xl admin-panel p-5 space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
          <div>
            <div className="text-sm font-medium text-[var(--text)]">开启维护模式</div>
            <div className="mt-1 text-xs text-[var(--muted)]">对外公开接口将暂停服务，后台管理仍可正常登录和关闭维护。</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((prev) => !prev)}
            disabled={loading}
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-[var(--gold)]" : "bg-white/15"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`}
            />
          </button>
        </label>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">维护标题</label>
          <input
            className="admin-input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={DEFAULT_TITLE}
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">维护说明</label>
          <textarea
            className="admin-input min-h-28 w-full"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={DEFAULT_MESSAGE}
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">联系按钮文案</label>
          <input
            className="admin-input w-full"
            value={buttonLabel}
            onChange={(e) => setButtonLabel(e.target.value)}
            placeholder={DEFAULT_BUTTON_LABEL}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
