#!/usr/bin/env python3
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

import import_wc_api as shared


AVI_BASE = os.getenv("AVI_BASE", "https://www.aviandco.com").rstrip("/")
AVI_LIST_URL = os.getenv("AVI_LIST_URL", f"{AVI_BASE}/shop-by-brand")
AVI_MAX_PAGES = max(1, int(os.getenv("AVI_MAX_PAGES", "1")))
AVI_IMPORT_LIMIT = max(0, int(os.getenv("AVI_IMPORT_LIMIT", "0")))
AVI_SLEEP_MS = max(0, int(os.getenv("AVI_SLEEP_MS", "350")))
AVI_FETCH_DETAILS = os.getenv("AVI_FETCH_DETAILS", "true").lower() in {"1", "true", "yes", "y"}
AVI_CLEAR_EXISTING = os.getenv("AVI_CLEAR_EXISTING", "false").lower() in {"1", "true", "yes", "y"}
AVI_USER_AGENT = os.getenv(
    "AVI_USER_AGENT",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
)
AVI_COOKIE = os.getenv("AVI_COOKIE", "").strip()
AVI_CATEGORY_ID = os.getenv("AVI_CATEGORY_ID", "aviandco-watches")
AVI_CATEGORY_NAME = os.getenv("AVI_CATEGORY_NAME", "Avi & Co. Watches")
AVI_TAG = os.getenv("AVI_TAG", "Avi & Co.")
AVI_FETCH_MODE = os.getenv("AVI_FETCH_MODE", "browser").strip().lower()
AVI_NODE_BIN = os.getenv(
    "AVI_NODE_BIN",
    "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
)
AVI_BROWSER_HELPER = os.getenv(
    "AVI_BROWSER_HELPER",
    os.path.join(os.path.dirname(__file__), "aviandco_browser_fetch.mjs"),
)
AVI_STORAGE_STATE = os.getenv("AVI_STORAGE_STATE", "").strip()
FALLBACK_IMAGE = shared.FALLBACK_IMAGE


@dataclass
class ListingProduct:
    url: str
    name: str = ""
    price: Optional[float] = None
    image: str = ""


def compact_text(value: str) -> str:
    text = html.unescape(value or "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def first_match(patterns: Iterable[str], text: str, flags: int = re.IGNORECASE | re.DOTALL) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, flags)
        if match:
            return compact_text(match.group(1))
    return ""


def parse_money(value: str) -> Optional[float]:
    if not value:
        return None
    cleaned = re.sub(r"[^0-9.]", "", value)
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def request_headers() -> Dict[str, str]:
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": AVI_USER_AGENT,
    }
    if AVI_COOKIE:
        headers["Cookie"] = AVI_COOKIE
    return headers


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers=request_headers(), method="GET")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        hint = " 可通过 AVI_COOKIE 提供浏览器 Cookie 后重试。" if exc.code in {401, 403} else ""
        raise RuntimeError(f"GET {url} -> {exc.code}: {body[:180]}{hint}") from exc


def browser_fetch(mode: str, url: str) -> Dict[str, Any]:
    cmd = [AVI_NODE_BIN, AVI_BROWSER_HELPER, mode, url]
    env = os.environ.copy()
    env.setdefault(
        "NODE_PATH",
        "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
    )
    if AVI_STORAGE_STATE:
        env["AVI_STORAGE_STATE"] = AVI_STORAGE_STATE
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, timeout=180)
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"browser fetch failed ({mode}) for {url}: {detail[:500]}")
    try:
        payload = json.loads(proc.stdout or "{}")
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"browser fetch returned invalid JSON for {url}: {(proc.stdout or '')[:300]}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError(f"browser fetch returned unexpected payload for {url}")
    return payload


def absolute_url(url: str) -> str:
    return urllib.parse.urljoin(AVI_BASE + "/", html.unescape(url or ""))


def listing_page_url(page: int) -> str:
    if page <= 1:
        return AVI_LIST_URL
    parsed = urllib.parse.urlsplit(AVI_LIST_URL)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    query = [(k, v) for k, v in query if k.lower() != "p"]
    query.append(("p", str(page)))
    return urllib.parse.urlunsplit(parsed._replace(query=urllib.parse.urlencode(query)))


