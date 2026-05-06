#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"
ORIGIN="${ORIGIN:-http://localhost:5177}"

echo "BASE=$BASE"

code() {
  curl --noproxy '*' -s -o /dev/null -w "%{http_code}" "$@"
}

json() {
  curl --noproxy '*' -s "$@"
}

echo
echo "[health] /api/health -> $(code "$BASE/api/health")"
echo "[public] /settings/customer-service -> $(code "$BASE/api/public/settings/customer-service")"
echo "[public] /settings/customer-service (body) -> $(json "$BASE/api/public/settings/customer-service" | head -c 180)"

echo
echo "[public] /categories -> $(code "$BASE/api/public/categories")"
echo "[public] /brands -> $(code "$BASE/api/public/brands")"
echo "[public] /models -> $(code "$BASE/api/public/models")"
echo "[public] /products?status=on -> $(code "$BASE/api/public/products?status=on")"
echo "[public] /products/page?status=on -> $(code "$BASE/api/public/products/page?status=on&page=0&size=5")"

PID="$(json "$BASE/api/public/products?status=on" | node -e 'const fs=require("fs"); const a=JSON.parse(fs.readFileSync(0,"utf8")); process.stdout.write(String((a&&a[0]&&a[0].id)||""));')"
echo "[public] first product id = $PID"
echo "[public] /products/$PID -> $(code "$BASE/api/public/products/$PID")"
echo "[public] /products/$PID/related -> $(code "$BASE/api/public/products/$PID/related?limit=4")"

echo
echo "[admin] login -> $(code -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' "$BASE/api/admin/auth/login")"
TOKEN="$(json -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' "$BASE/api/admin/auth/login" | node -e 'const fs=require("fs"); const o=JSON.parse(fs.readFileSync(0,"utf8")); process.stdout.write(String(o.token||""));')"
echo "[admin] token length = ${#TOKEN}"
echo "[admin] /categories -> $(code -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/categories")"
echo "[admin] /products -> $(code -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/products")"
echo "[admin] /products/page -> $(code -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/products/page?page=0&size=5")"
echo "[admin] /settings/customer-service -> $(code -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/settings/customer-service")"
echo "[admin] /settings/customer-service (body) -> $(json -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/settings/customer-service" | head -c 180)"
echo "[admin] /brands -> $(code -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/brands")"
echo "[admin] /models -> $(code -H "Authorization: Bearer $TOKEN" "$BASE/api/admin/models")"

echo
echo "[cors] OPTIONS /api/admin/auth/login (Origin: $ORIGIN)"
curl --noproxy '*' -s -i -X OPTIONS "$BASE/api/admin/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  | head -n 20
