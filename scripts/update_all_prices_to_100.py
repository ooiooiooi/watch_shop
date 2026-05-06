#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8080"
USER = "admin"
PASS = "admin123"
FORCE_PRICE = 100.0


def main() -> int:
    login_req = urllib.request.Request(
        BASE + "/api/admin/auth/login",
        data=json.dumps({"username": USER, "password": PASS}).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(login_req, timeout=30) as r:
        token = json.loads(r.read().decode())["token"]

    headers = {
        "Authorization": "Bearer " + token,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    page = 0
    size = 100
    updated = 0

    while True:
        req = urllib.request.Request(f"{BASE}/api/admin/products/page?page={page}&size={size}", headers=headers)
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode())
        items = data.get("items") or []
        if not items:
            break

        for p in items:
            p["price"] = FORCE_PRICE
            p["originalPrice"] = None
            for sku in (p.get("skus") or []):
                sku["price"] = FORCE_PRICE
                sku["originalPrice"] = None

            put_req = urllib.request.Request(
                f"{BASE}/api/admin/products/{urllib.parse.quote(str(p['id']))}",
                data=json.dumps(p, ensure_ascii=False).encode(),
                headers=headers,
                method="PUT",
            )
            with urllib.request.urlopen(put_req, timeout=120) as r:
                r.read()
            updated += 1
            if updated % 100 == 0:
                print(f"updated {updated}", flush=True)

        page += 1
        if len(items) < size:
            break

    print(f"done {updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
