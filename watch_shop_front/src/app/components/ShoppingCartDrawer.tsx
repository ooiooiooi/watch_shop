"use client";

import { MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { buildCartInquiryMessage, useCart } from "../cart";
import { useI18n } from "../i18n";
import { useCustomerService } from "../hooks/useCustomerService";
import { resolveMediaUrl } from "../media";
import { buildWhatsAppHref } from "../utils/whatsapp";
import { recordInquiry } from "../engagement";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet";

export function ShoppingCartDrawer() {
  const { t } = useI18n();
  const { config } = useCustomerService();
  const { items, subtotal, isOpen, closeCart, clearCart, removeItem, updateQuantity, totalItems } = useCart();

  const whatsappHref =
    config.whatsapp && items.length > 0
      ? buildWhatsAppHref(
          config.whatsapp,
          buildCartInquiryMessage(items, config.defaultMessage ?? t("csDefaultMessage")),
        )
      : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? undefined : closeCart())}>
      <SheetContent
        side="right"
        className="w-full max-w-[420px] border-l border-border/60 bg-[linear-gradient(180deg,#0f0f10_0%,#090909_100%)] p-0 text-foreground"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-5">
          <div className="flex items-center justify-between gap-4 pr-8">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 text-lg text-foreground">
                <ShoppingBag size={18} className="text-primary" />
                {t("cart")}
              </SheetTitle>
              <SheetDescription className="mt-1 text-xs text-muted-foreground">
                {totalItems > 0 ? `${totalItems} ${t("items")} · ${t("cartSubtitle")}` : t("cartEmptyHint")}
              </SheetDescription>
            </div>
            {items.length > 0 ? (
              <button
                onClick={clearCart}
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"
              >
                {t("clearCart")}
              </button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-secondary/20 px-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <ShoppingBag size={24} />
              </div>
              <h3 className="mt-5 text-xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t("cartEmpty")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("cartEmptyHint")}</p>
              <Button
                onClick={closeCart}
                className="mt-6 rounded-full px-6"
              >
                {t("continueShopping")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const specs = Object.entries(item.specs);
                return (
                  <div
                    key={item.key}
                    className="rounded-[26px] border border-border/70 bg-secondary/20 p-4 shadow-[0_16px_38px_rgba(0,0,0,0.16)]"
                  >
                    <div className="flex gap-4">
                      <Link
                        to={`/product/${encodeURIComponent(item.productId)}`}
                        onClick={closeCart}
                        className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-background/70"
                      >
                        <img
                          src={resolveMediaUrl(item.image)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                              {item.brand || item.collection || "WATCH"}
                            </p>
                            <Link
                              to={`/product/${encodeURIComponent(item.productId)}`}
                              onClick={closeCart}
                              className="mt-1 line-clamp-2 text-sm leading-6 text-foreground transition-colors hover:text-primary"
                            >
                              {item.name}
                            </Link>
                          </div>
                          <button
                            onClick={() => removeItem(item.key)}
                            className="shrink-0 rounded-full border border-border/60 p-2 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                            aria-label={`remove-${item.productId}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {specs.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {specs.map(([key, value]) => (
                              <span
                                key={`${item.key}-${key}`}
                                className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                              >
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-full border border-border/60 bg-background/70 p-1">
                            <button
                              onClick={() => updateQuantity(item.key, item.quantity - 1)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              aria-label={`decrease-${item.productId}`}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-10 text-center text-sm text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.key, item.quantity + 1)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              aria-label={`increase-${item.productId}`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("subtotal")}</div>
                            <div className="text-lg text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                              ${(item.price * item.quantity).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border/60 bg-background/70 px-5 py-5">
          <div className="rounded-[26px] border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{t("subtotal")}</span>
              <span className="text-2xl text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                ${subtotal.toLocaleString()}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("cartWhatsappHint")}</p>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => recordInquiry("shopping_cart")}
                className="mt-4 inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full border border-[#25d366]/35 bg-[linear-gradient(135deg,#1db954,#25d366)] px-5 py-3 text-sm font-semibold tracking-[0.08em] text-white shadow-[0_18px_38px_rgba(37,211,102,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(37,211,102,0.3)]"
              >
                <MessageCircle size={18} />
                {t("cartWhatsappCta")}
              </a>
            ) : (
              <Button disabled className="mt-4 min-h-[54px] w-full rounded-full">
                {t("cartWhatsappCta")}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
