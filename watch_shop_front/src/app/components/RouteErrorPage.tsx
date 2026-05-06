import { isRouteErrorResponse, useRouteError, Link } from "react-router";
import { useI18n } from "../i18n";

export function RouteErrorPage() {
  const err = useRouteError();
  const { t } = useI18n();

  const message = (() => {
    if (isRouteErrorResponse(err)) {
      return `${err.status} ${err.statusText}`;
    }
    if (err instanceof Error) return err.message;
    return String(err);
  })();

  return (
    <div className="min-h-svh flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-secondary p-8 text-center">
        <div className="text-primary text-xs tracking-[0.35em] uppercase">{t("error")}</div>
        <h1 className="mt-3 text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          {t("pageErrorTitle")}
        </h1>
        <div className="mt-3 text-sm text-muted-foreground break-words">{message}</div>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/" className="text-primary text-xs tracking-[0.2em] uppercase hover:underline">{t("backHome")}</Link>
          <Link to="/category" className="text-primary text-xs tracking-[0.2em] uppercase hover:underline">
            {t("backToList")}
          </Link>
        </div>
      </div>
    </div>
  );
}
