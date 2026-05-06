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
                
                # Fetch ALL models since brand filter might not catch them all
                page = 0
                while True:
                    res = import_wc_api.watch_shop_req("GET", f"/api/admin/models?brandId={urllib.parse.quote(old_id)}", token=token)
                    if not isinstance(res, list) or not res:
                        break
                    for m in res:
                        m["brandId"] = keep["id"]
                        import_wc_api.watch_shop_req("PUT", f"/api/admin/models/{urllib.parse.quote(m['id'])}", token=token, data=m)
                    break
                
                try:
                    import_wc_api.watch_shop_req("DELETE", f"/api/admin/brands/{urllib.parse.quote(old_id)}", token=token)
                    print(f"Deleted duplicate brand {old_id}")
                except Exception as e:
                    print(f"Failed to delete old brand {old_id}: {e}")
                
    print("Done cleaning up models and deleting duplicate brands.")

if __name__ == "__main__":
    main()
