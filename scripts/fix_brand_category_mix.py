#!/usr/bin/env python3
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple


def load_env_file(path: str) -> None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if not s or s.startswith("#"):
                    continue
                if "=" not in s:
                    continue
                k, v = s.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if not k:
                    continue
                os.environ.setdefault(k, v)
    except FileNotFoundError:
        return


load_env_file(os.getenv("WATCH_SHOP_ENV_FILE", "/Users/mac/workspace/watch_shop/.env.local"))

BASE = os.getenv("WATCH_SHOP_BASE", "http://localhost:8080").rstrip("/")
ADMIN_USER = os.getenv("WATCH_SHOP_ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("WATCH_SHOP_ADMIN_PASS", "admin123")
FALLBACK_IMAGE = os.getenv(
    "WATCH_SHOP_FALLBACK_IMAGE",
    "https://www.manggata.com/wp-content/uploads/2025/09/Dong-Ho-Rolex-Cosmograph-Daytona-116588TBR-Vang-Khoi-Kim-Cuong-40mm-6.jpg",
)


KNOWN_BRANDS = [
    "Rolex",
    "Omega",
    "Cartier",
    "Patek Philippe",
    "Audemars Piguet",
    "Vacheron Constantin",
    "Jaeger Lecoultre",
    "Panerai",
    "Blancpain",
    "Breitling",
    "Breguet",
    "Chopard",
    "Franck Muller",
    "Hublot",
    "IWC",
    "Longines",
    "Richard Mille",
    "Tag Heuer",
    "Tudor",
]


def slug(value: str, max_len: int = 56) -> str:
    v = (value or "").strip().lower()
    v = re.sub(r"[^a-z0-9]+", "-", v).strip("-")
    return (v[:max_len] if v else "x")


def http_json(method: str, url: str, data: Any = None, headers: Optional[Dict[str, str]] = None):
    h = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        h.update(headers)
    body = None if data is None else json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {url} -> {e.code}: {msg[:500]}")


def req(method: str, path: str, token: Optional[str] = None, data: Any = None):
    url = BASE + path
    headers: Dict[str, str] = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    return http_json(method, url, data=data, headers=headers)

def is_conflict_error(e: Exception) -> bool:
    return "-> 409:" in str(e)


def upsert_category(token: str, payload: Dict[str, Any]) -> None:
    try:
        req("POST", "/api/admin/categories", token=token, data=payload)
    except Exception as e:
        if is_conflict_error(e):
            cid = str(payload.get("id") or "").strip()
            req("PUT", f"/api/admin/categories/{urllib.parse.quote(cid)}", token=token, data=payload)
        else:
            raise


def normalize_cat_name(name: str) -> str:
    s = html.unescape(name or "").strip()
    s = re.sub(r"\s+", " ", s)
    return s


def base_name_for_brand(cat_name: str) -> str:
    s = normalize_cat_name(cat_name)
    s = re.sub(r"\bReplica Watch\b", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\bwatches\b", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s+", " ", s).strip(" -")
    return s


def match_brand(cat_name: str) -> Optional[str]:
    base = base_name_for_brand(cat_name)
    base_l = base.lower()
    for b in KNOWN_BRANDS:
        if base_l == b.lower():
            return b
    return None


def main() -> int:
    login = req("POST", "/api/admin/auth/login", data={"username": ADMIN_USER, "password": ADMIN_PASS})
    token = login["token"]

    categories = req("GET", "/api/admin/categories", token=token) or []
    if not isinstance(categories, list):
        print("bad categories response")
        return 1

    cat_id_to_name: Dict[str, str] = {c["id"]: normalize_cat_name(c.get("name") or "") for c in categories if isinstance(c, dict)}
    brand_cat_ids: Dict[str, str] = {}
    for cid, name in cat_id_to_name.items():
        b = match_brand(name)
        if b:
            brand_cat_ids[cid] = b

    replica_category_id = "replica-watch"
    upsert_category(token, {"id": replica_category_id, "name": "Replica Watch", "image": FALLBACK_IMAGE})

    brands_existing = req("GET", "/api/admin/brands", token=token) or []
    existing_brand_names = {str(b.get("name") or "").strip().lower() for b in brands_existing if isinstance(b, dict)}

    for brand in sorted(set(brand_cat_ids.values())):
        if brand.strip().lower() in existing_brand_names:
            continue
        bid = f"wc-brand-{slug(brand)}"[:64]
        req("POST", "/api/admin/brands", token=token, data={"id": bid, "name": brand, "image": FALLBACK_IMAGE})

    brands_existing = req("GET", "/api/admin/brands", token=token) or []
    brand_name_to_id = {str(b.get("name") or "").strip().lower(): str(b.get("id") or "").strip() for b in brands_existing if isinstance(b, dict)}

    products = req("GET", "/api/admin/products", token=token) or []
    if not isinstance(products, list):
        print("bad products response")
        return 1

    updated = 0
    skipped = 0
    scanned = 0

    for p in products:
        scanned += 1
        pid = str(p.get("id") or "").strip()
        if not pid:
            skipped += 1
            continue
        cat_id = str(p.get("category") or "").strip()
        brand = brand_cat_ids.get(cat_id)
        if not brand:
            skipped += 1
            continue
        p["category"] = replica_category_id
        p["collection"] = "Replica Watch"
        p["brand"] = brand
        p["brandId"] = brand_name_to_id.get(brand.strip().lower())
        req("PUT", f"/api/admin/products/{urllib.parse.quote(pid)}", token=token, data=p)
        updated += 1
        if updated % 300 == 0:
            print(f"updated={updated} scanned={scanned} total={len(products)}", flush=True)

    deleted = 0
    for cid in brand_cat_ids.keys():
        try:
            req("DELETE", f"/api/admin/categories/{urllib.parse.quote(cid)}", token=token)
            deleted += 1
        except Exception:
            pass

    print(
        json.dumps(
            {
                "brand_categories": len(brand_cat_ids),
                "updated_products": updated,
                "deleted_brand_categories": deleted,
                "skipped_products": skipped,
                "scanned": scanned,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
