# cruiseNLP/api/db.py
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Tuple


def _db_score(path: Path) -> int:
    if not path.exists():
        return -1
    try:
        conn = sqlite3.connect(path)
        try:
            tables = ["posts", "comments", "extraction", "nlp_scores", "themes"]
            table_count = conn.execute(
                """
                SELECT COUNT(*)
                FROM sqlite_master
                WHERE type='table'
                  AND name IN ('posts', 'comments', 'extraction', 'nlp_scores', 'themes')
                """
            ).fetchone()[0]
            row_total = 0
            for table in tables:
                exists = conn.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
                    (table,),
                ).fetchone()
                if exists:
                    row_total += int(conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] or 0)
            return int(table_count or 0) * 1_000_000 + row_total
        finally:
            conn.close()
    except sqlite3.Error:
        return -1


def _resolve_sqlite_path() -> str:
    env_path = os.getenv("SQLITE_PATH")
    if env_path:
        return str(Path(env_path).expanduser().resolve())

    api_dir = Path(__file__).resolve().parent
    candidates = [
        api_dir.parent / "cruise_reddit.db",
        api_dir.parent / "scraping" / "cruise_reddit.db",
        Path.cwd() / "cruise_reddit.db",
    ]

    ranked = sorted(candidates, key=_db_score, reverse=True)
    return str(ranked[0].resolve())


_SQLITE_PATH = _resolve_sqlite_path()


def get_sqlite_path() -> str:
    return _SQLITE_PATH


def _connect() -> sqlite3.Connection:
    # You want to see this every time the API touches the DB
    print(f"[api] connecting sqlite_path={_SQLITE_PATH}")

    conn = sqlite3.connect(_SQLITE_PATH)
    conn.row_factory = sqlite3.Row

    # Ensure JSON1 is available (most modern SQLite builds have it)
    # Not strictly required, but safe:
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


@contextmanager
def get_conn():
    conn = _connect()
    try:
        yield conn
    finally:
        conn.close()


def fetch_all(conn: sqlite3.Connection, sql: str, params: Tuple[Any, ...] = ()) -> list[dict]:
    cur = conn.execute(sql, params)
    rows = cur.fetchall()
    return [dict(r) for r in rows]


def fetch_one(conn: sqlite3.Connection, sql: str, params: Tuple[Any, ...] = ()) -> dict | None:
    cur = conn.execute(sql, params)
    row = cur.fetchone()
    return dict(row) if row else None
