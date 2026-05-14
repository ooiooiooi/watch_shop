#!/usr/bin/env python3
import json
import os
import subprocess
import csv
from typing import Dict, List

import import_aviandco_catalog as avi


MYSQL_SOCKET = os.getenv("MYSQL_SOCKET", "/tmp/mysql.sock")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASS = os.getenv("MYSQL_PASS", "123456")
MYSQL_DB = os.getenv("MYSQL_DB", "watch_shop")
DEBUG_HOST = os.getenv("AVI_DEBUG_HOST", "http://127.0.0.1:62305")
NODE_BIN = os.getenv(
    "AVI_NODE_BIN",
    "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
)
BATCH_HELPER = os.getenv("AVI_BATCH_DETAIL_HELPER", os.path.join(os.path.dirname(__file__), "aviandco_cdp_detail_batch.mjs"))
MAP_CACHE = os.getenv("AVI_MAP_CACHE", "/tmp/aviandco_listing_map.json")
LIMIT = max(0, int(os.getenv("AVI_BACKFILL_LIMIT", "0")))
AUDIT_CSV = os.getenv("AVI_AUDIT_CSV", "reports/aviandco/source_audit.csv")


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


def parse_images(raw: str) -> List[str]:
    try:
        parsed = json.loads(raw or "[]")
    except Exception:
        return []
    return [str(item) for item in parsed if isinstance(item, str)] if isinstance(parsed, list) else []


def load_map() -> Dict[str, str]:
    with open(MAP_CACHE, "r") as handle:
        data = json.load(handle)
    return {str(k): str(v) for k, v in data.items()} if isinstance(data, dict) else {}


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
    source_map = load_map()
    rows = mysql_rows("SELECT id,image,images FROM product ORDER BY brand,id" + (f" LIMIT {LIMIT}" if LIMIT else ""))
    row_by_id = {row[0]: row for row in rows}
    wanted = set(row_by_id)
    source_counts: Dict[str, int] = {}
    if AUDIT_CSV and os.path.exists(AUDIT_CSV):
        wanted = set()
        with open(AUDIT_CSV, newline="") as handle:
            for row in csv.DictReader(handle):
                try:
                    product_id = str(row.get("id") or "")
                    source_counts[product_id] = int(row.get("source_image_count") or 0)
                    if source_counts[product_id] > int(row.get("db_image_count") or 0):
                        wanted.add(product_id)
                except ValueError:
                    pass
    fetch_items = []
    for row in rows:
        if row[0] not in source_map or row[0] not in wanted:
            continue
        if source_counts.get(row[0], 0) and len(parse_images(row[2])) >= source_counts[row[0]]:
            continue
        fetch_items.append({"id": row[0], "url": source_map[row[0]]})
    print(json.dumps({"targets": len(fetch_items), "audit_csv": AUDIT_CSV if os.path.exists(AUDIT_CSV) else ""}, ensure_ascii=False), flush=True)
    env = os.environ.copy()
    env["AVI_DEBUG_HOST"] = DEBUG_HOST
    proc = subprocess.Popen(
        [NODE_BIN, BATCH_HELPER],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )
    assert proc.stdin is not None
    assert proc.stdout is not None
    proc.stdin.write(json.dumps(fetch_items, ensure_ascii=False))
    proc.stdin.close()
    checked = 0
    updated = 0
    failed = 0
    skipped = 0
    for line in proc.stdout:
        if not line.strip():
            continue
        checked += 1
        result = json.loads(line)
        product_id = str(result.get("id") or "")
        row = row_by_id.get(product_id)
        if not row:
            continue
        if not result.get("ok"):
            failed += 1
            continue
        payload = result.get("payload") or {}
        if not isinstance(payload, dict):
            payload = {}
        source_images = valid_images(payload)
        current = parse_images(row[2])
        if not source_images or len(current) >= len(source_images):
            skipped += 1
        else:
            mysql_exec(
                "UPDATE product SET "
                f"image={sql(source_images[0][:1024])}, "
                f"images={sql(json.dumps(source_images, ensure_ascii=False))} "
                f"WHERE id={sql(product_id)}"
            )
            updated += 1
        if checked % 50 == 0:
            print(json.dumps({"checked": checked, "updated": updated, "skipped": skipped, "failed": failed}, ensure_ascii=False), flush=True)
    stderr = proc.stderr.read() if proc.stderr else ""
    code = proc.wait(timeout=30)
    if code != 0:
        raise RuntimeError(stderr.strip()[:1000] or f"batch helper failed with code {code}")
    print(json.dumps({"checked": checked, "updated": updated, "skipped": skipped, "failed": failed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
