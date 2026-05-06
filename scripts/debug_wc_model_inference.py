import sys

sys.path.insert(0, "/Users/mac/workspace/watch_shop/scripts")

import import_wc_api


def main():
    keywords = [
        "Richard Mille RM 005",
        "Patek Philippe Nautilus",
        "Audemars Piguet Royal Oak",
        "Rolex Daytona",
    ]

    wc_categories = import_wc_api.fetch_all(
        "/wp-json/wc/v3/products/categories",
        {"hide_empty": False},
        per_page_override=100,
        sleep_ms_override=50,
    )
    category_index = {int(c["id"]): c for c in wc_categories if c.get("id") is not None}

    for keyword in keywords:
        products = import_wc_api.fetch_all(
            "/wp-json/wc/v3/products",
            {"search": keyword, "status": "publish"},
            per_page_override=20,
            sleep_ms_override=50,
        )
        print(f"\n=== {keyword} :: found={len(products)} ===")
        if not products:
            continue
        p = products[0]
        print("product:", p.get("name"))
        print("attributes:", [(a.get("name"), a.get("options")) for a in (p.get("attributes") or [])])
        cats = p.get("categories") or []
        for c in cats:
            cid = int(c.get("id")) if c.get("id") is not None else None
            chain = import_wc_api.category_chain_names(category_index, cid, str(c.get("name") or ""))
            print("chain:", chain)
        brand, model, selected_non_brand_cat, selected_model_cat = import_wc_api.infer_brand_model_from_categories(
            cats, category_index
        )
        print(
            {
                "brand_from_cat": brand,
                "model_from_cat": model,
                "selected_non_brand_cat": selected_non_brand_cat,
                "selected_model_cat": selected_model_cat,
            }
        )


if __name__ == "__main__":
    main()
