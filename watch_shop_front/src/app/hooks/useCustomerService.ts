import { useEffect, useState } from "react";
import { getPublicCustomerServiceConfig, type CustomerServiceConfig } from "../catalogApi";

type CustomerServiceState = {
  config: CustomerServiceConfig;
  loading: boolean;
};

const CACHE_KEY = "watch_shop_public_customer_service";
const CACHE_TTL_MS = 5 * 60 * 1000;

const EMPTY_CONFIG: CustomerServiceConfig = {
  whatsapp: null,
  displayName: null,
  hours: null,
  defaultMessage: null,
  orderMode: null,
  orderButtonLabel: null,
  orderMessageTemplate: null,
  showBuyButtons: null,
};

function readCache(): CustomerServiceConfig | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { config?: CustomerServiceConfig; ts?: number };
    if (!parsed.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return (
      { ...EMPTY_CONFIG, ...(parsed.config ?? {}) }
    );
  } catch {
    return null;
  }
}

function writeCache(config: CustomerServiceConfig) {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ config, ts: Date.now() }));
  } catch {
  }
}

export function useCustomerService(): CustomerServiceState {
  const [state, setState] = useState<CustomerServiceState>(() => ({
    config:
      typeof window === "undefined"
        ? EMPTY_CONFIG
        : readCache() ?? EMPTY_CONFIG,
    loading: true,
  }));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cached = readCache();
        if (cached != null) {
          if (!alive) return;
          setState({ config: cached, loading: false });
        }
        const cfg = await getPublicCustomerServiceConfig();
        if (!alive) return;
        const config: CustomerServiceConfig = {
          whatsapp: cfg.whatsapp ?? null,
          displayName: cfg.displayName ?? null,
          hours: cfg.hours ?? null,
          defaultMessage: cfg.defaultMessage ?? null,
          orderMode: cfg.orderMode ?? null,
          orderButtonLabel: cfg.orderButtonLabel ?? null,
          orderMessageTemplate: cfg.orderMessageTemplate ?? null,
          showBuyButtons: cfg.showBuyButtons ?? null,
        };
        writeCache(config);
        setState({ config, loading: false });
      } catch {
        if (!alive) return;
        setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
