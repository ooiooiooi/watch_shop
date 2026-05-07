import { buildWhatsAppHref } from "../utils/whatsapp";
import type { CustomerServiceConfig, MaintenanceConfig } from "../catalogApi";

type MaintenancePageProps = {
  config: MaintenanceConfig;
  customerService: CustomerServiceConfig | null;
};

export function MaintenancePage({ config, customerService }: MaintenancePageProps) {
  const title = config.title?.trim() || "网站维护中";
  const message = config.message?.trim() || "我们正在进行系统维护，请稍后再试。";
  const buttonLabel = config.buttonLabel?.trim() || "通过 WhatsApp发送询价";
  const whatsappHref =
    customerService?.whatsapp
      ? buildWhatsAppHref(customerService.whatsapp, customerService.defaultMessage ?? "您好，我想咨询一下。")
      : null;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,169,110,0.2),transparent_38%),linear-gradient(180deg,#0b0b0b_0%,#070707_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(201,169,110,0.55)] to-transparent" />
        <div className="relative z-10 w-full max-w-2xl rounded-[28px] border border-[rgba(201,169,110,0.22)] bg-[rgba(255,255,255,0.03)] px-6 py-10 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur md:px-10">
          <div className="mx-auto inline-flex rounded-full border border-[rgba(201,169,110,0.3)] bg-[rgba(201,169,110,0.08)] px-4 py-1 text-[11px] tracking-[0.32em] text-[#e3c58b] uppercase">
            VS Factory
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[0.08em] text-[#f7efe0] md:text-5xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/72 md:text-base">{message}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,#e7c98f,#c7a160)] px-6 text-sm font-medium text-[#17120a] transition hover:opacity-95"
              >
                {buttonLabel}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-medium text-white/85 transition hover:border-[rgba(201,169,110,0.4)] hover:text-white"
            >
              刷新重试
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
