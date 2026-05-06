#!/usr/bin/env python3
import base64
import http.client
import html
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple


def load_env_file(path: str) -> None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if not s or s.startswith("#"):
                    continue
                if "=" not in s:
                    continue
                k, v = s.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if not k:
                    continue
                os.environ.setdefault(k, v)
    except FileNotFoundError:
        return


load_env_file(os.getenv("WATCH_SHOP_ENV_FILE", "/Users/mac/workspace/watch_shop/.env.local"))

WATCH_SHOP_BASE = os.getenv("WATCH_SHOP_BASE", "http://localhost:8080")
WATCH_SHOP_ADMIN_USER = os.getenv("WATCH_SHOP_ADMIN_USER", "admin")
WATCH_SHOP_ADMIN_PASS = os.getenv("WATCH_SHOP_ADMIN_PASS", "admin123")

WC_BASE = os.getenv("WC_BASE", "https://www.manggata.com").rstrip("/")
WC_CONSUMER_KEY = os.getenv("WC_CONSUMER_KEY", "")
WC_CONSUMER_SECRET = os.getenv("WC_CONSUMER_SECRET", "")

CLEAR_EXISTING = os.getenv("WATCH_SHOP_CLEAR", "true").lower() in {"1", "true", "yes", "y"}
SLEEP_MS = int(os.getenv("WC_SLEEP_MS", "0"))
WC_PER_PAGE = int(os.getenv("WC_PER_PAGE", "30"))
WC_RETRY = int(os.getenv("WC_RETRY", "6"))
ONLY_WATCH = os.getenv("WC_ONLY_WATCH", "true").lower() in {"1", "true", "yes", "y"}
WATCH_KEYWORDS = [s.strip().lower() for s in os.getenv("WC_WATCH_KEYWORDS", "watch,replica watch,腕表,手表").split(",") if s.strip()]
WATCH_CATEGORY_IDS = {
    int(s.strip())
    for s in os.getenv("WC_WATCH_CATEGORY_IDS", "").split(",")
    if s.strip().isdigit()
}
WATCH_CATEGORY_SLUGS = {
    s.strip().lower()
    for s in os.getenv("WC_WATCH_CATEGORY_SLUGS", "").split(",")
    if s.strip()
}
WATCH_PARENT_CATEGORY_SLUGS = {
    s.strip().lower()
    for s in os.getenv("WC_WATCH_PARENT_SLUGS", "").split(",")
    if s.strip()
}
SKIP_ZERO_PRICE = os.getenv("WATCH_SHOP_SKIP_ZERO_PRICE", "true").lower() in {"1", "true", "yes", "y"}
FORCE_PRICE = float(os.getenv("WATCH_SHOP_FORCE_PRICE", "100"))

FALLBACK_IMAGE = os.getenv(
    "WATCH_SHOP_FALLBACK_IMAGE",
    "https://images.unsplash.com/photo-1763226015334-9a2d3fb11ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
)


