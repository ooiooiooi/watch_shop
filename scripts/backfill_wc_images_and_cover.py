#!/usr/bin/env python3
import base64
import json
import os
import sys
import time
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

WATCH_SHOP_BASE = os.getenv("WATCH_SHOP_BASE", "http://localhost:8080").rstrip("/")
WATCH_SHOP_ADMIN_USER = os.getenv("WATCH_SHOP_ADMIN_USER", "admin")
WATCH_SHOP_ADMIN_PASS = os.getenv("WATCH_SHOP_ADMIN_PASS", "admin123")

WC_BASE = os.getenv("WC_BASE", "https://www.manggata.com").rstrip("/")
WC_CONSUMER_KEY = os.getenv("WC_CONSUMER_KEY", "")
WC_CONSUMER_SECRET = os.getenv("WC_CONSUMER_SECRET", "")

SLEEP_MS = int(os.getenv("WC_SLEEP_MS", "200"))
RETRY = int(os.getenv("WC_RETRY", "8"))
PER_PAGE = int(os.getenv("WATCH_SHOP_PAGE_SIZE", "100"))


def http_json(method: str, url: str, data: Any = None, headers: Optional[Dict[str, str]] = None):
    h = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "watch-shop-backfill/1.0",
        "Accept-Encoding": "identity",
    }
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


def watch_shop_req(method: str, path: str, token: Optional[str] = None, data: Any = None):
    url = WATCH_SHOP_BASE + path
    headers: Dict[str, str] = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    return http_json(method, url, data=data, headers=headers)


def wc_auth_header() -> Dict[str, str]:
    token = base64.b64encode(f"{WC_CONSUMER_KEY}:{WC_CONSUMER_SECRET}".encode("utf-8")).decode("ascii")
    return {"Authorization": f"Basic {token}"}


def wc_get(path: str, query: Optional[Dict[str, Any]] = None):
    q = urllib.parse.urlencode(query or {}, doseq=True)
    url = f"{WC_BASE}{path}?{q}" if q else f"{WC_BASE}{path}"
    last: Optional[Exception] = None
    for attempt in range(1, max(1, RETRY) + 1):
        try:
            if SLEEP_MS > 0:
                time.sleep(SLEEP_MS / 1000)
            return http_json("GET", url, headers=wc_auth_header())
        except Exception as e:
            last = e
            msg = str(e)
            retryable = any(k in msg for k in ["502", "503", "504", "timed out", "EOF", "reset"]) or isinstance(
                e, (urllib.error.URLError, ConnectionResetError)
            )
            if not retryable or attempt >= RETRY:
                raise
            time.sleep(min(20, 0.7 * (2 ** (attempt - 1))))
    raise last if last else RuntimeError("wc_get failed")


def parse_wc_id(product: Dict[str, Any]) -> Optional[int]:
    pid = str(product.get("id") or "").strip()
    if pid.startswith("wc-"):
        rest = pid[3:]
        num = ""
        for ch in rest:
            if ch.isdigit():
                num += ch
            else:
                break
        if num:
            return int(num)
    ref = str(product.get("reference") or "").strip()
    if ref.isdigit():
        return int(ref)
    return None


def pick_images_from_product(wp_product: Dict[str, Any]) -> List[str]:
    out: List[str] = []
    images = wp_product.get("images") or []
    if isinstance(images, list):
        for it in images:
            src = (it or {}).get("src") if isinstance(it, dict) else None
            if not src:
                continue
            u = str(src).strip()
            if u and u not in out:
                out.append(u)
    return out


def main() -> int:
    if not WC_CONSUMER_KEY or not WC_CONSUMER_SECRET:
        print("missing WC_CONSUMER_KEY/WC_CONSUMER_SECRET", flush=True)
        return 1

    print("backfill start", flush=True)
    login = watch_shop_req(
        "POST",
        "/api/admin/auth/login",
        data={"username": WATCH_SHOP_ADMIN_USER, "password": WATCH_SHOP_ADMIN_PASS},
    )
    token = login["token"]
    print("login ok", flush=True)

    page = 0
    updated = 0
    skipped = 0
    failed = 0
    scanned = 0

    while True:
        res = watch_shop_req("GET", f"/api/admin/products/page?page={page}&size={PER_PAGE}", token=token) or {}
        items: List[Dict[str, Any]] = res.get("items") or []
        total = int(res.get("total") or 0)
        if not items:
            break

        for p in items:
            scanned += 1
            wc_id = parse_wc_id(p)
            if wc_id is None:
                skipped += 1
                continue
            try:
                wp_product = wc_get(f"/wp-json/wc/v3/products/{wc_id}")
                if not isinstance(wp_product, dict):
                    failed += 1
                    continue
                gallery = pick_images_from_product(wp_product)
                p_type = str(wp_product.get("type") or "").strip().lower()
                if p_type == "variable":
                    vars_page = 1
                    while True:
                        vars_batch = wc_get(
                            f"/wp-json/wc/v3/products/{wc_id}/variations",
                            {"status": "any", "per_page": 100, "page": vars_page},
                        )
                        if not vars_batch:
                            break
                        if not isinstance(vars_batch, list):
                            break
                        for v in vars_batch:
                            v_img = (v.get("image") or {}).get("src") if isinstance(v, dict) else None
                            if v_img:
                                u = str(v_img).strip()
                                if u and u not in gallery:
                                    gallery.append(u)
                        if len(vars_batch) < 100:
                            break
                        vars_page += 1

                gallery = [u for u in gallery if isinstance(u, str) and u.strip()]
                if not gallery:
                    skipped += 1
                    continue

                cover = gallery[1] if len(gallery) >= 2 else gallery[0]
                if str(p.get("image") or "").strip() == cover and isinstance(p.get("images"), list) and p.get("images") == gallery[:20]:
                    skipped += 1
                    continue

                p["image"] = cover
                p["images"] = gallery[:20]
                pid = str(p.get("id") or "").strip()
                watch_shop_req("PUT", f"/api/admin/products/{urllib.parse.quote(pid)}", token=token, data=p)
                updated += 1
                if updated % 100 == 0:
                    print(f"updated={updated} scanned={scanned} total={total}", flush=True)
            except Exception:
                failed += 1

        if page % 5 == 0:
            print(f"page={page} scanned={scanned} updated={updated} skipped={skipped} failed={failed} total={total}", flush=True)
        if scanned >= total:
            break
        page += 1

    print(json.dumps({"updated": updated, "skipped": skipped, "failed": failed, "scanned": scanned}, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
