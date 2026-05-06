import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import { useCustomerService } from "../hooks/useCustomerService";
import { buildWhatsAppHref } from "../utils/whatsapp";
import { useI18n } from "../i18n";

export function WhatsAppFab() {
  const { t } = useI18n();
  const { config } = useCustomerService();
  const message = config.defaultMessage ?? t("csDefaultMessage");
  const href = useMemo(() => (config.whatsapp ? buildWhatsAppHref(config.whatsapp, message) : null), [config.whatsapp, message]);
  if (!href) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-1.5 md:bottom-5 md:right-5 md:gap-2">
      {(config.displayName || config.hours) && (
        <div className="max-w-[170px] rounded-2xl border border-border/70 bg-background/92 px-3 py-2 text-right shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur md:max-w-64 md:rounded-md md:px-3 md:py-2">
          {config.displayName && <div className="text-[11px] font-medium leading-4 tracking-[0.01em] text-foreground md:text-xs md:tracking-wide">{config.displayName}</div>}
          {config.hours && <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground md:text-[11px]">{config.hours}</div>}
        </div>
      )}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-secondary text-foreground shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition-colors hover:border-primary hover:text-primary md:h-12 md:w-12"
        aria-label="contact-whatsapp"
        title={t("contactWhatsapp")}
      >
        <MessageCircle size={16} className="md:size-18" />
      </a>
    </div>
  );
}
