import sys, json, urllib.request, urllib.parse
import import_wc_api

login = import_wc_api.watch_shop_req("POST", "/api/admin/auth/login", data={"username": "admin", "password": "admin123"})
token = login["token"]

res = import_wc_api.watch_shop_req("GET", "/api/admin/products/page?page=0&size=1", token=token)
p = res.get("items")[0]
p["brand"] = "Rolex"
p["brandId"] = "wc-brand-rolex"
res2 = import_wc_api.watch_shop_req("PUT", f"/api/admin/products/{urllib.parse.quote(p['id'])}", token=token, data=p)
print(res2.get("brand"), res2.get("brandId"))
