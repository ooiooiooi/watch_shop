import sys, urllib.request, urllib.parse, json
import import_wc_api

def main():
    login = import_wc_api.watch_shop_req("POST", "/api/admin/auth/login", data={"username": "admin", "password": "admin123"})
    token = login["token"]
    
    brands = import_wc_api.watch_shop_req("GET", "/api/admin/brands", token=token) or []
    
    name_to_brands = {}
    for b in brands:
        name = b.get("name", "").strip().lower()
        if name not in name_to_brands:
            name_to_brands[name] = []
        name_to_brands[name].append(b)
        
    for name, group in name_to_brands.items():
        if len(group) > 1:
            print(f"Merging {name}...")
            keep = None
            for b in group:
                if not b["id"].startswith("wc-brand-"):
                    keep = b
                    break
            if not keep:
                keep = group[0]
                
            others = [b for b in group if b["id"] != keep["id"]]
            
            for other in others:
                old_id = other["id"]
                print(f"  Mapping {old_id} -> {keep['id']}")
                
                # Fetch ALL products since brand filter might not catch them all
                page = 0
                while True:
                    res = import_wc_api.watch_shop_req("GET", f"/api/admin/products/page?page={page}&size=100", token=token)
                    items = res.get("items") or []
                    if not items:
                        break
                    for p in items:
                        if p.get("brandId") == old_id:
                            p["brandId"] = keep["id"]
                            import_wc_api.watch_shop_req("PUT", f"/api/admin/products/{urllib.parse.quote(p['id'])}", token=token, data=p)
                    page += 1
                
                try:
                    import_wc_api.watch_shop_req("DELETE", f"/api/admin/brands/{urllib.parse.quote(old_id)}", token=token)
                except Exception as e:
                    print(f"  Failed to delete old brand {old_id}: {e}")
                
    print("Done merging brands.")

if __name__ == "__main__":
    main()
