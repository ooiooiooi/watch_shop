#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import import_aviandco_catalog as avi
import import_wc_api as shared


DEBUG_HOST = os.getenv("AVI_DEBUG_HOST", "http://127.0.0.1:62305").rstrip("/")
BRAND_TEXT = os.getenv("AVI_DEBUG_BRAND_TEXT", "Richard Mille")
BRAND_URL = os.getenv("AVI_DEBUG_BRAND_URL", "")
IMPORT_LIMIT = max(0, int(os.getenv("AVI_IMPORT_LIMIT", "0")))
FETCH_DETAILS = os.getenv("AVI_FETCH_DETAILS", "true").lower() in {"1", "true", "yes", "y"}
IMPORT_NO_PRICE = os.getenv("AVI_IMPORT_NO_PRICE", "true").lower() in {"1", "true", "yes", "y"}
NO_PRICE_VALUE = float(os.getenv("AVI_NO_PRICE_VALUE", "0"))
NODE_BIN = os.getenv(
    "AVI_NODE_BIN",
    "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
)
PROBE = os.path.join(os.path.dirname(__file__), "aviandco_debug_probe.mjs")
DETAIL_HELPER = os.path.join(os.path.dirname(__file__), "aviandco_debug_chrome_fetch.mjs")

BRAND_PREFIXES = [
    "A. Lange & Sohne",
    "Audemars Piguet",
    "Avi & Co.",
    "Breitling",
    "Breguet",
    "Bvlgari",
    "Cartier",
    "Chanel",
    "Chopard",
    "F.P. Journe",
    "Franck Muller",
    "Girard Perregaux",
    "Grand Seiko",
    "Hublot",
    "Hue By Avi & Co.",
    "IWC",
    "Jacob & Co.",
    "Jaeger Lecoultre",
    "MB&F",
    "Omega",
    "Panerai",
    "Patek Philippe",
    "Richard Mille",
    "Roger Dubuis",
    "Rolex",
    "Tudor",
    "Ulysse Nardin",
    "Vacheron Constantin",
    "Zenith",
]


def run_json(cmd: List[str], env: Dict[str, str]) -> Dict[str, Any]:
    max_pages = max(1, int(env.get("AVI_MAX_PAGES", "1")))
    timeout = max(240, max_pages * 20)
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, timeout=timeout)
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(detail[:700])
    payload = json.loads(proc.stdout or "{}")
    if not isinstance(payload, dict):
        raise RuntimeError("unexpected JSON payload")
    return payload


def fetch_brand_cards() -> List[avi.ListingProduct]:
    env = os.environ.copy()
    env["AVI_DEBUG_HOST"] = DEBUG_HOST
    env["AVI_DEBUG_BRAND_TEXT"] = BRAND_TEXT
    if BRAND_URL:
        env["AVI_DEBUG_BRAND_URL"] = BRAND_URL
    payload = run_json([NODE_BIN, PROBE], env)
    cards = payload.get("cards") or []
    out: List[avi.ListingProduct] = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        price = avi.parse_money(str(card.get("price") or ""))
        image = avi.absolute_url(str(card.get("image") or "")) if card.get("image") else ""
        if image.startswith("data:"):
            image = ""
        out.append(
            avi.ListingProduct(
                url=avi.absolute_url(str(card.get("href") or "")),
                name=avi.compact_text(str(card.get("name") or "")),
                price=price,
                image=image,
            )
        )
        if IMPORT_LIMIT and len(out) >= IMPORT_LIMIT:
            break
    return out


def fetch_detail(listing: avi.ListingProduct) -> Dict[str, Any]:
    env = os.environ.copy()
    env["AVI_DEBUG_HOST"] = DEBUG_HOST
    payload = run_json([NODE_BIN, DETAIL_HELPER, "detail", listing.url], env)
    return avi.browser_product_detail_from_payload(payload, listing)


