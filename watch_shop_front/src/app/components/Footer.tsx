import { useI18n } from "../i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-secondary border-t border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <h4 className="text-primary tracking-[0.3em] uppercase mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Aurelian</h4>
            <p className="text-muted-foreground text-sm">{t("footerDesc")}</p>
          </div>
          {[
            { title: t("collections"), links: ["Chronograph", "Classic", "Sport", "Minimalist"] },
            { title: t("support"), links: [t("contactUs"), t("warranty"), t("repairs"), t("faq")] },
            { title: t("company"), links: [t("ourStory"), t("careers"), t("press"), t("stores")] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-xs tracking-[0.2em] uppercase text-foreground mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}><a href="#" className="text-muted-foreground text-sm hover:text-primary transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-12 pt-8 text-center text-muted-foreground text-xs tracking-widest">
          &copy; 2026 AURELIAN. {t("allRightsReserved")}
        </div>
      </div>
    </footer>
  );
}
