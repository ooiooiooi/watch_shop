#!/usr/bin/env python3
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict
from typing import Optional


CSV_PATH = "/Users/mac/Downloads/wc-product-export-20-4-2026-1776648951166.csv"
BASE = os.getenv("WATCH_SHOP_BASE", "http://localhost:8080")
ADMIN_USER = os.getenv("WATCH_SHOP_ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("WATCH_SHOP_ADMIN_PASS", "admin123")


def req(method: str, path: str, data=None, token: Optional[str] = None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = None if data is None else json.dumps(data, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {path} -> {e.code}: {msg[:300]}")


def slug(value: str) -> str:
    v = (value or "").strip().lower()
    v = re.sub(r"[^a-z0-9]+", "-", v).strip("-")
    return v[:48] or "cat"


def first_image(images: str) -> str:
    if not images:
        return ""
    for part in images.split(","):
        u = part.strip()
        if u.startswith("http://") or u.startswith("https://"):
            return u
    return ""


def to_float(value: str):
    v = (value or "").strip()
    if not v:
        return None
    try:
        return float(v)
    except Exception:
        return None


def to_int(value: str, default: int = 0) -> int:
    v = (value or "").strip()
    if not v:
        return default
    try:
        return max(0, int(float(v)))
    except Exception:
        return default


def category_leaf(categories: str) -> str:
    text = (categories or "").strip()
    if not text:
        return "Imported"
    first = text.split(",")[0].strip()
    leaf = first.split(">")[-1].strip()
    return leaf or "Imported"


def strip_html(text: str) -> str:
    if not text:
        return ""
    out = re.sub(r"<[^>]+>", " ", text)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def main() -> int:
    if not os.path.exists(CSV_PATH):
        print(f"CSV not found: {CSV_PATH}")
        return 1

    print("Login admin...")
    login = req("POST", "/api/admin/auth/login", {"username": ADMIN_USER, "password": ADMIN_PASS})
    token = login["token"]
    print("Login OK")

    print("Load current catalog...")
    products = req("GET", "/api/admin/products", token=token) or []
    categories = req("GET", "/api/admin/categories", token=token) or []
    print(f"Current products={len(products)}, categories={len(categories)}")

    print("Delete old products...")
    for i, p in enumerate(products, 1):
        req("DELETE", f"/api/admin/products/{urllib.parse.quote(p['id'])}", token=token)
        if i % 300 == 0:
            print(f"Deleted products {i}/{len(products)}")

    print("Delete old categories...")
    for c in categories:
        req("DELETE", f"/api/admin/categories/{urllib.parse.quote(c['id'])}", token=token)

    category_map: OrderedDict[str, dict] = OrderedDict()
    rows = []
    stats = {
        "rows_total": 0,
        "rows_simple": 0,
        "rows_variation_skipped": 0,
        "rows_other_skipped": 0,
        "simple_missing_image": 0,
        "simple_missing_price": 0,
    }

    print("Parse CSV...")
    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            stats["rows_total"] += 1
            row_type = (row.get("Type") or "").strip().lower()
            if row_type == "variation":
                stats["rows_variation_skipped"] += 1
                continue
            if row_type != "simple":
                stats["rows_other_skipped"] += 1
                continue

            stats["rows_simple"] += 1
            name = (row.get("Name") or "").strip()
            if not name:
                continue

            image = first_image(row.get("Images") or "")
            if not image:
                stats["simple_missing_image"] += 1
                continue

            regular = to_float(row.get("Regular price"))
            sale = to_float(row.get("Sale price"))
            price = sale if sale is not None and sale > 0 else regular
            if price is None:
                stats["simple_missing_price"] += 1
                continue
            original = regular if sale is not None and regular and regular > sale else None

            leaf = category_leaf(row.get("Categories") or "")
            cat_id = slug(leaf)
            if cat_id not in category_map:
                category_map[cat_id] = {
                    "id": cat_id,
                    "name": leaf,
                    "image": image,
                }

            sku = (row.get("SKU") or "").strip()
            wp_id = (row.get("ID") or "").strip()
            product_id = slug(sku) if sku else f"wp-{wp_id or len(rows) + 1}"
            if not product_id:
                product_id = f"wp-{len(rows) + 1}"

            in_stock = (row.get("In stock?") or "1").strip().lower() not in {"0", "false"}
            published = (row.get("Published") or "1").strip().lower() not in {"0", "false"}
            status = "on" if (published and in_stock) else "off"
            stock = to_int(row.get("Stock"), 100)

            desc = strip_html((row.get("Short description") or "").strip())
            if not desc:
                desc = strip_html((row.get("Description") or "").strip())
            if not desc:
                desc = name

            rows.append(
                {
                    "id": product_id,
                    "name": name[:240],
                    "brand": None,
                    "model": None,
                    "reference": wp_id or None,
                    "collection": leaf[:120] if leaf else "Imported",
                    "price": price,
                    "originalPrice": original,
                    "image": image,
                    "tag": "CSV",
                    "category": cat_id,
                    "description": desc[:3000],
                    "status": status,
                    "specGroups": [{"name": "Type", "options": ["simple"]}],
                    "skus": [
                        {
                            "id": (sku[:64] if sku else f"{product_id}-simple"),
                            "specs": {"Type": "simple"},
                            "price": price,
                            "originalPrice": original,
                            "stock": stock,
                            "enabled": bool(in_stock),
                        }
                    ],
                }
            )

    print(
        f"Prepared categories={len(category_map)}, products={len(rows)}, "
        f"variation_skipped={stats['rows_variation_skipped']}"
    )

    print("Create categories...")
    for i, c in enumerate(category_map.values(), 1):
        req("POST", "/api/admin/categories", c, token)
        if i % 100 == 0:
            print(f"Created categories {i}/{len(category_map)}")

    print("Create products...")
    ok, fail = 0, 0
    for i, p in enumerate(rows, 1):
        try:
            req("POST", "/api/admin/products", p, token)
            ok += 1
        except Exception as e:
            fail += 1
            if fail <= 20:
                print(f"Product failed: {p['id']} -> {str(e)[:180]}")
        if i % 200 == 0:
            print(f"Progress {i}/{len(rows)} | ok={ok} fail={fail}")

    print("IMPORT DONE")
    print(
        json.dumps(
            {
                "categories_created": len(category_map),
                "products_created": ok,
                "products_failed": fail,
                **stats,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
