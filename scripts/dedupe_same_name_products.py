#!/usr/bin/env python3
import html
from collections import defaultdict

import import_wc_api


def normalized_name(name):
    return " ".join(html.unescape((name or "").strip()).lower().split())


def collect_images(product):
    urls = []
    cover = product.get("image")
    if isinstance(cover, str) and cover.strip():
        urls.append(cover.strip())

    images = product.get("images") or []
    if isinstance(images, list):
        for url in images:
            if isinstance(url, str) and url.strip() and url.strip() not in urls:
                urls.append(url.strip())
    return urls


def keep_key(product):
    urls = collect_images(product)
    non_fallback = 0 if product.get("image") == import_wc_api.FALLBACK_IMAGE else 1
    try:
        ref = int(str(product.get("reference") or "0") or "0")
    except ValueError:
        ref = 0
    return (len(urls), non_fallback, ref)


def main():
    login = import_wc_api.watch_shop_req(
        "POST",
        "/api/admin/auth/login",
        data={"username": "admin", "password": "admin123"},
    )
    token = login["token"]
    products = import_wc_api.watch_shop_req("GET", "/api/admin/products", token=token) or []

    by_name = defaultdict(list)
    for product in products:
        name = normalized_name(product.get("name"))
        if name:
            by_name[name].append(product)

    stats = {"groups": 0, "updated": 0, "deleted": 0}
    for name, group in by_name.items():
        if len(group) <= 1:
            continue

        stats["groups"] += 1
        keep = max(group, key=keep_key)
        others = [product for product in group if product["id"] != keep["id"]]

        merged_images = []
        for product in [keep] + others:
            for url in collect_images(product):
                if url not in merged_images:
                    merged_images.append(url)
        merged_images = merged_images[:20]

        preferred_cover = keep.get("image")
        if not preferred_cover or preferred_cover == import_wc_api.FALLBACK_IMAGE:
            preferred_cover = next(
                (url for url in merged_images if url != import_wc_api.FALLBACK_IMAGE),
                merged_images[0] if merged_images else preferred_cover,
            )

        changed = False
        if keep.get("images") != merged_images:
            keep["images"] = merged_images
            changed = True
        if preferred_cover and keep.get("image") != preferred_cover:
            keep["image"] = preferred_cover
            changed = True

        if changed:
            import_wc_api.watch_shop_req(
                "PUT",
                f"/api/admin/products/{keep['id']}",
                token=token,
                data=keep,
            )
            stats["updated"] += 1

        for product in others:
            import_wc_api.watch_shop_req(
                "DELETE",
                f"/api/admin/products/{product['id']}",
                token=token,
            )
            stats["deleted"] += 1

    print(stats)


if __name__ == "__main__":
    main()
