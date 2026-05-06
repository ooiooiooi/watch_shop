#!/usr/bin/env python3
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional


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


def req(method: str, path: str, token: Optional[str] = None, data: Any = None):
    url = BASE + path
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = None if data is None else json.dumps(data, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {path} -> {e.code}: {msg[:400]}")


def main() -> int:
    login = req("POST", "/api/admin/auth/login", data={"username": ADMIN_USER, "password": ADMIN_PASS})
    token = login["token"]

    page = 0
    size = 100
    updated = 0
    skipped = 0
    total_seen = 0

    while True:
        res = req("GET", f"/api/admin/products/page?page={page}&size={size}", token=token) or {}
        items: List[Dict[str, Any]] = res.get("items") or []
        total = int(res.get("total") or 0)
        if not items:
            break
        for p in items:
            total_seen += 1
            imgs = p.get("images")
            if not isinstance(imgs, list) or len(imgs) < 2:
                skipped += 1
                continue
            second = str(imgs[1] or "").strip()
            if not second or not (second.startswith("http://") or second.startswith("https://")):
                skipped += 1
                continue
            current = str(p.get("image") or "").strip()
            if current == second:
                skipped += 1
                continue
            p["image"] = second
            pid = str(p.get("id") or "").strip()
            if not pid:
                skipped += 1
                continue
            req("PUT", f"/api/admin/products/{urllib.parse.quote(pid)}", token=token, data=p)
            updated += 1
            if updated % 200 == 0:
                print(f"updated={updated} scanned={total_seen} total={total}")
        if total_seen >= total:
            break
        page += 1

    print(json.dumps({"updated": updated, "skipped": skipped, "scanned": total_seen}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

