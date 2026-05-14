#!/usr/bin/env python3
import json
import os
import subprocess
import time
from typing import List


MYSQL_SOCKET = os.getenv("MYSQL_SOCKET", "/tmp/mysql.sock")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASS = os.getenv("MYSQL_PASS", "123456")
MYSQL_DB = os.getenv("MYSQL_DB", "watch_shop")
LIMIT = max(1, int(os.getenv("AVI_BACKFILL_LIMIT", "40")))
DEBUG_HOST = os.getenv("AVI_DEBUG_HOST", "http://127.0.0.1:62305")
NODE_BIN = os.getenv("AVI_NODE_BIN", "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node")
HELPER = os.path.join(os.path.dirname(__file__), "aviandco_debug_chrome_fetch.mjs")
FALLBACK_MARKER = "manggata.com"


def mysql_rows(sql: str) -> List[List[str]]:
    cmd = ["mysql", f"--socket={MYSQL_SOCKET}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", "-D", MYSQL_DB, "-N", "-B", "-e", sql]
    out = subprocess.check_output(cmd, text=True)
    return [line.split("\t") for line in out.splitlines()]


def mysql_exec(sql: str) -> None:
    subprocess.check_call(["mysql", f"--socket={MYSQL_SOCKET}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", "-D", MYSQL_DB, "-e", sql])


def sql_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "''")


def fetch_detail(url: str) -> dict:
    env = os.environ.copy()
    env["AVI_DEBUG_HOST"] = DEBUG_HOST
    proc = subprocess.run([NODE_BIN, HELPER, "detail", url], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, timeout=180)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout).strip()[:500])
    payload = json.loads(proc.stdout or "{}")
    if not isinstance(payload, dict):
        raise RuntimeError("invalid detail payload")
    return payload


def valid_images(payload: dict, product_id: str) -> list[str]:
    candidates = []
    for item in payload.get("images") or []:
        s = str(item or "").strip()
        if not s.startswith("https://www.aviandco.com/media/catalog/product/"):
            continue
        if s not in candidates:
            candidates.append(s)
    if not candidates:
        return []
    title = str(payload.get("name") or "").lower()
    # Reject obvious error/home pages.
    if "shop for richard mille" in title or "buy luxury watches" in title or "access denied" in title:
        return []
    slug_hint = product_id.removeprefix("avi-").split("-")
    useful = [part for part in slug_hint[:4] if len(part) > 2]
    if useful and not any(any(part in img.lower() for part in useful) for img in candidates):
        return []
    return candidates[:8]


def main() -> int:
    rows = mysql_rows(
        "SELECT id FROM product "
        f"WHERE image LIKE '%{FALLBACK_MARKER}%' "
        "ORDER BY brand, id "
        f"LIMIT {LIMIT}"
    )
    checked = 0
    updated = 0
    failed = 0
    for (product_id,) in rows:
        checked += 1
        url = "https://www.aviandco.com/" + product_id.removeprefix("avi-")
        try:
            payload = fetch_detail(url)
            images = valid_images(payload, product_id)
            if images:
                images_json = json.dumps(images, ensure_ascii=False)
                mysql_exec(
                    "UPDATE product SET "
                    f"image='{sql_escape(images[0])}', "
                    f"images='{sql_escape(images_json)}' "
                    f"WHERE id='{sql_escape(product_id)}'"
                )
                updated += 1
        except Exception as exc:
            failed += 1
            print(f"failed {product_id}: {str(exc)[:160]}")
        time.sleep(0.4)
    print(json.dumps({"checked": checked, "updated": updated, "failed": failed}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
