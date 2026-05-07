import { useI18n } from "../i18n";
import { Link } from "react-router";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 pb-28 md:py-12 md:pb-12">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-2 rounded-3xl border border-border/60 bg-background/40 p-5 md:col-span-1 md:rounded-none md:border-0 md:bg-transparent md:p-0">
            <h4 className="mb-3 text-xl font-semibold tracking-[0.24em] uppercase md:mb-4 md:text-2xl md:tracking-[0.3em]" style={{ fontFamily: "'Playfair Display', serif" }}>VS FACTORY</h4>
            <p className="mb-4 text-sm leading-6 text-muted-foreground">
              {t("footerDesc")}
            </p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground/90">{t("contactUs")}:</p>
              <p className="leading-6">{t("footerAddress")}</p>
              <p className="break-all">{t("footerEmail")}</p>
              <p>{t("footerPhone")}</p>
            </div>
          </div>

          {/* About Column */}
          <div className="min-w-0">
            <h4 className="mb-4 text-sm font-medium tracking-[0.08em] uppercase text-primary">{t("about")}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/about" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("ourStory")}</Link></li>
              <li><Link to="/about#privacy" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("privacyPolicy")}</Link></li>
              <li><Link to="/about#terms" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("termsConditions")}</Link></li>
              <li><Link to="/about#delivery" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("deliveryPolicy")}</Link></li>
              <li><Link to="/about#returns" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("returnPolicy")}</Link></li>
            </ul>
          </div>

          {/* Collections Column */}
          <div className="min-w-0">
            <h4 className="mb-4 text-sm font-medium tracking-[0.08em] uppercase text-primary">{t("collections")}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/category?q=chronograph" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("collectionChronograph")}</Link></li>
              <li><Link to="/category?q=classic" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("collectionClassic")}</Link></li>
              <li><Link to="/category?q=sport" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("collectionSport")}</Link></li>
              <li><Link to="/category?q=minimalist" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("collectionMinimalist")}</Link></li>
              <li><Link to="/category?q=limited" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("collectionLimited")}</Link></li>
            </ul>
          </div>

          {/* Support Column */}
          <div className="col-span-2 min-w-0 rounded-3xl border border-border/60 bg-background/30 p-5 md:col-span-1 md:rounded-none md:border-0 md:bg-transparent md:p-0">
            <h4 className="mb-4 text-sm font-medium tracking-[0.08em] uppercase text-primary">{t("support")}</h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:block md:space-y-2">
              <li><Link to="/about#contact" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("contactUs")}</Link></li>
              <li><Link to="/about#warranty" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("warranty")}</Link></li>
              <li><Link to="/about#repairs" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("repairs")}</Link></li>
              <li><Link to="/about#faq" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("faq")}</Link></li>
              <li><Link to="/about#buying-guide" className="block text-sm leading-6 text-muted-foreground transition-colors hover:text-primary">{t("buyingGuide")}</Link></li>
            </ul>
            <div className="mt-5 border-t border-border/60 pt-4 md:mt-6 md:border-0 md:pt-0">
              <p className="mb-3 text-xs text-muted-foreground">{t("trustedDealer")}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm font-medium text-primary">RWI</span>
                <span className="text-sm font-medium text-primary">TrustPilot</span>
                <span className="text-sm font-medium text-primary">★★★★★</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment & Copyright */}
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 md:mt-12 md:flex-row md:items-center md:justify-between md:pt-8">
          <div className="text-left text-xs leading-5 text-muted-foreground md:text-left">
            &copy; 2026 VS FACTORY. {t("allRightsReserved")} — {t("footerSince")}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs font-medium" style={{ color: "#1a1f71" }}>VISA</span>
            <span className="text-xs font-medium" style={{ color: "#eb001b" }}>Mastercard</span>
            <span className="text-xs font-medium" style={{ color: "#003087" }}>PayPal</span>
            <span className="text-xs font-medium">Apple Pay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
