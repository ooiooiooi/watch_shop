import urllib.parse

import import_wc_api


def choose_keep(group):
    def rank(brand):
        brand_id = str(brand.get("id") or "")
        if not brand_id.startswith("wc-brand-"):
            return (0, len(brand_id), brand_id)
        if brand_id.startswith("wc-"):
            return (1, len(brand_id), brand_id)
        return (2, len(brand_id), brand_id)

    return sorted(group, key=rank)[0]


def list_duplicate_groups(brands):
    name_to_brands = {}
    for brand in brands:
        name = str(brand.get("name") or "").strip().lower()
        if not name:
            continue
        name_to_brands.setdefault(name, []).append(brand)
    return {name: group for name, group in name_to_brands.items() if len(group) > 1}


def main():
    login = import_wc_api.watch_shop_req(
        "POST",
        "/api/admin/auth/login",
        data={
            "username": import_wc_api.WATCH_SHOP_ADMIN_USER,
            "password": import_wc_api.WATCH_SHOP_ADMIN_PASS,
        },
    )
    token = login["token"]

    brands = import_wc_api.watch_shop_req("GET", "/api/admin/brands", token=token) or []
    duplicate_groups = list_duplicate_groups(brands)
    print(f"Duplicate brand groups: {len(duplicate_groups)}")

    migrated_products = 0
    migrated_models = 0
    deleted_brands = 0

    for name, group in sorted(duplicate_groups.items()):
        keep = choose_keep(group)
        others = [brand for brand in group if brand["id"] != keep["id"]]
        print(f"Merging brand '{name}' into {keep['id']}")

        for other in others:
            old_id = other["id"]
            print(f"  Re-mapping {old_id} -> {keep['id']}")

            models = import_wc_api.watch_shop_req(
                "GET",
                f"/api/admin/models?brandId={urllib.parse.quote(old_id)}",
                token=token,
            ) or []
            for model in models:
                model["brandId"] = keep["id"]
                import_wc_api.watch_shop_req(
                    "PUT",
                    f"/api/admin/models/{urllib.parse.quote(model['id'])}",
                    token=token,
                    data=model,
                )
                migrated_models += 1

            page = 0
            while True:
                result = import_wc_api.watch_shop_req(
                    "GET",
                    f"/api/admin/products/page?page={page}&size=100",
                    token=token,
                ) or {}
                items = result.get("items") or []
                if not items:
                    break
                for product in items:
                    if product.get("brandId") == old_id:
                        product["brandId"] = keep["id"]
                        product["brand"] = keep["name"]
                        import_wc_api.watch_shop_req(
                            "PUT",
                            f"/api/admin/products/{urllib.parse.quote(product['id'])}",
                            token=token,
                            data=product,
                        )
                        migrated_products += 1
                page += 1

            renamed_brand = dict(other)
            renamed_brand["name"] = f"merged-{old_id}"[:128]
            import_wc_api.watch_shop_req(
                "PUT",
                f"/api/admin/brands/{urllib.parse.quote(old_id)}",
                token=token,
                data=renamed_brand,
            )

            import_wc_api.watch_shop_req(
                "DELETE",
                f"/api/admin/brands/{urllib.parse.quote(old_id)}",
                token=token,
            )
            deleted_brands += 1
            print(f"  Deleted duplicate brand {old_id}")

    print("Done.")
    print(f"Products migrated: {migrated_products}")
    print(f"Models migrated: {migrated_models}")
    print(f"Brands deleted: {deleted_brands}")


if __name__ == "__main__":
    main()
