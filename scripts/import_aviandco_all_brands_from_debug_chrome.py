#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from typing import Dict, List


NODE_BIN = os.getenv(
    "AVI_NODE_BIN",
    "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
)
DEBUG_HOST = os.getenv("AVI_DEBUG_HOST", "http://127.0.0.1:62305")
IMPORTER = os.path.join(os.path.dirname(__file__), "import_aviandco_brand_from_debug_chrome.py")

BRANDS: List[Dict[str, object]] = [
    {"name": "Richard Mille", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=144", "pages": 11},
    {"name": "Patek Philippe", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=120", "pages": 15},
    {"name": "Audemars Piguet", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=131", "pages": 22},
    {"name": "Rolex", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=4", "pages": 44},
    {"name": "Cartier", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=192", "pages": 3},
    {"name": "Omega", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=393", "pages": 1},
    {"name": "Hublot", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=194", "pages": 1},
    {"name": "Breitling", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=439", "pages": 1},
    {"name": "Panerai", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=196", "pages": 1},
    {"name": "Breguet", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=217", "pages": 1},
    {"name": "F.P. Journe", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=940", "pages": 8},
    {"name": "Franck Muller", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=912", "pages": 1},
    {"name": "Jacob & Co.", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=578", "pages": 1},
    {"name": "Tudor", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=295", "pages": 1},
    {"name": "Vacheron Constantin", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=223", "pages": 1},
    {"name": "Ulysse Nardin", "url": "https://www.aviandco.com/shop-by-brand?shop_by_brand=807", "pages": 1},
]


def main() -> int:
    fetch_details = os.getenv("AVI_FETCH_DETAILS", "false")
    start_brand = os.getenv("AVI_START_BRAND", "").strip().lower()
    started = not start_brand
    summaries = []
    for brand in BRANDS:
        if not started:
            started = str(brand["name"]).strip().lower() == start_brand
        if not started:
            continue
        env = os.environ.copy()
        env.update(
            {
                "AVI_NODE_BIN": NODE_BIN,
                "AVI_DEBUG_HOST": DEBUG_HOST,
                "AVI_DEBUG_BRAND_TEXT": str(brand["name"]),
                "AVI_DEBUG_BRAND_URL": str(brand["url"]),
                "AVI_MAX_PAGES": str(brand["pages"]),
                "AVI_FETCH_DETAILS": fetch_details,
                "AVI_IMPORT_NO_PRICE": os.getenv("AVI_IMPORT_NO_PRICE", "true"),
                "AVI_NO_PRICE_VALUE": os.getenv("AVI_NO_PRICE_VALUE", "0"),
            }
        )
        print(f"importing {brand['name']} pages={brand['pages']}", flush=True)
        proc = subprocess.run(
            [sys.executable, IMPORTER],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            timeout=max(300, int(brand["pages"]) * 90),
        )
        if proc.returncode != 0:
            print(proc.stderr or proc.stdout, file=sys.stderr)
            return proc.returncode
        line = (proc.stdout or "").strip().splitlines()[-1]
        try:
            summaries.append(json.loads(line))
        except Exception:
            summaries.append({"brand": brand["name"], "raw": line})
        print(line, flush=True)
    print(json.dumps({"brands": len(summaries), "summaries": summaries}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
