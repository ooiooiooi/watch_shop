import { useEffect, useState } from "react";
import * as api from "../api/adminApi";

const COUNTRY_CODES = [
  { code: "86", label: "中国 +86" },
  { code: "852", label: "香港 +852" },
  { code: "853", label: "澳门 +853" },
  { code: "886", label: "台湾 +886" },
  { code: "60", label: "马来西亚 +60" },
  { code: "65", label: "新加坡 +65" },
  { code: "66", label: "泰国 +66" },
  { code: "81", label: "日本 +81" },
  { code: "82", label: "韩国 +82" },
  { code: "1", label: "美国/加拿大 +1" },
  { code: "44", label: "英国 +44" },
  { code: "49", label: "德国 +49" },
  { code: "33", label: "法国 +33" },
  { code: "39", label: "意大利 +39" },
  { code: "34", label: "西班牙 +34" },
  { code: "61", label: "澳大利亚 +61" },
  { code: "64", label: "新西兰 +64" },
  { code: "91", label: "印度 +91" },
  { code: "55", label: "巴西 +55" },
  { code: "971", label: "阿联酋 +971" },
];

function splitWhatsapp(raw: string | null | undefined) {
  const v = (raw ?? "").trim();
  if (!v) return { country: "86", number: "" };
  if (v.startsWith("http://") || v.startsWith("https://")) return { country: "86", number: v };
  const digits = v.replaceAll(/[^0-9]/g, "");
  if (!digits) return { country: "86", number: "" };
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const cc of sorted) {
    if (digits.startsWith(cc.code) && digits.length > cc.code.length) {
      return { country: cc.code, number: digits.slice(cc.code.length) };
    }
  }
  return { country: "86", number: digits };
}

export function CustomerServicePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappCountry, setWhatsappCountry] = useState("86");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [hours, setHours] = useState("");
  const [defaultMessage, setDefaultMessage] = useState("");
  const [orderButtonLabel, setOrderButtonLabel] = useState("");
  const [orderMessageTemplate, setOrderMessageTemplate] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .getCustomerServiceConfig()
      .then((cfg) => {
        if (!alive) return;
        const parsed = splitWhatsapp(cfg.whatsapp);
        setWhatsappCountry(parsed.country);
        setWhatsappNumber(parsed.number);
        setDisplayName(cfg.displayName ?? "");
        setHours(cfg.hours ?? "");
        setDefaultMessage(cfg.defaultMessage ?? "");
        setOrderButtonLabel(cfg.orderButtonLabel ?? "");
        setOrderMessageTemplate(cfg.orderMessageTemplate ?? "");
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
      const waInput = whatsappNumber.trim();
      const wa =
        !waInput
          ? null
          : waInput.startsWith("http://") || waInput.startsWith("https://")
            ? waInput
            : `${whatsappCountry}${waInput.replaceAll(/[^0-9]/g, "")}`;
      const res = await api.updateCustomerServiceConfig({
        whatsapp: wa,
        displayName: displayName.trim() ? displayName.trim() : null,
        hours: hours.trim() ? hours.trim() : null,
        defaultMessage: defaultMessage.trim() ? defaultMessage.trim() : null,
        orderMode: "chat",
        orderButtonLabel: orderButtonLabel.trim() ? orderButtonLabel.trim() : null,
        orderMessageTemplate: orderMessageTemplate.trim() ? orderMessageTemplate.trim() : null,
        showBuyButtons: false,
      });
      const parsed = splitWhatsapp(res.whatsapp);
      setWhatsappCountry(parsed.country);
      setWhatsappNumber(parsed.number);
      setDisplayName(res.displayName ?? "");
      setHours(res.hours ?? "");
      setDefaultMessage(res.defaultMessage ?? "");
      setOrderButtonLabel(res.orderButtonLabel ?? "");
      setOrderMessageTemplate(res.orderMessageTemplate ?? "");
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
          <h1 className="text-2xl font-semibold tracking-wide text-[var(--gold-2)]">客服配置</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">配置前台“联系 WhatsApp 客服”入口</p>
        </div>
        <button className="admin-btn admin-btn-primary h-10 px-4" onClick={save} disabled={loading || saving}>
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {error && <div className="text-sm text-red-300">{error}</div>}

      <div className="rounded-xl admin-panel p-5 space-y-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">WhatsApp 账号（区号 + 手机号）</label>
          <div className="grid gap-2 md:grid-cols-[220px_1fr]">
            <select
              className="admin-input h-10"
              value={whatsappCountry}
              onChange={(e) => setWhatsappCountry(e.target.value)}
              disabled={loading}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className="admin-input w-full"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="例如：13800138000（也可直接填 https://wa.me/...）"
              disabled={loading}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">客服名称（可选）</label>
          <input
            className="admin-input w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例如：Watch Shop Support"
            disabled={loading}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">工作时间（可选）</label>
          <input
            className="admin-input w-full"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="例如：Mon-Sat 10:00-19:00"
            disabled={loading}
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">默认消息（可选）</label>
          <textarea
            className="admin-input w-full min-h-24"
            value={defaultMessage}
            onChange={(e) => setDefaultMessage(e.target.value)}
            placeholder="例如：你好，我想咨询一下商品"
            disabled={loading}
          />
        </div>
        <div className="text-xs text-[var(--muted)] leading-relaxed">
          未填写则前台不显示入口。保存时会自动拼接为“国家区号 + 手机号”并只保留数字。
        </div>
      </div>

      <div className="rounded-xl admin-panel p-5 space-y-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">联系按钮文案（可选）</label>
          <input
            className="admin-input w-full"
            value={orderButtonLabel}
            onChange={(e) => setOrderButtonLabel(e.target.value)}
            placeholder="例如：WhatsApp 联系我们"
            disabled={loading}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-[var(--muted)]">联系消息模板（可选）</label>
          <textarea
            className="admin-input w-full min-h-28"
            value={orderMessageTemplate}
            onChange={(e) => setOrderMessageTemplate(e.target.value)}
            placeholder="{defaultMessage}\n{productName} (ID: {productId})\n{url}"
            disabled={loading}
          />
        </div>

        <div className="text-xs text-[var(--muted)] leading-relaxed">
          模板占位符：{"{defaultMessage}"}、{"{productName}"}、{"{productId}"}、{"{url}"}。未填写则使用默认模板。
        </div>
      </div>
    </div>
  );
}
