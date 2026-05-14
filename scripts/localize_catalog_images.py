#!/usr/bin/env python3
import hashlib
import json
import mimetypes
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Optional, Tuple


MYSQL_SOCKET = os.getenv("MYSQL_SOCKET", "/tmp/mysql.sock")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASS = os.getenv("MYSQL_PASS", "123456")
MYSQL_DB = os.getenv("MYSQL_DB", "watch_shop")
UPLOAD_ROOT = Path(os.getenv("WATCH_UPLOAD_ROOT", "watch_shop_backend/uploads")).resolve()
LOCAL_SUBDIR = os.getenv("WATCH_LOCAL_IMAGE_SUBDIR", "aviandco/products").strip("/")
LOCAL_DIR = UPLOAD_ROOT / LOCAL_SUBDIR
PUBLIC_PREFIX = os.getenv("WATCH_PUBLIC_UPLOAD_PREFIX", f"/api/uploads/{LOCAL_SUBDIR}").rstrip("/")
MANIFEST_PATH = LOCAL_DIR / "manifest.json"
FAILED_PATH = LOCAL_DIR / "failed.json"
UNRESOLVED_PATH = LOCAL_DIR / "unresolved.json"
SLEEP = float(os.getenv("WATCH_IMAGE_DOWNLOAD_SLEEP", "0.08"))
RETRIES = max(1, int(os.getenv("WATCH_IMAGE_DOWNLOAD_RETRIES", "3")))
TIMEOUT = float(os.getenv("WATCH_IMAGE_DOWNLOAD_TIMEOUT", "45"))
WORKERS = max(1, int(os.getenv("WATCH_IMAGE_DOWNLOAD_WORKERS", "6")))


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


def is_remote_image(value: str) -> bool:
    value = (value or "").strip()
    return value.startswith("http://") or value.startswith("https://")


def load_manifest() -> Dict[str, str]:
    if MANIFEST_PATH.exists():
        with MANIFEST_PATH.open("r") as handle:
            data = json.load(handle)
        if isinstance(data, dict):
            return {str(k): str(v) for k, v in data.items()}
    return {}


def save_manifest(manifest: Dict[str, str]) -> None:
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    tmp = MANIFEST_PATH.with_suffix(".tmp")
    with tmp.open("w") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2, sort_keys=True)
    tmp.replace(MANIFEST_PATH)


def ext_for(url: str, content_type: str) -> str:
    parsed = urllib.parse.urlparse(url)
    path_ext = Path(parsed.path).suffix.lower()
    if path_ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}:
        return ".jpg" if path_ext == ".jpeg" else path_ext
    guessed = mimetypes.guess_extension((content_type or "").split(";")[0].strip())
    if guessed == ".jpe":
        return ".jpg"
    if guessed in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}:
        return ".jpg" if guessed == ".jpeg" else guessed
    return ".jpg"


def public_path_for(url: str, content_type: str) -> Tuple[str, Path]:
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]
    parsed = urllib.parse.urlparse(url)
    basename = Path(parsed.path).stem.lower()
    slug = "".join(ch if ch.isalnum() else "-" for ch in basename).strip("-")[:70] or "image"
    ext = ext_for(url, content_type)
    filename = f"{slug}-{digest}{ext}"
    return f"{PUBLIC_PREFIX}/{filename}", LOCAL_DIR / filename


def download(url: str, path_hint: Optional[Path] = None) -> Tuple[str, int]:
    last_error = ""
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    "Referer": "https://www.aviandco.com/",
                },
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                content_type = resp.headers.get("Content-Type", "")
                data = resp.read()
            if b"<html" in data[:512].lower() or b"<!doctype html" in data[:512].lower():
                raise RuntimeError("download returned HTML")
            public_path, target = public_path_for(url, content_type)
            if path_hint is not None:
                target = path_hint
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            return public_path, len(data)
        except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            last_error = str(exc)
            time.sleep(min(2.0, 0.3 * attempt))
    raise RuntimeError(last_error or "download failed")


def parse_images_json(raw: str) -> List[str]:
    try:
        parsed = json.loads(raw or "[]")
    except Exception:
        return []
    if isinstance(parsed, list):
        return [str(item) for item in parsed if isinstance(item, str)]
    return []


def collect_urls() -> List[str]:
    urls: List[str] = []
    for table, column in [("product", "image"), ("category", "image"), ("brand", "image"), ("watch_model", "image")]:
        for (value,) in mysql_rows(f"SELECT {column} FROM {table} WHERE {column} LIKE 'http%'"):
            urls.append(value)
    for (raw,) in mysql_rows("SELECT images FROM product WHERE images LIKE '%http%'"):
        urls.extend([item for item in parse_images_json(raw) if is_remote_image(item)])
    seen = set()
    unique = []
    for url in urls:
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


def save_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with tmp.open("w") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
    tmp.replace(path)