def http_json(method: str, url: str, data: Any = None, headers: Optional[Dict[str, str]] = None):
    h = {"Content-Type": "application/json"}
    h["Accept"] = "application/json"
    h["User-Agent"] = "watch-shop-import/1.0"
    h["Accept-Encoding"] = "identity"
    if headers:
        h.update(headers)
    body = None if data is None else json.dumps(data, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{method} {url} -> {e.code}: {msg[:500]}")


def watch_shop_req(method: str, path: str, token: Optional[str] = None, data: Any = None):
    url = WATCH_SHOP_BASE + path
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    return http_json(method, url, data=data, headers=headers)

def is_conflict_error(e: Exception) -> bool:
    return "-> 409:" in str(e)


def watch_shop_upsert(path: str, token: str, payload: Dict[str, Any]):
    try:
        return watch_shop_req("POST", path, token=token, data=payload)
    except Exception as e:
        if is_conflict_error(e):
            entity_id = str(payload.get("id") or "").strip()
            if not entity_id:
                raise
            return watch_shop_req("PUT", f"{path}/{urllib.parse.quote(entity_id)}", token=token, data=payload)
        raise

def wc_auth_header() -> Dict[str, str]:
    token = base64.b64encode(f"{WC_CONSUMER_KEY}:{WC_CONSUMER_SECRET}".encode("utf-8")).decode("ascii")
    return {"Authorization": f"Basic {token}"}


def wc_get(path: str, query: Dict[str, Any]):
    q = urllib.parse.urlencode(query, doseq=True)
    url = f"{WC_BASE}{path}?{q}" if q else f"{WC_BASE}{path}"
    last_err: Optional[Exception] = None
    for attempt in range(1, max(1, WC_RETRY) + 1):
        try:
            if SLEEP_MS > 0:
                time.sleep(SLEEP_MS / 1000)
            return http_json("GET", url, headers=wc_auth_header())
        except Exception as e:
            last_err = e
            msg = str(e)
            retryable = (
                isinstance(e, (http.client.IncompleteRead, urllib.error.URLError, ConnectionResetError))
                or "IncompleteRead" in msg
                or "Connection reset" in msg
                or "Errno 54" in msg
                or "SSLEOFError" in msg
                or "EOF occurred in violation of protocol" in msg
                or "timed out" in msg
                or "502" in msg
                or "503" in msg
                or "504" in msg
            )
            if not retryable or attempt >= WC_RETRY:
                raise
            time.sleep(min(30, 0.7 * (2 ** (attempt - 1))))
    raise last_err if last_err else RuntimeError("wc_get failed")


def slug(value: str, max_len: int = 48) -> str:
    v = (value or "").strip().lower()
    v = re.sub(r"[^a-z0-9]+", "-", v).strip("-")
    return (v[:max_len] if v else "x")


def strip_html(text: str) -> str:
    if not text:
        return ""
    out = re.sub(r"<[^>]+>", " ", text)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    try:
        return float(s)
    except Exception:
        return None


def to_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    s = str(value).strip()
    if not s:
        return default
    try:
        return max(0, int(float(s)))
    except Exception:
        return default


def pick_image(images: Any) -> str:
    if isinstance(images, list) and images:
        src = (images[0] or {}).get("src")
        if src:
            return str(src)
    return FALLBACK_IMAGE


def pick_images(images: Any) -> List[str]:
    out: List[str] = []
    if isinstance(images, list):
        for it in images:
            src = (it or {}).get("src") if isinstance(it, dict) else None
            if not src:
                continue
            s = str(src).strip()
            if not s:
                continue
            if s not in out:
                out.append(s)
    return out


def brand_key(name: str) -> bool:
    n = (name or "").strip().lower()
    return n in {"brand", "pa_brand"} or "品牌" in (name or "")


def model_key(name: str) -> bool:
    n = (name or "").strip().lower()
    return n in {"model", "pa_model"} or "型号" in (name or "")

KNOWN_BRANDS = [
    "Rolex",
    "Omega",
    "Cartier",
    "Patek Philippe",
    "Audemars Piguet",
    "F.P. Journe",
    "Vacheron Constantin",
    "Jaeger Lecoultre",
    "Panerai",
    "Blancpain",
    "Breitling",
    "Breguet",
    "Chopard",
    "Franck Muller",
    "Hublot",
    "IWC",
    "Longines",
    "Richard Mille",
    "Tag Heuer",
    "Tudor",
]

BRAND_MODEL_HINTS: Dict[str, List[str]] = {
    "IWC": [
        "Big Pilot",
        "Pilot's",
        "Pilot",
        "Portugieser",
        "Portofino",
        "Aquatimer",
        "Ingenieur",
    ],
    "Jacob & Co.": [
        "Epic X Chrono",
        "Epic X",
        "Epic SF24",
        "Bugatti Chiron",
        "Five Time Zone",
        "Grand Complications",
        "Messi",
    ],
    "Rolex": [
        "GMT-Master II",
        "Yacht-Master II",
        "Yacht-Master",
        "Day-Date",
        "Sky-Dweller",
        "Oyster Perpetual",
        "Sea-Dweller",
        "Lady-Datejust",
        "Datejust",
        "Daytona",
        "Submariner",
        "Explorer II",
        "Explorer",
        "Deepsea",
        "Air-King",
        "Milgauss",
        "Cellini",
    ],
    "Patek Philippe": [
        "Grand Complications",
        "Complications",
        "Annual Calendar",
        "Travel Time",
        "Golden Ellipse",
        "Twenty-4",
        "Twenty~4",
        "Nautilus",
        "Aquanaut",
        "Calatrava",
        "Gondolo",
        "Cubitus",
    ],
    "Audemars Piguet": [
        "Royal Oak Offshore",
        "Royal Oak Concept",
        "Code 11.59",
        "Royal Oak",
        "Millenary",
        "Jules Audemars",
    ],
    "Richard Mille": [
        "RM",
    ],
    "F.P. Journe": [
        "Chronometre Bleu",
        "Chronometre Souverain",
        "Tourbillon Souverain",
        "Octa Automatique",
        "Octa Divine",
        "Octa Lune",
        "Elegante",
        "Centigraphe",
        "Resonance",
        "Vagabondage",
    ],
    "Vacheron Constantin": [
        "Overeseas",
        "Overseas",
        "Patrimony",
        "Traditionnelle",
        "Historiques",
        "Fiftysix",
        "Malte",
    ],
    "Tudor": [
        "Black Bay",
        "Heritage",
        "Pelagos",
        "Royal",
        "1926",
        "Glamour",
    ],
    "Panerai": [
        "Luminor",
        "Radiomir",
        "Submersible",
        "Ferrari",
    ],
    "Breitling": [
        "Chronomat",
        "Navitimer",
        "Superocean",
        "Avenger",
        "Premier",
        "Colt",
        "Top Time",
    ],
    "Hublot": [
        "Big Bang",
        "Classic Fusion",
        "Spirit of Big Bang",
        "King Power",
    ],
    "Jaeger Lecoultre": [
        "Master Control",
        "Polaris",
        "Reverso",
        "Duometre",
        "Rendez-Vous",
    ],
}

BRAND_ALIASES: Dict[str, str] = {
    "iwc": "IWC",
    "iwc shaffhausen": "IWC",
    "iwc schaffhausen": "IWC",
    "jacob & co": "Jacob & Co.",
    "jacob & co.": "Jacob & Co.",
    "jaeger lecoultre": "Jaeger Lecoultre",
    "jaeger-lecoultre": "Jaeger Lecoultre",
    "jaeger lecoultre watches": "Jaeger Lecoultre",
    "jaeger-lecoultre watches": "Jaeger Lecoultre",
    "jaeger-l ecoultre": "Jaeger Lecoultre",
    "jaeger-llecoultre": "Jaeger Lecoultre",
    "jaeger-lecoultre": "Jaeger Lecoultre",
    "jaeger-lecoultre master": "Jaeger Lecoultre",
    "f.p. journe": "F.P. Journe",
    "fp journe": "F.P. Journe",
}


def normalize_cat_name(name: str) -> str:
    s = html.unescape(name or "").strip()
    s = re.sub(r"\s+", " ", s)
    return s


def base_name_for_brand(cat_name: str) -> str:
    s = normalize_cat_name(cat_name)
    s = re.sub(r"\bReplica Watch\b", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\bwatches\b", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s+", " ", s).strip(" -")
    return s


def match_brand_from_category(cat_name: str) -> Optional[str]:
    base = base_name_for_brand(cat_name)
    base_l = normalize_lookup_name(base)
    alias = BRAND_ALIASES.get(base_l)
    if alias:
        return alias
    for b in KNOWN_BRANDS:
        if base_l == normalize_lookup_name(b):
            return b
    return None


def infer_brand_from_name(name: str) -> Optional[str]:
    base = normalize_cat_name(name)
    for alias_key, canonical in sorted(BRAND_ALIASES.items(), key=lambda item: len(item[0]), reverse=True):
        pattern = r"^" + re.escape(alias_key).replace(r"\ ", r"[\s\-]*")
        if re.match(pattern, normalize_lookup_name(base), flags=re.IGNORECASE):
            return canonical
    for brand in sorted(KNOWN_BRANDS, key=len, reverse=True):
        if re.match(r"^" + re.escape(brand).replace(r"\ ", r"[\s\-]*"), base, flags=re.IGNORECASE):
            return brand
    return None


def strip_brand_prefix(name: str, brand: str) -> str:
    source = normalize_cat_name(name)
    candidates = [brand]
    normalized_brand = normalize_lookup_name(brand)
    for alias_key, canonical in BRAND_ALIASES.items():
        if normalize_lookup_name(canonical) == normalized_brand:
            candidates.append(alias_key)
    for candidate in sorted(set(candidates), key=len, reverse=True):
        pattern = r"^" + re.escape(candidate).replace(r"\ ", r"[\s\-]*") + r"[\s\-_:|/]*"
        stripped = re.sub(pattern, "", source, flags=re.IGNORECASE).strip()
        if stripped != source:
            return stripped
    return source


def clean_model_name(name: str, brand: Optional[str]) -> Optional[str]:
    s = normalize_cat_name(name)
    s = re.sub(r"\bReplica Watch\b", "", s, flags=re.IGNORECASE).strip()
    if brand:
        pattern = r"^" + re.escape(brand) + r"[\s\-_:|/]*"
        s = re.sub(pattern, "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\bWatches?\b", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s+", " ", s).strip(" -_/|:")
    if not s:
        return None
    if brand and s.lower() == brand.lower():
        return None
    return s


def normalize_lookup_name(value: str) -> str:
    text = unicodedata.normalize("NFKD", (value or "").strip())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", text).lower()


def infer_model_from_name(name: str, brand: Optional[str]) -> Optional[str]:
    if not name or not brand:
        return None
    rest = strip_brand_prefix(name, brand)
    rest = rest.lstrip(" '\"([{")
    if not rest:
        return None

    if brand == "Richard Mille":
        rm_match = re.search(r"\b(RM\s*\d{1,4}(?:[-/]\d{1,4})?[A-Z]{0,3})\b", rest, flags=re.IGNORECASE)
        if rm_match:
            return re.sub(r"\s+", " ", rm_match.group(1).upper().replace("/", "-")).strip()

    hints = BRAND_MODEL_HINTS.get(brand, [])
    for hint in sorted(hints, key=len, reverse=True):
        if rest.lower().startswith(hint.lower()):
            return hint

    token_match = re.match(r"([A-Za-z0-9.&'~-]+(?:\s+[A-Za-z0-9.&'~-]+){0,2})", rest)
    if not token_match:
        return None
    candidate = clean_model_name(token_match.group(1), brand)
    if not candidate:
        return None
    if re.search(r"\d{4,}", candidate):
        return None
    return candidate


def prefill_brand_cache(token: str, brand_name_to_id: Dict[str, str]) -> None:
    existing_brands = watch_shop_req("GET", "/api/admin/brands", token=token) or []
    if not isinstance(existing_brands, list):
        return
    for item in existing_brands:
        if not isinstance(item, dict):
            continue
        existing_id = str(item.get("id") or "").strip()
        existing_name = str(item.get("name") or "").strip()
        if existing_id and existing_name:
            brand_name_to_id[normalize_lookup_name(existing_name)] = existing_id


def prefill_model_cache(token: str, model_key_to_id: Dict[Tuple[str, str], str]) -> None:
    existing_models = watch_shop_req("GET", "/api/admin/models", token=token) or []
    if not isinstance(existing_models, list):
        return
    for item in existing_models:
        if not isinstance(item, dict):
            continue
        existing_id = str(item.get("id") or "").strip()
        existing_brand_id = str(item.get("brandId") or "").strip()
        existing_name = str(item.get("name") or "").strip()
        if existing_id and existing_brand_id and existing_name:
            model_key_to_id[(existing_brand_id, normalize_lookup_name(existing_name))] = existing_id


def category_chain_names(category_index: Dict[int, Dict[str, Any]], wc_cat_id: Optional[int], fallback_name: str) -> List[str]:
    if wc_cat_id is None:
        return [normalize_cat_name(fallback_name)] if fallback_name else []
    out: List[str] = []
    seen = set()
    cur = wc_cat_id
    while cur and cur not in seen:
        seen.add(cur)
        cat = category_index.get(cur) or {}
        name = normalize_cat_name(str(cat.get("name") or ""))
        if name:
            out.append(name)
        parent = cat.get("parent")
        try:
            cur = int(parent) if parent is not None else 0
        except Exception:
            cur = 0
    if not out and fallback_name:
        out.append(normalize_cat_name(fallback_name))
    return list(reversed(out))


def infer_brand_model_from_categories(
    cats: List[Dict[str, Any]],
    category_index: Dict[int, Dict[str, Any]],
) -> Tuple[Optional[str], Optional[str], Optional[Tuple[int, str]], Optional[Tuple[int, str]]]:
    brand_from_cat: Optional[str] = None
    selected_non_brand_cat: Optional[Tuple[int, str]] = None
    deepest_model_cat: Optional[Tuple[int, str]] = None
    deepest_model_depth = -1

    for c in cats or []:
        wc_cat_id = c.get("id")
        try:
            cat_id_int = int(wc_cat_id) if wc_cat_id is not None else None
        except Exception:
            cat_id_int = None
        wc_cat_name = normalize_cat_name(str(c.get("name") or ""))
        chain = category_chain_names(category_index, cat_id_int, wc_cat_name)

        matched_brand = None
        matched_brand_index = -1
        for idx, chain_name in enumerate(chain):
            candidate_brand = match_brand_from_category(chain_name)
            if candidate_brand:
                matched_brand = candidate_brand
                matched_brand_index = idx
                break

        if matched_brand and brand_from_cat is None:
            brand_from_cat = matched_brand

        if matched_brand is None and cat_id_int is not None and selected_non_brand_cat is None:
            selected_non_brand_cat = (cat_id_int, wc_cat_name)

        if matched_brand and matched_brand_index >= 0:
            model_candidates = chain[matched_brand_index + 1 :]
            for depth, chain_name in enumerate(model_candidates, start=matched_brand_index + 1):
                cleaned = clean_model_name(chain_name, matched_brand)
                if cleaned and depth > deepest_model_depth:
                    deepest_model_depth = depth
                    deepest_model_cat = (cat_id_int or 0, cleaned)
            if not model_candidates:
                cleaned_self = clean_model_name(wc_cat_name, matched_brand)
                if cleaned_self and len(chain) > deepest_model_depth:
                    deepest_model_depth = len(chain)
                    deepest_model_cat = (cat_id_int or 0, cleaned_self)

    return brand_from_cat, deepest_model_cat[1] if deepest_model_cat else None, selected_non_brand_cat, deepest_model_cat


def fetch_all(path: str, query: Dict[str, Any], per_page_override: Optional[int] = None, sleep_ms_override: Optional[int] = None) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    page = 1
    while True:
        per_page = min(100, max(1, per_page_override if per_page_override is not None else WC_PER_PAGE))
        if sleep_ms_override is not None and sleep_ms_override > 0:
            time.sleep(sleep_ms_override / 1000)
        batch = wc_get(path, {**query, "per_page": per_page, "page": page})
        if not batch:
            break
        if not isinstance(batch, list):
            raise RuntimeError(f"Unexpected response for {path}: {type(batch)}")
        items.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
    return items


def contains_watch_keyword(text: str) -> bool:
    t = (text or "").lower()
    return any(k in t for k in WATCH_KEYWORDS)


def is_watch_product(p: Dict[str, Any]) -> bool:
    name = str(p.get("name") or "")
    slug_text = str(p.get("slug") or "")
    negative_text = f"{name} {slug_text}".lower()
    if "customer login" in negative_text or "my account" in negative_text:
        return False
    if not ONLY_WATCH:
        return True
    if contains_watch_keyword(name) or contains_watch_keyword(slug_text):
        return True
    cats = p.get("categories") or []
    if isinstance(cats, list) and cats:
        for c in cats:
            cid = c.get("id")
            if cid is not None and int(cid) in WATCH_CATEGORY_IDS:
                return True
            cslug = str(c.get("slug") or "").strip().lower()
            if cslug and cslug in WATCH_CATEGORY_SLUGS:
                return True
            if contains_watch_keyword(str(c.get("name") or "")) or contains_watch_keyword(str(c.get("slug") or "")):
                return True
    return False


def main() -> int:
    if not WC_CONSUMER_KEY or not WC_CONSUMER_SECRET:
        print("缺少 WooCommerce API Key。请设置环境变量：WC_CONSUMER_KEY / WC_CONSUMER_SECRET")
        return 1

    print("Login watch_shop admin...")
    login = watch_shop_req(
        "POST",
        "/api/admin/auth/login",
        data={"username": WATCH_SHOP_ADMIN_USER, "password": WATCH_SHOP_ADMIN_PASS},
    )
    token = login["token"]
    print("Login OK")

    print("Fetch Woo categories...")
    wc_categories = fetch_all("/wp-json/wc/v3/products/categories", {"hide_empty": False}, per_page_override=50, sleep_ms_override=200)
    category_index: Dict[int, Dict[str, Any]] = {}
    for cat in wc_categories or []:
        try:
            category_index[int(cat.get("id"))] = cat
        except Exception:
            continue

    if WATCH_PARENT_CATEGORY_SLUGS:
        slug_to_id: Dict[str, int] = {}
        children: Dict[int, List[int]] = defaultdict(list)
        for cid, cat in category_index.items():
            slug_text = str(cat.get("slug") or "").strip().lower()
            if slug_text:
                slug_to_id[slug_text] = cid
            parent_id = cat.get("parent")
            try:
                pid = int(parent_id) if parent_id is not None else 0
            except Exception:
                pid = 0
            if pid and pid != cid:
                children[pid].append(cid)

        def collect_descendants(root_id: int) -> List[int]:
            out: List[int] = []
            stack = [root_id]
            seen = set()
            while stack:
                cur = stack.pop()
                if cur in seen:
                    continue
                seen.add(cur)
                out.append(cur)
                for ch in children.get(cur, []):
                    stack.append(ch)
            return out

        expanded_ids: List[int] = []
        for s in WATCH_PARENT_CATEGORY_SLUGS:
            root = slug_to_id.get(s)
            if root is not None:
                expanded_ids.extend(collect_descendants(root))

        for cid in expanded_ids:
            WATCH_CATEGORY_IDS.add(int(cid))
            cat = category_index.get(int(cid)) or {}
            s = str(cat.get("slug") or "").strip().lower()
            if s:
                WATCH_CATEGORY_SLUGS.add(s)

    category_map: Dict[int, str] = {}
    created_categories = 0

    def ensure_category(wc_id: Optional[int], name_hint: str, image_hint: str) -> str:
        nonlocal created_categories
        if wc_id is None:
            return "wc-uncategorized"
        if wc_id in category_map:
            return category_map[wc_id]
        cat = category_index.get(wc_id) or {}
        name = str(cat.get("name") or name_hint or f"Category {wc_id}").strip()[:128]
        img = (cat.get("image") or {}).get("src") or image_hint or FALLBACK_IMAGE
        cid = f"wc-{wc_id}-{slug(str(cat.get('slug') or name), 40)}"[:64]
        watch_shop_upsert("/api/admin/categories", token, {"id": cid, "name": name, "image": str(img)[:1024]})
        category_map[wc_id] = cid
        created_categories += 1
        return cid

    if CLEAR_EXISTING:
        print("Clear existing catalog...")
        products = watch_shop_req("GET", "/api/admin/products", token=token) or []
        categories = watch_shop_req("GET", "/api/admin/categories", token=token) or []
        brands = watch_shop_req("GET", "/api/admin/brands", token=token) or []
        models = watch_shop_req("GET", "/api/admin/models", token=token) or []

        for i, p in enumerate(products, 1):
            watch_shop_req("DELETE", f"/api/admin/products/{urllib.parse.quote(p['id'])}", token=token)
            if i % 200 == 0:
                print(f"Deleted products {i}/{len(products)}")
        for i, c in enumerate(categories, 1):
            watch_shop_req("DELETE", f"/api/admin/categories/{urllib.parse.quote(c['id'])}", token=token)
            if i % 200 == 0:
                print(f"Deleted categories {i}/{len(categories)}")
        for i, m in enumerate(models, 1):
            watch_shop_req("DELETE", f"/api/admin/models/{urllib.parse.quote(m['id'])}", token=token)
            if i % 200 == 0:
                print(f"Deleted models {i}/{len(models)}")
        for i, b in enumerate(brands, 1):
            watch_shop_req("DELETE", f"/api/admin/brands/{urllib.parse.quote(b['id'])}", token=token)
            if i % 200 == 0:
                print(f"Deleted brands {i}/{len(brands)}")

    watch_shop_upsert("/api/admin/categories", token, {"id": "wc-uncategorized", "name": "Uncategorized", "image": FALLBACK_IMAGE})
    created_categories += 1
    watch_shop_upsert("/api/admin/categories", token, {"id": "replica-watch", "name": "Replica Watch", "image": FALLBACK_IMAGE})
    created_categories += 1

    if not CLEAR_EXISTING:
        try:
            existing_products = watch_shop_req("GET", "/api/admin/products", token=token) or []
            if isinstance(existing_products, list):
                print(f"Existing DB products: {len(existing_products)}")
        except Exception:
            pass

    def product_source():
        # Deduplicate only within the current WooCommerce crawl.
        # Existing DB products must still be reprocessed so upsert can fill in
        # missing brand/model/spec data during supplement runs.
        seen: set[str] = set()
        if ONLY_WATCH and WATCH_CATEGORY_IDS:
            for cid in sorted(WATCH_CATEGORY_IDS):
                print(f"Start category={cid}")
                page = 1
                no_new_streak = 0
                while True:
                    batch = wc_get("/wp-json/wc/v3/products", {"status": "any", "category": cid, "per_page": WC_PER_PAGE, "page": page})
                    if not batch:
                        break
                    if not isinstance(batch, list):
                        raise RuntimeError("Unexpected products response")
                    new_count = 0
                    for p in batch:
                        pid = str(p.get("id") or "").strip()
                        if not pid or pid in seen:
                            continue
                        seen.add(pid)
                        new_count += 1
                        yield p
                    print(f"Fetched category={cid} page={page} count={len(batch)} new={new_count} seen={len(seen)}")
                    if new_count == 0:
                        no_new_streak += 1
                        if no_new_streak >= 10:
                            print(f"Stop category={cid} due to no-new streak pages={no_new_streak}")
                            break
                    else:
                        no_new_streak = 0
                    if len(batch) < WC_PER_PAGE:
                        break
                    page += 1
        else:
            page = 1
            no_new_streak = 0
            while True:
                batch = wc_get("/wp-json/wc/v3/products", {"status": "any", "per_page": WC_PER_PAGE, "page": page})
                if not batch:
                    break
                if not isinstance(batch, list):
                    raise RuntimeError("Unexpected products response")
                new_count = 0
                for p in batch:
                    pid = str(p.get("id") or "").strip()
                    if not pid or pid in seen:
                        continue
                    seen.add(pid)
                    new_count += 1
                    yield p
                print(f"Fetched products page={page} count={len(batch)} new={new_count} seen={len(seen)}")
                if new_count == 0:
                    no_new_streak += 1
                    if no_new_streak >= 10:
                        print(f"Stop products paging due to no-new streak pages={no_new_streak}")
                        break
                else:
                    no_new_streak = 0
                if len(batch) < WC_PER_PAGE:
                    break
                page += 1

    brand_name_to_id: Dict[str, str] = {}
    model_key_to_id: Dict[Tuple[str, str], str] = {}

    if not CLEAR_EXISTING:
        try:
            prefill_brand_cache(token, brand_name_to_id)
            if brand_name_to_id:
                print(f"Prefilled brands from DB: {len(brand_name_to_id)}")
        except Exception:
            pass

        try:
            prefill_model_cache(token, model_key_to_id)
            if model_key_to_id:
                print(f"Prefilled models from DB: {len(model_key_to_id)}")
        except Exception:
            pass

    created_brands = 0
    created_models = 0
    created_products = 0
    skipped = defaultdict(int)

    for p in product_source():
        if not is_watch_product(p):
            skipped["filtered_not_watch"] += 1
            continue
        p_type = str(p.get("type") or "").strip().lower()
        if p_type not in {"simple", "variable"}:
            skipped[f"type:{p_type or 'unknown'}"] += 1
            continue

        wp_id = str(p.get("id") or "").strip()
        if not wp_id:
            skipped["missing_id"] += 1
            continue

        name = str(p.get("name") or "").strip()
        if not name:
            skipped["missing_name"] += 1
            continue

        images = p.get("images")
        wc_gallery = pick_images(images)
        fallback_cover = pick_image(images)
        cover_image = (wc_gallery[1] if len(wc_gallery) >= 2 else (wc_gallery[0] if wc_gallery else fallback_cover))
        gallery = wc_gallery[:] if wc_gallery else [fallback_cover]
        if cover_image and cover_image not in gallery:
            gallery.insert(0, cover_image)

        cats = p.get("categories") or []
        category_id = "replica-watch"
        collection = "Replica Watch"
        brand_from_cat = None
        model_from_cat = None
        selected_non_brand_cat: Optional[Tuple[int, str]] = None
        selected_model_cat: Optional[Tuple[int, str]] = None
        if isinstance(cats, list) and cats:
            brand_from_cat, model_from_cat, selected_non_brand_cat, selected_model_cat = infer_brand_model_from_categories(cats, category_index)
        if selected_non_brand_cat is not None:
            wc_cat_id, wc_cat_name = selected_non_brand_cat
            try:
                category_id = ensure_category(wc_cat_id, wc_cat_name, cover_image or fallback_cover)
                collection = (wc_cat_name or "Replica Watch")[:256]
            except Exception:
                category_id = "replica-watch"
                collection = "Replica Watch"
        elif selected_model_cat is not None:
            _, model_cat_name = selected_model_cat
            if model_cat_name:
                collection = model_cat_name[:256]

        description = strip_html(str(p.get("short_description") or "").strip())
        if not description:
            description = strip_html(str(p.get("description") or "").strip())
        if not description:
            description = name

        status = "on" if str(p.get("status") or "").strip().lower() == "publish" else "off"
        tag = None
        tags = p.get("tags") or []
        if isinstance(tags, list) and tags:
            tag = str(tags[0].get("name") or "").strip() or None

        attrs = p.get("attributes") or []
        brand = None
        model = None
        for a in attrs:
            an = str(a.get("name") or "").strip()
            options = a.get("options") or []
            if not isinstance(options, list) or not options:
                continue
            if brand is None and brand_key(an):
                brand = str(options[0]).strip()
            if model is None and model_key(an):
                model = str(options[0]).strip()
        if brand is None and brand_from_cat is not None:
            brand = brand_from_cat
        if brand is None:
            brand = infer_brand_from_name(name)
        if model is None and model_from_cat is not None:
            model = model_from_cat
        if model is None and brand is not None:
            model = infer_model_from_name(name, brand)

        brand_id = None
        model_id = None
        if brand:
            b_key = brand.strip()
            b_lookup = normalize_lookup_name(b_key)
            if b_key and b_lookup not in brand_name_to_id:
                bid = f"wc-{slug(b_key, 56)}"
                try:
                    watch_shop_req("POST", "/api/admin/brands", token=token, data={"id": bid, "name": b_key[:128], "image": ""})
                    brand_name_to_id[b_lookup] = bid
                    created_brands += 1
                except Exception as e:
                    if not is_conflict_error(e):
                        raise
                    prefill_brand_cache(token, brand_name_to_id)
                    if b_lookup not in brand_name_to_id:
                        raise
            brand_id = brand_name_to_id.get(b_lookup)
        if brand_id and model:
            m_key = model.strip()
            mk = (brand_id, normalize_lookup_name(m_key))
            if m_key and mk not in model_key_to_id:
                mid = f"{brand_id}-{slug(m_key, 56)}"
                mid = mid[:64]
                try:
                    watch_shop_req(
                        "POST",
                        "/api/admin/models",
                        token=token,
                        data={"id": mid, "brandId": brand_id, "name": m_key[:256], "image": cover_image[:1024]},
                    )
                    model_key_to_id[mk] = mid
                    created_models += 1
                except Exception as e:
                    if not is_conflict_error(e):
                        raise
                    prefill_model_cache(token, model_key_to_id)
                    if mk not in model_key_to_id:
                        raise
            model_id = model_key_to_id.get(mk)

        product_attr_values: Dict[str, List[str]] = {}
        base_specs: Dict[str, str] = {}
        for a in attrs:
            an = str(a.get("name") or "").strip()
            options = [str(opt).strip() for opt in (a.get("options") or []) if str(opt).strip()]
            if not an or not options:
                continue
            uniq = []
            for opt in options:
                if opt not in uniq:
                    uniq.append(opt)
            product_attr_values[an] = uniq
            if len(uniq) == 1:
                base_specs[an] = uniq[0]

        spec_groups: List[Dict[str, Any]] = []
        skus: List[Dict[str, Any]] = []

        if p_type == "simple":
            price = to_float(p.get("price")) or to_float(p.get("regular_price")) or 0.0
            if SKIP_ZERO_PRICE and (price is None or float(price) <= 0):
                skipped["simple_zero_price"] += 1
                continue
            regular = to_float(p.get("regular_price"))
            original = regular if regular and regular > price else None
            price = FORCE_PRICE
            original = None
            stock = to_int(p.get("stock_quantity"), 100 if str(p.get("stock_status") or "") == "instock" else 0)
            enabled = str(p.get("stock_status") or "") == "instock"
            sku_id = str(p.get("sku") or "").strip() or f"wc-{wp_id}-simple"

            specs: Dict[str, str] = {"Type": "simple", **base_specs}
            spec_groups = [{"name": "Type", "options": ["simple"]}] + [
                {"name": k, "options": vals} for k, vals in product_attr_values.items() if vals
            ]
            skus = [
                {
                    "id": sku_id[:64],
                    "specs": specs,
                    "price": price,
                    "originalPrice": original,
                    "stock": stock,
                    "enabled": bool(enabled),
                }
            ]

            product_price = price
            product_original = original
        else:
            variations = fetch_all(f"/wp-json/wc/v3/products/{wp_id}/variations", {"status": "any"})
            if not variations:
                skipped["variable_no_variations"] += 1
                continue

            group_values: Dict[str, List[str]] = defaultdict(list)
            for n, vals in product_attr_values.items():
                for opt in vals:
                    if opt not in group_values[n]:
                        group_values[n].append(opt)
            for v in variations:
                v_attrs = v.get("attributes") or []
                if not isinstance(v_attrs, list):
                    continue
                for va in v_attrs:
                    n = str(va.get("name") or "").strip()
                    opt = str(va.get("option") or "").strip()
                    if n and opt and opt not in group_values[n]:
                        group_values[n].append(opt)

            spec_groups = [{"name": k, "options": vals} for k, vals in group_values.items() if vals]

            min_price = None
            max_regular = None

            for v in variations:
                v_id = str(v.get("id") or "").strip()
                if not v_id:
                    continue
                v_price = to_float(v.get("price")) or to_float(v.get("regular_price")) or 0.0
                if SKIP_ZERO_PRICE and (v_price is None or float(v_price) <= 0):
                    continue
                v_regular = to_float(v.get("regular_price"))
                v_original = v_regular if v_regular and v_regular > v_price else None
                v_price = FORCE_PRICE
                v_original = None
                v_stock = to_int(v.get("stock_quantity"), 100 if str(v.get("stock_status") or "") == "instock" else 0)
                v_enabled = str(v.get("status") or "").strip().lower() == "publish" and str(v.get("stock_status") or "") == "instock"

                specs: Dict[str, str] = dict(base_specs)
                v_attrs = v.get("attributes") or []
                if isinstance(v_attrs, list):
                    for va in v_attrs:
                        n = str(va.get("name") or "").strip()
                        opt = str(va.get("option") or "").strip()
                        if n and opt:
                            specs[n] = opt

                sku_id = str(v.get("sku") or "").strip() or f"wc-var-{v_id}"
                skus.append(
                    {
                        "id": sku_id[:64],
                        "specs": specs,
                        "price": v_price,
                        "originalPrice": v_original,
                        "stock": v_stock,
                        "enabled": bool(v_enabled),
                    }
                )
                v_img = (v.get("image") or {}).get("src")
                if v_img:
                  u = str(v_img).strip()
                  if u and u not in gallery:
                    gallery.append(u)

                if v_enabled:
                    min_price = v_price if min_price is None else min(min_price, v_price)
                if v_regular is not None:
                    max_regular = v_regular if max_regular is None else max(max_regular, v_regular)

            if not skus:
                skipped["variable_no_skus"] += 1
                continue

            product_price = float(min_price if min_price is not None else min(s["price"] for s in skus))
            if max_regular and max_regular > product_price:
                product_original = float(max_regular)
            else:
                product_original = None

        product_id = f"wc-{wp_id}"

        payload = {
            "id": product_id[:64],
            "name": name[:256],
            "brand": brand,
            "model": model,
            "reference": wp_id,
            "collection": collection[:256],
            "price": product_price,
            "originalPrice": product_original,
            "image": cover_image[:1024],
            "images": gallery[:20],
            "tag": tag,
            "category": category_id[:64],
            "description": description[:4000],
            "status": status,
            "specGroups": spec_groups,
            "skus": skus,
            "brandId": brand_id,
            "modelId": model_id,
        }

        watch_shop_upsert("/api/admin/products", token, payload)
        created_products += 1
        if created_products % 100 == 0:
            print(f"Imported products: {created_products}")

    result = {
        "categories_created": created_categories,
        "brands_created": created_brands,
        "models_created": created_models,
        "products_created": created_products,
        "products_skipped": dict(skipped),
    }
    print("IMPORT DONE")
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
