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
    def rank(model):
        model_id = model["id"]
        if model_id.startswith("wc-brand-") or model_id.startswith("wc-"):
            return (1, len(model_id), model_id)
        return (0, len(model_id), model_id)

    return sorted(group, key=rank)[0]


def load_models():
    rows = mysql_query("SELECT id, brand_id, name FROM watch_model ORDER BY brand_id, name, id")
    return [{"id": row[0], "brand_id": row[1], "name": row[2]} for row in rows]


def list_duplicate_groups(models):
    buckets = {}
    for model in models:
        key = (model["brand_id"], model["name"].strip().lower())
        if not key[1]:
            continue
        buckets.setdefault(key, []).append(model)
    return {key: group for key, group in buckets.items() if len(group) > 1}


def merge_one(old_model, keep_model):
    old_id = old_model["id"].replace("'", "''")
    keep_id = keep_model["id"].replace("'", "''")
    keep_name = keep_model["name"].replace("'", "''")

    product_count = int(mysql_query(f"SELECT COUNT(*) FROM product WHERE model_id='{old_id}'")[0][0])
    mysql_exec(
        f"""
        UPDATE product SET model_id='{keep_id}', model='{keep_name}' WHERE model_id='{old_id}';
        DELETE FROM watch_model WHERE id='{old_id}';
        """
    )
    print(f"Merged model {old_model['id']} -> {keep_model['id']} (products={product_count})")


def main():
    duplicate_groups = list_duplicate_groups(load_models())
    print(f"Duplicate model groups: {len(duplicate_groups)}")
    for _, group in sorted(duplicate_groups.items()):
        keep = choose_keep(group)
        for model in group:
            if model["id"] == keep["id"]:
                continue
            merge_one(model, keep)

    remaining = list_duplicate_groups(load_models())
    print(f"Remaining duplicate model groups: {len(remaining)}")
    for key, group in sorted(remaining.items()):
        print(key, "=>", [model["id"] for model in group])


if __name__ == "__main__":
    main()
