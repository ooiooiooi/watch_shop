import os
import subprocess


MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_DB = os.getenv("MYSQL_DB", "watch_shop")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456")


def mysql_query(sql):
    result = subprocess.run(
        [
            "mysql",
            f"-h{MYSQL_HOST}",
            f"-u{MYSQL_USER}",
            f"-p{MYSQL_PASSWORD}",
            "-D",
            MYSQL_DB,
            "-N",
            "-B",
            "-e",
            sql,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    return [line.split("\t") for line in lines]


def mysql_exec(sql):
    subprocess.run(
        [
            "mysql",
            f"-h{MYSQL_HOST}",
            f"-u{MYSQL_USER}",
            f"-p{MYSQL_PASSWORD}",
            "-D",
            MYSQL_DB,
            "-e",
            sql,
        ],
        check=True,
    )


def choose_keep(group):
    def rank(brand):
        brand_id = brand["id"]
        if brand_id.startswith("wc-brand-"):
            return (2, len(brand_id), brand_id)
        if brand_id.startswith("wc-"):
            return (1, len(brand_id), brand_id)
        return (0, len(brand_id), brand_id)

    return sorted(group, key=rank)[0]


def load_brands():
    rows = mysql_query("SELECT id, name FROM brand ORDER BY name, id")
    return [{"id": row[0], "name": row[1]} for row in rows]


def list_duplicate_groups(brands):
    name_to_brands = {}
    for brand in brands:
        key = brand["name"].strip().lower()
        if not key:
            continue
        name_to_brands.setdefault(key, []).append(brand)
    return {name: group for name, group in name_to_brands.items() if len(group) > 1}


def find_keep_for_merged_brand(brand, all_brands_by_id):
    brand_id = brand["id"]
    candidates = []
    if brand_id.startswith("wc-brand-"):
        candidates.append(brand_id[len("wc-brand-"):])
    if brand_id.startswith("wc-"):
        candidates.append(brand_id[len("wc-"):])
    for candidate in candidates:
        if candidate in all_brands_by_id:
            return all_brands_by_id[candidate]
    return None


def merge_one(old_brand, keep_brand):
    old_id = old_brand["id"]
    keep_id = keep_brand["id"]
    keep_name = keep_brand["name"].replace("'", "''")
    old_id_sql = old_id.replace("'", "''")

    model_count = int(mysql_query(f"SELECT COUNT(*) FROM watch_model WHERE brand_id='{old_id_sql}'")[0][0])
    product_count = int(mysql_query(f"SELECT COUNT(*) FROM product WHERE brand_id='{old_id_sql}'")[0][0])

    mysql_exec(
        f"""
        UPDATE watch_model SET brand_id='{keep_id}' WHERE brand_id='{old_id_sql}';
        UPDATE product SET brand_id='{keep_id}', brand='{keep_name}' WHERE brand_id='{old_id_sql}';
        DELETE FROM brand WHERE id='{old_id_sql}';
        """
    )
    print(f"Merged {old_id} -> {keep_id} (models={model_count}, products={product_count})")


def main():
    brands = load_brands()
    brands_by_id = {brand["id"]: brand for brand in brands}

    duplicate_groups = list_duplicate_groups(brands)
    print(f"Duplicate brand groups: {len(duplicate_groups)}")

    for _, group in sorted(duplicate_groups.items()):
        keep = choose_keep(group)
        for brand in group:
            if brand["id"] == keep["id"]:
                continue
            merge_one(brand, keep)

    brands = load_brands()
    brands_by_id = {brand["id"]: brand for brand in brands}
    merged_leftovers = [brand for brand in brands if brand["name"].startswith("merged-")]
    for brand in merged_leftovers:
        keep = find_keep_for_merged_brand(brand, brands_by_id)
        if keep is None:
            print(f"Skip leftover {brand['id']} ({brand['name']}) - no keep target found")
            continue
        merge_one(brand, keep)

    remaining = list_duplicate_groups(load_brands())
    print(f"Remaining duplicate brand groups: {len(remaining)}")
    for name, group in sorted(remaining.items()):
        print(name, "=>", [brand["id"] for brand in group])


if __name__ == "__main__":
    main()
