#!/usr/bin/env python3
import json
import os
import subprocess
import time
from typing import Dict, List, Optional

import import_aviandco_catalog as avi
from import_aviandco_all_brands_from_debug_chrome import BRANDS


MYSQL_SOCKET = os.getenv("MYSQL_SOCKET", "/tmp/mysql.sock")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASS = os.getenv("MYSQL_PASS", "123456")
MYSQL_DB = os.getenv("MYSQL_DB", "watch_shop")
DEBUG_HOST = os.getenv("AVI_DEBUG_HOST", "http://127.0.0.1:62305")
NODE_BIN = os.getenv(
    "AVI_NODE_BIN",
    "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
)
PROBE = os.path.join(os.path.dirname(__file__), "aviandco_debug_probe.mjs")
DETAIL = os.getenv("AVI_DETAIL_HELPER", os.path.join(os.path.dirname(__file__), "aviandco_cdp_detail_fetch.mjs"))
FALLBACK_MARKER = os.getenv("AVI_FALLBACK_MARKER", "manggata.com")
LIMIT = max(0, int(os.getenv("AVI_BACKFILL_LIMIT", "0")))
START_AFTER = os.getenv("AVI_START_AFTER", "").strip()
MAP_CACHE = os.getenv("AVI_MAP_CACHE", "/tmp/aviandco_listing_map.json")


def mysql_rows(sql: str) -> List[List[str]]:
    out = subprocess.check_output(
        ["mysql", f"--socket={MYSQL_SOCKET}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", "-D", MYSQL_DB, "-N", "-B", "-e", sql],
        text=True,
    )
    return [line.split("\t") for line in out.splitlines()]


def mysql_exec(sql: str) -> None:
    subprocess.check_call(["mysql", f"--socket={MYSQL_SOCKET}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", "-D", MYSQL_DB, "-e", sql])


def sql(value: object) -> str:
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def product_id_for(href: str) -> str:
    return f"avi-{avi.slug(href.rsplit('/', 1)[-1], 58)}"[:64]


def run_probe(brand: Dict[str, object]) -> List[Dict[str, str]]:
    env = os.environ.copy()
    env.update(
        {
            "AVI_DEBUG_HOST": DEBUG_HOST,
            "AVI_DEBUG_BRAND_TEXT": str(brand["name"]),
            "AVI_DEBUG_BRAND_URL": str(brand["url"]),
            "AVI_MAX_PAGES": str(brand["pages"]),
        }
    )
    proc = subprocess.run([NODE_BIN, PROBE], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, timeout=max(300, int(brand["pages"]) * 25))
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip()[:800])
    payload = json.loads(proc.stdout or "{}")
    return [item for item in payload.get("cards") or [] if isinstance(item, dict)]


def build_listing_map() -> Dict[str, str]:
    if MAP_CACHE and os.path.exists(MAP_CACHE):
        with open(MAP_CACHE, "r") as handle:
            cached = json.load(handle)
        if isinstance(cached, dict) and len(cached) > 1000:
            print(json.dumps({"mapped_cache": MAP_CACHE, "mapped": len(cached)}, ensure_ascii=False), flush=True)
            return {str(k): str(v) for k, v in cached.items()}
    mapping: Dict[str, str] = {}
    for brand in BRANDS:
        cards = run_probe(brand)
        for card in cards:
            href = avi.absolute_url(str(card.get("href") or ""))
            if not href.startswith("https://www.aviandco.com/"):
                continue
            mapping.setdefault(product_id_for(href), href)
        print(json.dumps({"mapped_brand": brand["name"], "cards": len(cards), "mapped": len(mapping)}, ensure_ascii=False), flush=True)
    if MAP_CACHE:
        with open(MAP_CACHE, "w") as handle:
            json.dump(mapping, handle, ensure_ascii=False)
    return mapping


def fetch_detail(url: str) -> Dict[str, object]:
    env = os.environ.copy()
    env["AVI_DEBUG_HOST"] = DEBUG_HOST
    args = [NODE_BIN, DETAIL, url] if DETAIL.endswith("aviandco_cdp_detail_fetch.mjs") else [NODE_BIN, DETAIL, "detail", url]
    proc = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip()[:800])
    return json.loads(proc.stdout or "{}")


def valid_images(payload: Dict[str, object]) -> List[str]:
    title = str(payload.get("name") or "").lower()
    if "shop for richard mille" in title or "buy luxury watches" in title or "access denied" in title or "whoops" in title:
        return []
    out: List[str] = []
    for item in payload.get("images") or []:
        url = avi.absolute_url(str(item or "").strip())
        if not url.startswith("https://www.aviandco.com/media/catalog/product/"):
            continue
        if "/logo" in url.lower() or "fav" in url.lower():
            continue
        if url not in out:
            out.append(url)
    return out[:12]


def main() -> int:
    fallback_rows = mysql_rows(
        "SELECT id FROM product "
        f"WHERE image LIKE '%{FALLBACK_MARKER}%' "
        "ORDER BY brand, id"
    )
    fallback_ids = [row[0] for row in fallback_rows]
    if START_AFTER and START_AFTER in fallback_ids:
        fallback_ids = fallback_ids[fallback_ids.index(START_AFTER) + 1 :]
    if LIMIT:
        fallback_ids = fallback_ids[:LIMIT]

    mapping = build_listing_map()
    checked = 0
    updated = 0
    skipped_no_url = 0
    failed = 0
    for product_id in fallback_ids:
        url = mapping.get(product_id)
        if not url:
            skipped_no_url += 1
            continue
        checked += 1
        try:
            payload = fetch_detail(url)
            images = valid_images(payload)
            if images:
                mysql_exec(
                    "UPDATE product SET "
                    f"image={sql(images[0][:1024])}, "
                    f"images={sql(json.dumps(images, ensure_ascii=False))} "
                    f"WHERE id={sql(product_id)}"
                )
                updated += 1
        except Exception as exc:
            failed += 1
            print(json.dumps({"failed": product_id, "url": url, "error": str(exc)[:220]}, ensure_ascii=False), flush=True)
        if checked % 25 == 0:
            print(json.dumps({"checked": checked, "updated": updated, "failed": failed, "last": product_id}, ensure_ascii=False), flush=True)
        time.sleep(0.35)
    print(json.dumps({"fallback_targets": len(fallback_ids), "checked": checked, "updated": updated, "skipped_no_url": skipped_no_url, "failed": failed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
