#!/usr/bin/env python3
import csv
import json
import os
import re
import subprocess
from pathlib import Path
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
OUT_DIR = Path(os.getenv("AVI_AUDIT_OUT_DIR", "reports/aviandco")).resolve()
LIMIT = max(0, int(os.getenv("AVI_AUDIT_LIMIT", "0")))
OFFSET = max(0, int(os.getenv("AVI_AUDIT_OFFSET", "0")))
OUT_SUFFIX = os.getenv("AVI_AUDIT_OUT_SUFFIX", "").strip()


def mysql_rows(sql: str) -> List[List[str]]:
    out = subprocess.check_output(
        ["mysql", f"--socket={MYSQL_SOCKET}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", "-D", MYSQL_DB, "-N", "-B", "-e", sql],
        text=True,
    )
    return [line.split("\t") for line in out.splitlines()]


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


def source_images(payload: Dict[str, object]) -> List[str]:
    out: List[str] = []
    title = str(payload.get("name") or "").lower()
    if "whoops" in title or "access denied" in title or "shop for richard mille" in title:
        return out
    for item in payload.get("images") or []:
        url = avi.absolute_url(str(item or ""))
        if url.startswith("https://www.aviandco.com/media/catalog/product/") and url not in out:
            out.append(url)
    return out


def source_reference(payload: Dict[str, object], name: str) -> str:
    text = str(payload.get("specText") or "")
    match = re.search(r"Reference Number:\s*([A-Za-z0-9/.-]+)", text)
    if match:
        return match.group(1)
    match = re.search(r"\b([A-Z0-9]{2,}[/-][A-Z0-9-]+)\b", name)
    return match.group(1) if match else ""


def compare(row: List[str], source_url: str, result: Dict[str, object], summary: Dict[str, int]) -> Dict[str, object]:
    product_id, name, brand, model, reference, price, image, images_raw, description = row
    db_images = parse_images(images_raw)
    local_missing = int(any(item.startswith(("http://", "https://")) for item in [image, *db_images]))
    summary["local_image_missing"] += local_missing
    status = "ok"
    notes: List[str] = []
    src_name = ""
    src_price = ""
    src_ref = ""
    src_image_count = 0
    if not result.get("ok"):
        summary["source_fetch_failed"] += 1
        status = "source_fetch_failed"
        notes.append(str(result.get("error") or "")[:180])
    else:
        payload = result.get("payload") or {}
        if not isinstance(payload, dict):
            payload = {}
        src_name = avi.compact_text(str(payload.get("name") or ""))
        src_price_value = avi.parse_money(str(payload.get("price") or "")) or 0
        src_price = str(src_price_value)
        src_ref = source_reference(payload, src_name)
        src_image_count = len(source_images(payload))
        summary["checked"] += 1
        if src_name and src_name[:120].lower() != name[:120].lower():
            summary["name_mismatch"] += 1
            notes.append("name")
        if src_price_value and abs(float(price) - float(src_price_value)) > 0.01:
            summary["price_mismatch"] += 1
            notes.append("price")
        if src_ref and reference and src_ref.lower() != reference.lower():
            summary["reference_mismatch"] += 1
            notes.append("reference")
        if src_image_count and len(db_images) < src_image_count:
            summary["image_count_less_than_source"] += 1
            notes.append("image_count")
        if local_missing:
            notes.append("remote_image_left")
        if notes:
            status = "mismatch"
    return {
        "id": product_id,
        "status": status,
        "notes": ";".join(notes),
        "db_name": name,
        "source_name": src_name,
        "db_brand": brand,
        "db_model": model,
        "db_reference": reference,
        "source_reference": src_ref,
        "db_price": price,
        "source_price": src_price,
        "db_image_count": len(db_images),
        "source_image_count": src_image_count,
        "image": image,
        "source_url": source_url,
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source_map = load_map()
    sql = "SELECT id,name,brand,model,reference,price,image,images,description FROM product ORDER BY brand,id"
    if LIMIT:
        sql += f" LIMIT {LIMIT} OFFSET {OFFSET}"
    elif OFFSET:
        sql += f" LIMIT 18446744073709551615 OFFSET {OFFSET}"
    rows = mysql_rows(sql)
    row_by_id = {row[0]: row for row in rows}
    summary = {
        "checked": 0,
        "missing_source_url": 0,
        "source_fetch_failed": 0,
        "name_mismatch": 0,
        "price_mismatch": 0,
        "reference_mismatch": 0,
        "image_count_less_than_source": 0,
        "local_image_missing": 0,
    }
    report_rows: List[Dict[str, object]] = []
    fetch_items = []
    for row in rows:
        source_url = source_map.get(row[0], "")
        if not source_url:
            summary["missing_source_url"] += 1
            db_images = parse_images(row[7])
            local_missing = int(any(item.startswith(("http://", "https://")) for item in [row[6], *db_images]))
            summary["local_image_missing"] += local_missing
            report_rows.append({
                "id": row[0],
                "status": "missing_source_url",
                "notes": "remote_image_left" if local_missing else "",
                "db_name": row[1],
                "source_name": "",
                "db_brand": row[2],
                "db_model": row[3],
                "db_reference": row[4],
                "source_reference": "",
                "db_price": row[5],
                "source_price": "",
                "db_image_count": len(db_images),
                "source_image_count": 0,
                "image": row[6],
                "source_url": "",
            })
        else:
            fetch_items.append({"id": row[0], "url": source_url})

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
    processed = 0
    for line in proc.stdout:
        if not line.strip():
            continue
        result = json.loads(line)
        product_id = str(result.get("id") or "")
        row = row_by_id.get(product_id)
        if not row:
            continue
        report_rows.append(compare(row, source_map.get(product_id, ""), result, summary))
        processed += 1
        if processed % 50 == 0:
            print(json.dumps({"processed": processed, **summary}, ensure_ascii=False), flush=True)
    stderr = proc.stderr.read() if proc.stderr else ""
    code = proc.wait(timeout=30)
    if code != 0:
        raise RuntimeError(stderr.strip()[:1000] or f"batch helper failed with code {code}")

    report_rows.sort(key=lambda item: str(item["id"]))
    suffix = f"_{OUT_SUFFIX}" if OUT_SUFFIX else ""
    csv_path = OUT_DIR / f"source_audit{suffix}.csv"
    json_path = OUT_DIR / f"source_audit_summary{suffix}.json"
    with csv_path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(report_rows[0].keys()) if report_rows else [])
        writer.writeheader()
        writer.writerows(report_rows)
    with json_path.open("w") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2, sort_keys=True)
    print(json.dumps({"summary": summary, "csv": str(csv_path), "json": str(json_path)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
