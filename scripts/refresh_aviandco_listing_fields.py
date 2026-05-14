#!/usr/bin/env python3
import json
import os
import subprocess
import tempfile
from typing import Dict, List, Optional

import import_aviandco_catalog as avi
from import_aviandco_all_brands_from_debug_chrome import BRANDS
from import_aviandco_brand_from_debug_chrome import infer_brand


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


def run_probe(brand: Dict[str, object]) -> Dict[str, object]:
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
    return json.loads(proc.stdout or "{}")


def clean_image(value: str) -> str:
    image = avi.absolute_url(value)
    if image.startswith("https://www.aviandco.com/media/catalog/product/"):
        return image
    return ""


def sql(value: object) -> str:
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def product_id_for(card: Dict[str, object]) -> str:
    href = str(card.get("href") or "")
    return f"avi-{avi.slug(href.rsplit('/', 1)[-1], 58)}"[:64]


def fallback_brand_for(card: Dict[str, object], brand_name: str) -> Optional[str]:
    name = avi.compact_text(str(card.get("name") or ""))
    if brand_name != "Other Brands":
        return brand_name
    return infer_brand(name, None) or "Other Brands"


def apply_updates(updates: List[str]) -> None:
    if not updates:
        return
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as handle:
        handle.write("\n".join(updates))
        sql_path = handle.name
    with open(sql_path, "rb") as handle:
        subprocess.check_call(
            ["mysql", f"--socket={MYSQL_SOCKET}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", "-D", MYSQL_DB, "-N", "-B"],
            stdin=handle,
        )


def main() -> int:
    start_brand = os.getenv("AVI_START_BRAND", "").strip().lower()
    started = not start_brand
    seen = set()
    cards_seen = 0
    images_found = 0
    updates_done = 0
    for brand in BRANDS:
        if not started:
            started = str(brand["name"]).strip().lower() == start_brand
        if not started:
            continue
        updates: List[str] = []
        payload = run_probe(brand)
        cards = payload.get("cards") or []
        cards_seen += len(cards)
        for card in cards:
            if not isinstance(card, dict):
                continue
            pid = product_id_for(card)
            if not pid or pid in seen:
                continue
            seen.add(pid)
            name = avi.compact_text(str(card.get("name") or ""))
            cleaned_name = name
            image = clean_image(str(card.get("image") or ""))
            price = avi.parse_money(str(card.get("price") or "")) or 0
            brand_name = fallback_brand_for(card, str(brand["name"]))
            assignments = []
            if cleaned_name:
                assignments.append(f"name={sql(cleaned_name[:256])}")
            if brand_name:
                assignments.append(f"brand={sql(brand_name[:128])}")
                assignments.append(f"collection={sql(brand_name[:256])}")
            assignments.append(f"price={float(price)}")
            if image:
                images_found += 1
                assignments.append(f"image={sql(image[:1024])}")
                assignments.append(f"images={sql(json.dumps([image], ensure_ascii=False))}")
            if assignments:
                updates.append(f"UPDATE product SET {', '.join(assignments)} WHERE id={sql(pid)};")
        apply_updates(updates)
        updates_done += len(updates)
        print(json.dumps({"brand": brand["name"], "cards": len(cards), "updates": len(updates)}, ensure_ascii=False), flush=True)
    print(json.dumps({"cards_seen": cards_seen, "unique_products": len(seen), "images_found": images_found, "updates": updates_done}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
