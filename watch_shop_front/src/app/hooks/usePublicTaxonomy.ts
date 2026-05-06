import { useEffect, useState } from "react";
import { getPublicBrands, getPublicModels, type Brand, type WatchModel } from "../catalogApi";

type State = {
  loading: boolean;
  error: string | null;
  brands: Brand[];
  models: WatchModel[];
};

const CACHE_KEY = "watch_shop_public_taxonomy";
const CACHE_TTL_MS = 10 * 60 * 1000;

function readCache(): { brands: Brand[]; models: WatchModel[] } | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { brands?: Brand[]; models?: WatchModel[]; ts?: number };
    if (!parsed.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.brands) || !Array.isArray(parsed.models)) return null;
    return { brands: parsed.brands, models: parsed.models };
  } catch {
    return null;
  }
}

function writeCache(brands: Brand[], models: WatchModel[]) {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ brands, models, ts: Date.now() }));
  } catch {
    // ignore
  }
}

export function usePublicTaxonomy() {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [state, setState] = useState<State>(() => ({
    loading: !cached,
    error: null,
    brands: cached?.brands ?? [],
    models: cached?.models ?? [],
  }));

  useEffect(() => {
    let alive = true;
    if (cached) return;
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const brands = await getPublicBrands();
        const models = await getPublicModels();
        if (!alive) return;
        writeCache(brands, models);
        setState({
          loading: false,
          error: null,
          brands,
          models,
        });
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "加载失败";
        setState({ loading: false, error: msg, brands: [], models: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