def product_blocks(page_html: str) -> List[str]:
    blocks = re.findall(
        r"<li\b[^>]*class=[\"'][^\"']*\bproduct-item\b[^\"']*[\"'][^>]*>.*?</li>",
        page_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if blocks:
        return blocks
    return re.findall(
        r"<div\b[^>]*class=[\"'][^\"']*\bproduct-item\b[^\"']*[\"'][^>]*>.*?</div>",
        page_html,
        flags=re.IGNORECASE | re.DOTALL,
    )


def parse_listing(page_html: str) -> List[ListingProduct]:
    out: List[ListingProduct] = []
    seen: set[str] = set()
    blocks = product_blocks(page_html)
    if not blocks:
        blocks = [page_html]

    for block in blocks:
        href = first_match(
            [
                r"<a\b[^>]*class=[\"'][^\"']*\bproduct-item-link\b[^\"']*[\"'][^>]*href=[\"']([^\"']+)",
                r"<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*class=[\"'][^\"']*\bproduct-item-link\b",
            ],
            block,
        )
        name = first_match(
            [
                r"<a\b[^>]*class=[\"'][^\"']*\bproduct-item-link\b[^\"']*[\"'][^>]*>(.*?)</a>",
                r"itemprop=[\"']name[\"'][^>]*>(.*?)</",
            ],
            block,
        )
        image = first_match(
            [
                r"<img\b[^>]*(?:data-src|src)=[\"']([^\"']+)[\"'][^>]*class=[\"'][^\"']*\bproduct-image-photo\b",
                r"<img\b[^>]*class=[\"'][^\"']*\bproduct-image-photo\b[^\"']*[\"'][^>]*(?:data-src|src)=[\"']([^\"']+)",
            ],
            block,
        )
        price_raw = first_match(
            [
                r"data-price-amount=[\"']([^\"']+)",
                r"<span\b[^>]*class=[\"'][^\"']*\bprice\b[^\"']*[\"'][^>]*>(.*?)</span>",
            ],
            block,
        )
        if not href:
            continue
        url = absolute_url(href)
        if not url.startswith(AVI_BASE + "/") or url in seen:
            continue
        seen.add(url)
        out.append(ListingProduct(url=url, name=name, price=parse_money(price_raw), image=absolute_url(image) if image else ""))
    return out


def fetch_listing(page: int) -> List[ListingProduct]:
    page_url = listing_page_url(page)
    if AVI_FETCH_MODE == "browser":
        payload = browser_fetch("listing", page_url)
        raw_products = payload.get("products") or []
        out: List[ListingProduct] = []
        seen: set[str] = set()
        for item in raw_products:
            if not isinstance(item, dict):
                continue
            url = absolute_url(str(item.get("url") or ""))
            if not url or url in seen:
                continue
            seen.add(url)
            out.append(
                ListingProduct(
                    url=url,
                    name=compact_text(str(item.get("name") or "")),
                    price=parse_money(str(item.get("price") or "")),
                    image=absolute_url(str(item.get("image") or "")) if item.get("image") else "",
                )
            )
        return out
    return parse_listing(fetch_html(page_url))


def parse_json_ld(page_html: str) -> List[Dict[str, Any]]:
    docs: List[Dict[str, Any]] = []
    for raw in re.findall(
        r"<script\b[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
        page_html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        try:
            parsed = json.loads(html.unescape(raw).strip())
        except Exception:
            continue
        if isinstance(parsed, list):
            docs.extend([item for item in parsed if isinstance(item, dict)])
        elif isinstance(parsed, dict):
            docs.append(parsed)
    return docs


def parse_product_detail(page_html: str, listing: ListingProduct) -> Dict[str, Any]:
    docs = parse_json_ld(page_html)
    product_doc = next((doc for doc in docs if str(doc.get("@type") or "").lower() == "product"), {})
    offers = product_doc.get("offers") if isinstance(product_doc, dict) else None
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    if not isinstance(offers, dict):
        offers = {}

    name = compact_text(str(product_doc.get("name") or "")) or first_match(
        [
            r"<h1\b[^>]*>(.*?)</h1>",
            r"<meta\b[^>]*property=[\"']og:title[\"'][^>]*content=[\"']([^\"']+)",
        ],
        page_html,
    ) or listing.name
    sku = compact_text(str(product_doc.get("sku") or "")) or first_match(
        [
            r"itemprop=[\"']sku[\"'][^>]*>(.*?)</",
            r"(?:Sku#|SKU:)\s*</?[^>]*>\s*([^<\s]+)",
        ],
        page_html,
    )
    description = compact_text(str(product_doc.get("description") or "")) or first_match(
        [
            r"<div\b[^>]*class=[\"'][^\"']*\bproduct\.attribute\.description\b[^\"']*[\"'][^>]*>(.*?)</div>",
            r"<meta\b[^>]*name=[\"']description[\"'][^>]*content=[\"']([^\"']+)",
        ],
        page_html,
    )
    image_values = product_doc.get("image") if isinstance(product_doc, dict) else None
    images: List[str] = []
    if isinstance(image_values, str):
        images.append(absolute_url(image_values))
    elif isinstance(image_values, list):
        images.extend([absolute_url(str(item)) for item in image_values if item])
    og_image = first_match([r"<meta\b[^>]*property=[\"']og:image[\"'][^>]*content=[\"']([^\"']+)"], page_html)
    if og_image:
        images.insert(0, absolute_url(og_image))
    if listing.image:
        images.append(listing.image)
    images = [item for i, item in enumerate(images) if item and item not in images[:i]]

    price = parse_money(str(offers.get("price") or "")) or listing.price
    if price is None:
        price = parse_money(
            first_match(
                [
                    r"data-price-amount=[\"']([^\"']+)",
                    r"(?:List Price|Price):?\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)",
                ],
                page_html,
            )
        )

    body_text = compact_text(page_html)
    brand = first_match([r"Brand:\s*([A-Za-z0-9.&' -]+)"], body_text) or shared.infer_brand_from_name(name)
    model = first_match([r"Model:\s*([A-Za-z0-9.&'~ -]+)"], body_text) or shared.infer_model_from_name(name, brand)
    reference = first_match([r"Reference Number:\s*([A-Za-z0-9/.-]+)"], body_text)
    if not reference:
        ref_match = re.search(r"\b([A-Z0-9]{2,}[/-][A-Z0-9-]+)\b", name)
        reference = ref_match.group(1) if ref_match else ""

    return {
        "name": name,
        "sku": sku,
        "description": description or name,
        "images": images,
        "image": images[0] if images else FALLBACK_IMAGE,
        "price": price,
        "brand": brand or None,
        "model": model or None,
        "reference": reference or None,
    }


def browser_product_detail(listing: ListingProduct) -> Dict[str, Any]:
    payload = browser_fetch("detail", listing.url)
    return browser_product_detail_from_payload(payload, listing)


def browser_product_detail_from_payload(payload: Dict[str, Any], listing: ListingProduct) -> Dict[str, Any]:
    name = compact_text(str(payload.get("name") or "")) or listing.name
    sku = compact_text(str(payload.get("sku") or ""))
    description = compact_text(str(payload.get("description") or "")) or name
    price = parse_money(str(payload.get("price") or "")) or listing.price
    images = [absolute_url(str(item)) for item in payload.get("images") or [] if item]
    if listing.image:
        images.append(listing.image)
    images = [item for i, item in enumerate(images) if item and item not in images[:i]]
    spec_text = compact_text(str(payload.get("specText") or ""))
    brand = first_match([r"Brand:\s*([A-Za-z0-9.&' -]+)"], spec_text) or shared.infer_brand_from_name(name)
    model = first_match([r"Model:\s*([A-Za-z0-9.&'~ -]+)"], spec_text) or shared.infer_model_from_name(name, brand)
    reference = first_match([r"Reference Number:\s*([A-Za-z0-9/.-]+)"], spec_text)
    if not reference:
        ref_match = re.search(r"\b([A-Z0-9]{2,}[/-][A-Z0-9-]+)\b", name)
        reference = ref_match.group(1) if ref_match else ""
    return {
        "name": name,
        "sku": sku,
        "description": description,
        "images": images,
        "image": images[0] if images else FALLBACK_IMAGE,
        "price": price,
        "brand": brand or None,
        "model": model or None,
        "reference": reference or None,
    }


def slug(value: str, max_len: int = 64) -> str:
    return shared.slug(value, max_len)


def clear_existing_catalog(token: str) -> None:
    products = shared.watch_shop_req("GET", "/api/admin/products", token=token) or []
    categories = shared.watch_shop_req("GET", "/api/admin/categories", token=token) or []
    brands = shared.watch_shop_req("GET", "/api/admin/brands", token=token) or []
    models = shared.watch_shop_req("GET", "/api/admin/models", token=token) or []
    for item in products:
        shared.watch_shop_req("DELETE", f"/api/admin/products/{urllib.parse.quote(str(item['id']))}", token=token)
    for item in categories:
        shared.watch_shop_req("DELETE", f"/api/admin/categories/{urllib.parse.quote(str(item['id']))}", token=token)
    for item in models:
        shared.watch_shop_req("DELETE", f"/api/admin/models/{urllib.parse.quote(str(item['id']))}", token=token)
    for item in brands:
        shared.watch_shop_req("DELETE", f"/api/admin/brands/{urllib.parse.quote(str(item['id']))}", token=token)


def ensure_brand_model(
    token: str,
    brand_name_to_id: Dict[str, str],
    model_key_to_id: Dict[Tuple[str, str], str],
    brand: Optional[str],
    model: Optional[str],
    cover_image: str,
) -> Tuple[Optional[str], Optional[str]]:
    brand_id = None
    model_id = None
    if brand:
        lookup = shared.normalize_lookup_name(brand)
        if lookup not in brand_name_to_id:
            brand_id_candidate = f"avi-brand-{slug(brand, 48)}"[:64]
            try:
                shared.watch_shop_req(
                    "POST",
                    "/api/admin/brands",
                    token=token,
                    data={"id": brand_id_candidate, "name": brand[:128], "image": cover_image[:1024]},
                )
                brand_name_to_id[lookup] = brand_id_candidate
            except Exception:
                shared.prefill_brand_cache(token, brand_name_to_id)
        brand_id = brand_name_to_id.get(lookup)

    if brand_id and model:
        key = (brand_id, shared.normalize_lookup_name(model))
        if key not in model_key_to_id:
            model_id_candidate = f"{brand_id}-{slug(model, 40)}"[:64]
            try:
                shared.watch_shop_req(
                    "POST",
                    "/api/admin/models",
                    token=token,
                    data={"id": model_id_candidate, "brandId": brand_id, "name": model[:256], "image": cover_image[:1024]},
                )
                model_key_to_id[key] = model_id_candidate
            except Exception:
                shared.prefill_model_cache(token, model_key_to_id)
        model_id = model_key_to_id.get(key)
    return brand_id, model_id


def main() -> int:
    login = shared.watch_shop_req(
        "POST",
        "/api/admin/auth/login",
        data={"username": shared.WATCH_SHOP_ADMIN_USER, "password": shared.WATCH_SHOP_ADMIN_PASS},
    )
    token = login["token"]
    if AVI_CLEAR_EXISTING:
        clear_existing_catalog(token)

    shared.watch_shop_upsert(
        "/api/admin/categories",
        token,
        {"id": AVI_CATEGORY_ID, "name": AVI_CATEGORY_NAME, "image": FALLBACK_IMAGE},
    )
    brand_name_to_id: Dict[str, str] = {}
    model_key_to_id: Dict[Tuple[str, str], str] = {}
    shared.prefill_brand_cache(token, brand_name_to_id)
    shared.prefill_model_cache(token, model_key_to_id)

    listings: List[ListingProduct] = []
    seen_urls: set[str] = set()
    for page in range(1, AVI_MAX_PAGES + 1):
        parsed = fetch_listing(page)
        fresh = [item for item in parsed if item.url not in seen_urls]
        if not fresh:
            break
        listings.extend(fresh)
        seen_urls.update(item.url for item in fresh)
        if AVI_IMPORT_LIMIT and len(listings) >= AVI_IMPORT_LIMIT:
            listings = listings[:AVI_IMPORT_LIMIT]
            break
        if AVI_SLEEP_MS:
            time.sleep(AVI_SLEEP_MS / 1000)

    imported = 0
    skipped = {"missing_name": 0, "missing_price": 0}
    for listing in listings:
        detail = (
            browser_product_detail(listing)
            if AVI_FETCH_DETAILS and AVI_FETCH_MODE == "browser"
            else parse_product_detail(fetch_html(listing.url), listing)
            if AVI_FETCH_DETAILS
            else {
            "name": listing.name,
            "sku": "",
            "description": listing.name,
            "images": [listing.image] if listing.image else [],
            "image": listing.image or FALLBACK_IMAGE,
            "price": listing.price,
            "brand": shared.infer_brand_from_name(listing.name),
            "model": None,
            "reference": None,
            }
        )
        name = str(detail["name"] or "").strip()
        price = detail["price"]
        if not name:
            skipped["missing_name"] += 1
            continue
        if price is None:
            skipped["missing_price"] += 1
            continue

        brand = detail.get("brand")
        model = detail.get("model")
        cover_image = str(detail.get("image") or FALLBACK_IMAGE)
        brand_id, model_id = ensure_brand_model(
            token,
            brand_name_to_id,
            model_key_to_id,
            str(brand) if brand else None,
            str(model) if model else None,
            cover_image,
        )
        sku = str(detail.get("sku") or "").strip()
        product_id = f"avi-{slug(sku or listing.url.rsplit('/', 1)[-1], 58)}"[:64]
        payload = {
            "id": product_id,
            "name": name[:240],
            "brand": brand,
            "model": model,
            "reference": detail.get("reference"),
            "collection": str(model or brand or AVI_CATEGORY_NAME)[:256],
            "price": float(price),
            "originalPrice": None,
            "image": cover_image[:1024],
            "images": [str(item)[:1024] for item in detail.get("images") or []][:12],
            "tag": AVI_TAG,
            "category": AVI_CATEGORY_ID,
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
        if imported % 25 == 0:
            print(f"Imported {imported}/{len(listings)} products")
        if AVI_SLEEP_MS:
            time.sleep(AVI_SLEEP_MS / 1000)

    print(
        json.dumps(
            {
                "listings_seen": len(listings),
                "products_imported": imported,
                "products_skipped": skipped,
                "detail_fetch": AVI_FETCH_DETAILS,
                "fetch_mode": AVI_FETCH_MODE,
                "pages_requested": AVI_MAX_PAGES,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"IMPORT FAILED: {exc}", file=sys.stderr)
        raise
