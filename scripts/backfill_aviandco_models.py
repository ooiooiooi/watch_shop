#!/usr/bin/env python3
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import import_wc_api as shared


MYSQL_SOCKET = os.getenv("MYSQL_SOCKET", "/tmp/mysql.sock")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "watch_shop")


def mysql_cmd() -> List[str]:
    return [
        "mysql",
        f"--socket={MYSQL_SOCKET}",
        f"-u{MYSQL_USER}",
        f"-p{MYSQL_PASSWORD}",
        "-D",
        MYSQL_DATABASE,
        "--batch",
        "--raw",
        "--skip-column-names",
    ]


def mysql_query(sql: str) -> List[str]:
    proc = subprocess.run(mysql_cmd() + ["-e", sql], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())
    return [line for line in proc.stdout.splitlines() if line.strip()]


def mysql_exec(sql: str) -> None:
    proc = subprocess.run(mysql_cmd(), input=sql, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip())


def sql_quote(value: Optional[str]) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def model_id_for(brand_id: str, model_name: str) -> str:
    return f"{brand_id}-{shared.slug(model_name, 40)}"[:64]


def brand_id_for(brand_name: str) -> str:
    return f"avi-brand-{shared.slug(brand_name, 48)}"[:64]


def normalize_model_name(model: str) -> str:
    model = re.sub(r"\s+", " ", (model or "").strip())
    fixes = {
        "Overeseas": "Overseas",
        "Hue": "Hue By Avi & Co.",
        "Concept": "Royal Oak Concept",
        "Cintrée Curvex": "Cintree Curvex",
        "Vintage Daytona": "Daytona",
    }
    return fixes.get(model, model)


def infer_model(product: Dict[str, Any]) -> Optional[str]:
    brand = str(product.get("brand") or "").strip()
    name = str(product.get("name") or "").strip()
    explicit = str(product.get("model") or "").strip()
    model = explicit or shared.infer_model_from_name(name, brand)
    if not model:
        return None
    return normalize_model_name(model)


def fetch_products() -> List[Dict[str, Any]]:
    rows = mysql_query(
        """
        SELECT JSON_OBJECT(
          'id', id,
          'name', name,
          'brand', brand,
          'brand_id', brand_id,
          'model', model,
          'model_id', model_id,
          'image', image
        )
        FROM product
        WHERE brand IS NOT NULL AND brand <> ''
        ORDER BY brand, name
        """
    )
    return [json.loads(row) for row in rows]


def fetch_brands() -> Dict[str, str]:
    rows = mysql_query("SELECT JSON_OBJECT('id', id, 'name', name) FROM brand")
    out: Dict[str, str] = {}
    for row in rows:
        item = json.loads(row)
        out[shared.normalize_lookup_name(str(item.get("name") or ""))] = str(item.get("id") or "")
    return {k: v for k, v in out.items() if k and v}


def main() -> int:
    brand_name_to_id = fetch_brands()
    products = fetch_products()
    brands_to_upsert: Dict[str, Dict[str, str]] = {}
    models: Dict[Tuple[str, str], Dict[str, str]] = {}
    assignments: List[Tuple[str, str, str, str]] = []
    missing: List[Tuple[str, str]] = []

    for product in products:
        product_id = str(product.get("id") or "").strip()
        brand = str(product.get("brand") or "").strip()
        brand_id = str(product.get("brand_id") or "").strip()
        if not brand_id:
            brand_id = brand_name_to_id.get(shared.normalize_lookup_name(brand), "")
        if brand and not brand_id:
            brand_id = brand_id_for(brand)
            brand_name_to_id[shared.normalize_lookup_name(brand)] = brand_id
        if brand and brand_id:
            brands_to_upsert.setdefault(
                brand_id,
                {
                    "id": brand_id,
                    "name": brand[:128],
                    "image": str(product.get("image") or "")[:1024],
                },
            )
        model_name = infer_model(product)
        if not product_id or not brand_id or not model_name:
            missing.append((brand, str(product.get("name") or "")))
            continue
        key = (brand_id, shared.normalize_lookup_name(model_name))
        model_id = model_id_for(brand_id, model_name)
        if key not in models:
            models[key] = {
                "id": model_id,
                "brand_id": brand_id,
                "name": model_name,
                "image": str(product.get("image") or "")[:1024],
            }
        assignments.append((product_id, brand_id, model_id, model_name))

    statements = ["START TRANSACTION;"]
    for brand in sorted(brands_to_upsert.values(), key=lambda item: item["name"]):
        statements.append(
            "INSERT INTO brand (id, image, name) VALUES "
            f"({sql_quote(brand['id'])}, {sql_quote(brand['image'])}, {sql_quote(brand['name'])}) "
            "ON DUPLICATE KEY UPDATE image=COALESCE(NULLIF(brand.image, ''), VALUES(image)), name=VALUES(name);"
        )
    for model in sorted(models.values(), key=lambda item: (item["brand_id"], item["name"])):
        statements.append(
            "INSERT INTO watch_model (id, brand_id, image, name) VALUES "
            f"({sql_quote(model['id'])}, {sql_quote(model['brand_id'])}, {sql_quote(model['image'])}, {sql_quote(model['name'])}) "
            "ON DUPLICATE KEY UPDATE brand_id=VALUES(brand_id), image=VALUES(image), name=VALUES(name);"
        )
    for product_id, brand_id, model_id, model_name in assignments:
        statements.append(
            "UPDATE product SET "
            f"brand_id={sql_quote(brand_id)}, model_id={sql_quote(model_id)}, model={sql_quote(model_name)} "
            f"WHERE id={sql_quote(product_id)};"
        )
    statements.append("COMMIT;")
    mysql_exec("\n".join(statements))

    by_brand: Dict[str, int] = defaultdict(int)
    for model in models.values():
        by_brand[model["brand_id"]] += 1

    print(json.dumps({
        "products_scanned": len(products),
        "products_assigned": len(assignments),
        "products_missing_model": len(missing),
        "brands_upserted": len(brands_to_upsert),
        "models_upserted": len(models),
        "models_by_brand_id": dict(sorted(by_brand.items())),
        "missing_examples": missing[:20],
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