def localize_url(url: str, manifest: Dict[str, str], unresolved: Optional[Dict[str, str]] = None, allow_download: bool = True) -> str:
    if not is_remote_image(url):
        return url
    if url in manifest:
        return manifest[url]
    if not allow_download:
        if unresolved is not None:
            unresolved[url] = "missing from download manifest"
        return url
    public_path, target = public_path_for(url, "")
    if not target.exists():
        try:
            public_path, size = download(url)
            print(json.dumps({"downloaded": url, "local": public_path, "bytes": size}, ensure_ascii=False), flush=True)
            time.sleep(SLEEP)
        except Exception as exc:
            if unresolved is not None:
                unresolved[url] = str(exc)[:240]
                return url
            raise
    manifest[url] = public_path
    if len(manifest) % 50 == 0:
        save_manifest(manifest)
        print(json.dumps({"manifest": len(manifest)}, ensure_ascii=False), flush=True)
    return public_path


def download_for_manifest(url: str) -> Tuple[str, str, int]:
    public_path, target = public_path_for(url, "")
    if target.exists() and target.stat().st_size > 0:
        return url, public_path, target.stat().st_size
    public_path, size = download(url)
    return url, public_path, size


def fill_manifest(urls: List[str], manifest: Dict[str, str]) -> Dict[str, str]:
    pending = [url for url in urls if url not in manifest]
    if not pending:
        return {}
    failed: Dict[str, str] = {}
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(download_for_manifest, url): url for url in pending}
        for future in as_completed(futures):
            url = futures[future]
            try:
                src, public_path, size = future.result()
                manifest[src] = public_path
                done += 1
                print(json.dumps({"downloaded": src, "local": public_path, "bytes": size, "done": done, "pending": len(pending)}, ensure_ascii=False), flush=True)
            except Exception as exc:
                failed[url] = str(exc)[:240]
                print(json.dumps({"failed": url, "error": failed[url], "done": done, "pending": len(pending)}, ensure_ascii=False), flush=True)
            if (done + len(failed)) % 100 == 0:
                save_manifest(manifest)
                print(json.dumps({"manifest": len(manifest), "failed": len(failed)}, ensure_ascii=False), flush=True)
    save_manifest(manifest)
    return failed


def update_scalar_column(table: str, column: str, manifest: Dict[str, str], unresolved: Dict[str, str]) -> int:
    updated = 0
    for row_id, value in mysql_rows(f"SELECT id, {column} FROM {table} WHERE {column} LIKE 'http%'"):
        local = localize_url(value, manifest, unresolved, allow_download=False)
        if local != value:
            mysql_exec(f"UPDATE {table} SET {column}={sql(local)} WHERE id={sql(row_id)}")
            updated += 1
    return updated


def update_product_images(manifest: Dict[str, str], unresolved: Dict[str, str]) -> int:
    updated = 0
    for product_id, raw in mysql_rows("SELECT id, images FROM product WHERE images LIKE '%http%'"):
        images = parse_images_json(raw)
        localized = [localize_url(item, manifest, unresolved, allow_download=False) for item in images]
        if localized != images:
            mysql_exec(f"UPDATE product SET images={sql(json.dumps(localized, ensure_ascii=False))} WHERE id={sql(product_id)}")
            updated += 1
    return updated


def main() -> int:
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    urls = collect_urls()
    print(json.dumps({"remote_urls": len(urls), "manifest_existing": len(manifest), "local_dir": str(LOCAL_DIR), "public_prefix": PUBLIC_PREFIX}, ensure_ascii=False), flush=True)
    failed = fill_manifest(urls, manifest)
    if failed:
        print(json.dumps({"retrying_failed": len(failed)}, ensure_ascii=False), flush=True)
        failed = fill_manifest(list(failed.keys()), manifest)

    unresolved: Dict[str, str] = {}
    stats = {
        "product_image_updated": update_scalar_column("product", "image", manifest, unresolved),
        "product_images_updated": update_product_images(manifest, unresolved),
        "category_image_updated": update_scalar_column("category", "image", manifest, unresolved),
        "brand_image_updated": update_scalar_column("brand", "image", manifest, unresolved),
        "model_image_updated": update_scalar_column("watch_model", "image", manifest, unresolved),
    }
    save_manifest(manifest)
    print(json.dumps({"localized": len(manifest), "failed": len(failed), "unresolved": len(unresolved), "stats": stats}, ensure_ascii=False))
    if failed:
        save_json(FAILED_PATH, failed)
        print(json.dumps({"failed_manifest": str(FAILED_PATH)}, ensure_ascii=False), flush=True)
    elif FAILED_PATH.exists():
        FAILED_PATH.unlink()
    if unresolved:
        save_json(UNRESOLVED_PATH, unresolved)
        print(json.dumps({"unresolved_manifest": str(UNRESOLVED_PATH)}, ensure_ascii=False), flush=True)
    elif UNRESOLVED_PATH.exists():
        UNRESOLVED_PATH.unlink()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
