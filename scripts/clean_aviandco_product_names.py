#!/usr/bin/env python3
import os
import re
import subprocess


MYSQL_SOCKET = os.getenv("MYSQL_SOCKET", "/tmp/mysql.sock")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASS = os.getenv("MYSQL_PASS", "123456")
MYSQL_DB = os.getenv("MYSQL_DB", "watch_shop")


def mysql_rows(sql: str) -> list[list[str]]:
    cmd = ["mysql", f"--socket={MYSQL_SOCKET}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", "-D", MYSQL_DB, "-N", "-B", "-e", sql]
    out = subprocess.check_output(cmd, text=True)
    rows: list[list[str]] = []
    for line in out.splitlines():
        rows.append(line.split("\t"))
    return rows


def mysql_exec(sql: str) -> None:
    subprocess.check_call(["mysql", f"--socket={MYSQL_SOCKET}", f"-u{MYSQL_USER}", f"-p{MYSQL_PASS}", "-D", MYSQL_DB, "-e", sql])


def sql_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "''")


def clean_name(name: str) -> str:
    text = re.sub(r"\s+", " ", name or "").strip()
    if not text:
        return text

    tokens = text.split(" ")
    best = text
    for start in range(2, max(2, len(tokens) - 2)):
        suffix = " ".join(tokens[start:]).strip()
        if len(suffix) < 18:
            continue
        prefix = " ".join(tokens[:start]).strip()
        if prefix.endswith(suffix):
            candidate = prefix
            if len(candidate) < len(best):
                best = candidate

    # Avi & Co. names often repeat the specs after the reference code:
    # "Rolex ... 40 mm 126500LN, ... 40 mm" -> keep the first full sentence.
    match = re.match(r"^(.+\b\d{2,4}\s*mm)\s+(.+)$", best, flags=re.IGNORECASE)
    if match:
        head, tail = match.group(1).strip(), match.group(2).strip()
        head_words = set(re.findall(r"[a-z0-9]+", head.lower()))
        tail_words = set(re.findall(r"[a-z0-9]+", tail.lower()))
        if tail_words and len(tail_words & head_words) / max(1, len(tail_words)) > 0.65:
            best = head

    return best[:240].strip()


def main() -> int:
    changed = 0
    rows = mysql_rows("SELECT id, name FROM product ORDER BY id")
    for product_id, name in rows:
        cleaned = clean_name(name)
        if cleaned and cleaned != name:
            mysql_exec(f"UPDATE product SET name='{sql_escape(cleaned)}' WHERE id='{sql_escape(product_id)}'")
            changed += 1
    print(f"names_cleaned={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
