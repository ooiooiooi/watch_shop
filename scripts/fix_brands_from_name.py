#!/usr/bin/env python3
import urllib.parse

import import_wc_api


ALIASES = [
    ("jaeger-lecoultre", "Jaeger Lecoultre"),
    ("jaeger lecoultre", "Jaeger Lecoultre"),
    ("f.p. journe", "F.P. Journe"),
    ("f.p.journe", "F.P. Journe"),
    ("jacob & co.", "Jacob & Co."),
    ("girard perregaux", "Girard Perregaux"),
    ("ulysse nardin", "Ulysse Nardin"),
    ("montblanc", "Montblanc"),
    ("chanel", "Chanel"),
    ("cvstos", "CVSTOS"),
    ("audears", "Audemars Piguet"),
    ("ademars", "Audemars Piguet"),
    ("audermars", "Audemars Piguet"),
    ("iwc shaffhausen", "IWC"),
]


def find_brand(name: str):
    lower_name = (name or "").lower()

    for pattern, brand in ALIASES:
        if pattern in lower_name:
            return brand

    for brand in import_wc_api.KNOWN_BRANDS:
        if brand.lower() in lower_name:
            return brand

    if lower_name.startswith("116243"):
        return "Rolex"
    if lower_name.startswith("15551st"):
        return "Audemars Piguet"

    return None

def main():
    login = import_wc_api.watch_shop_req("POST", "/api/admin/auth/login", data={"username": "admin", "password": "admin123"})
    token = login["token"]

    products = import_wc_api.watch_shop_req("GET", "/api/admin/products", token=token) or []

    total_updated = 0
    for p in products:
        if p.get("brand") and p.get("brandId"):
            continue

        name = p.get("name", "")
        found_brand = find_brand(name)

        if found_brand:
            bid = f"wc-brand-{import_wc_api.slug(found_brand)}"[:64]
            import_wc_api.watch_shop_upsert("/api/admin/brands", token, {"id": bid, "name": found_brand, "image": import_wc_api.FALLBACK_IMAGE})

            p["brand"] = found_brand
            p["brandId"] = bid
            import_wc_api.watch_shop_req("PUT", f"/api/admin/products/{urllib.parse.quote(p['id'])}", token=token, data=p)
            total_updated += 1
            if total_updated % 50 == 0:
                print(f"Updated {total_updated} products...")

    print(f"Done. Updated {total_updated} products total.")

if __name__ == "__main__":
    main()
