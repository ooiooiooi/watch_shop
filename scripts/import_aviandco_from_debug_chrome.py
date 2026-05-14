#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import time
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

import import_aviandco_catalog as avi
import import_wc_api as shared


DEBUG_HOST = os.getenv("AVI_DEBUG_HOST", "http://127.0.0.1:62305").rstrip("/")
TARGET_URL = os.getenv("AVI_DEBUG_TARGET_URL", "https://www.aviandco.com/shop-by-brand")
IMPORT_LIMIT = max(0, int(os.getenv("AVI_IMPORT_LIMIT", "20")))
FETCH_DETAILS = os.getenv("AVI_FETCH_DETAILS", "true").lower() in {"1", "true", "yes", "y"}
NODE_BIN = os.getenv(
    "AVI_NODE_BIN",
    "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
)
HELPER = os.path.join(os.path.dirname(__file__), "aviandco_debug_chrome_fetch.mjs")


def debug_fetch(mode: str, url: str = "") -> Dict[str, Any]:
    cmd = [NODE_BIN, HELPER, mode]
    if url:
        cmd.append(url)
    env = os.environ.copy()
    env["AVI_DEBUG_HOST"] = DEBUG_HOST
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, timeout=240)
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"debug chrome fetch failed ({mode}): {detail[:600]}")
    payload = json.loads(proc.stdout or "{}")
    if not isinstance(payload, dict):
        raise RuntimeError("debug chrome fetch returned unexpected payload")
    return payload


def listing_items() -> List[avi.ListingProduct]:
    payload = debug_fetch("listing", TARGET_URL)
    raw_items = payload.get("products") or []
    out: List[avi.ListingProduct] = []
    seen = set()
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        url = avi.absolute_url(str(item.get("url") or ""))
        if not url or url in seen:
            continue
        seen.add(url)
        out.append(
            avi.ListingProduct(
                url=url,
                name=avi.compact_text(str(item.get("name") or "")),
                price=avi.parse_money(str(item.get("price") or "")),
                image=avi.absolute_url(str(item.get("image") or "")) if item.get("image") else "",
            )
        )
        if IMPORT_LIMIT and len(out) >= IMPORT_LIMIT:
            break
    return out


def detail_item(listing: avi.ListingProduct) -> Dict[str, Any]:
    payload = debug_fetch("detail", listing.url)
    return avi.browser_product_detail_from_payload(payload, listing)


def ensure_brand_model(
    token: str,
    brand_name_to_id: Dict[str, str],
    model_key_to_id: Dict[Tuple[str, str], str],
    brand: Optional[str],
    model: Optional[str],
    cover_image: str,
) -> Tuple[Optional[str], Optional[str]]:
    return avi.ensure_brand_model(token, brand_name_to_id, model_key_to_id, brand, model, cover_image)


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

    listings = listing_items()
    imported = 0
    skipped = {"missing_name": 0, "missing_price": 0}
    for listing in listings:
        detail = detail_item(listing) if FETCH_DETAILS else {
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
        if price is None:
            skipped["missing_price"] += 1
            continue
        cover_image = str(detail.get("image") or avi.FALLBACK_IMAGE)
        brand = detail.get("brand")
        model = detail.get("model")
        brand_id, model_id = ensure_brand_model(
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
            "collection": str(model or brand or avi.AVI_CATEGORY_NAME)[:256],
            "price": float(price),
            "originalPrice": None,
            "image": cover_image[:1024],
            "images": [str(item)[:1024] for item in detail.get("images") or []][:12],
            "tag": avi.AVI_TAG,
            "category": avi.AVI_CATEGORY_ID,
            "description": str(detail.get("description") or name)[:3000],
            "status": "on",
            "specGroups": [{"name": "Source", "options": ["VS FACTORY"]}],
            "skus": [
                {
                    "id": (sku or product_id)[:64],
                    "specs": {"Source": "VS FACTORY"},
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
        time.sleep(0.3)

    print(json.dumps({"listings_seen": len(listings), "products_imported": imported, "products_skipped": skipped}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"IMPORT FAILED: {exc}", file=sys.stderr)
        raise
