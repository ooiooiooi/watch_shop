import { useEffect, useMemo, useState } from "react";
import type { Product } from "../data";
import { getPublicCategories, getPublicProductsPage, type Category, type ProductQuery } from "../catalogApi";

type State = {
  loading: boolean;
  error: string | null;
  categories: Category[];
  products: Product[];
  total: number;
};

export function usePublicCatalog(query?: ProductQuery) {
  const [state, setState] = useState<State>(() => ({
    loading: true,
    error: null,
    categories: [],
    products: [],
    total: 0,
  }));

  const key = useMemo(() => JSON.stringify(query ?? {}), [query]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const [categories, page] = await Promise.all([
          getPublicCategories(),
          getPublicProductsPage({ ...(query ?? {}), page: 0, size: 24 }),
        ]);
        if (!alive) return;
        setState({ loading: false, error: null, categories, products: page.items, total: page.total });
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "加载失败";
        setState({ loading: false, error: msg, categories: [], products: [], total: 0 });
      }
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  return state;
}
