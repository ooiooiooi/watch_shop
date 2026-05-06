import { useEffect, useState } from "react";
import type { Product } from "../data";
import { getPublicProduct } from "../catalogApi";

type State = {
  loading: boolean;
  error: string | null;
  product: Product | null;
};

export function usePublicProduct(id: string | undefined) {
  const [state, setState] = useState<State>(() => ({
    loading: true,
    error: null,
    product: null,
  }));

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const product = await getPublicProduct(id);
        if (!alive) return;
        setState({ loading: false, error: null, product });
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "加载失败";
        setState({ loading: false, error: msg, product: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return state;
}