def infer_brand(name: str, existing: Optional[str]) -> Optional[str]:
    if existing:
        return existing
    lowered = name.lower()
    for brand in BRAND_PREFIXES:
        if lowered.startswith(brand.lower()):
            return "Avi & Co." if brand == "Hue By Avi & Co." else brand
    return None


def main() -> int:
    login = shared.watch_shop_req(
        "POST",
        "/api/admin/auth/login",
        data={"username": shared.WATCH_SHOP_ADMIN_USER, "password": shared.WATCH_SHOP_ADMIN_PASS},
    )
    token = login["token"]
    shared.watch_shop_upsert(
        "/api/admin/categories",
        token,
        {"id": avi.AVI_CATEGORY_ID, "name": avi.AVI_CATEGORY_NAME, "image": avi.FALLBACK_IMAGE},
    )
    brand_name_to_id: Dict[str, str] = {}
    model_key_to_id: Dict[Tuple[str, str], str] = {}
    shared.prefill_brand_cache(token, brand_name_to_id)
    shared.prefill_model_cache(token, model_key_to_id)

    cards = fetch_brand_cards()
    imported = 0
    skipped = {"missing_name": 0, "missing_price": 0}
    for listing in cards:
        detail = fetch_detail(listing) if FETCH_DETAILS else {
            "name": listing.name,
            "sku": "",
            "description": listing.name,
            "images": [listing.image] if listing.image else [],
            "image": listing.image or avi.FALLBACK_IMAGE,
            "price": listing.price,
            "brand": shared.infer_brand_from_name(listing.name),
            "model": None,
            "reference": None,
        }
        name = str(detail.get("name") or "").strip()
        price = detail.get("price")
        if not name:
            skipped["missing_name"] += 1
            continue
        if price is None and not IMPORT_NO_PRICE:
            skipped["missing_price"] += 1
            continue
        if price is None:
            price = NO_PRICE_VALUE
        brand = infer_brand(name, detail.get("brand"))
        model = detail.get("model")
        cover_image = str(detail.get("image") or avi.FALLBACK_IMAGE)
        if cover_image.startswith("data:"):
            cover_image = avi.FALLBACK_IMAGE
        detail_images = [
            str(item)[:1024]
            for item in detail.get("images") or []
            if str(item).startswith(("http://", "https://", "/uploads/", "/api/uploads/"))
        ][:12]
        brand_id, model_id = avi.ensure_brand_model(
            token,
            brand_name_to_id,
            model_key_to_id,
            str(brand) if brand else None,
            str(model) if model else None,
            cover_image,
        )
        sku = str(detail.get("sku") or "").strip()
        product_id = f"avi-{avi.slug(sku or listing.url.rsplit('/', 1)[-1], 58)}"[:64]
        payload = {
            "id": product_id,
            "name": name[:240],
            "brand": brand,
            "model": model,
            "reference": detail.get("reference"),
            "collection": str(model or brand or BRAND_TEXT)[:256],
            "price": float(price),
            "originalPrice": None,
            "image": cover_image[:1024],
            "images": detail_images,
            "tag": avi.AVI_TAG,
            "category": avi.AVI_CATEGORY_ID,
            "description": str(detail.get("description") or name)[:3000],
            "status": "on",
            "specGroups": [{"name": "Source", "options": ["Avi & Co."]}],
            "skus": [
                {
                    "id": (sku or product_id)[:64],
                    "specs": {"Source": "Avi & Co."},
                    "price": float(price),
                    "originalPrice": None,
                    "stock": 1,
                    "enabled": True,
                }
            ],
            "brandId": brand_id,
            "modelId": model_id,
        }
        shared.watch_shop_upsert("/api/admin/products", token, payload)
        imported += 1
        time.sleep(0.25)
    print(json.dumps({"brand": BRAND_TEXT, "cards_seen": len(cards), "products_imported": imported, "products_skipped": skipped}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"IMPORT FAILED: {exc}", file=sys.stderr)
        raise
