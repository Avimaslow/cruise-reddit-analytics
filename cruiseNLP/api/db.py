# cruiseNLP/api/db.py
from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Tuple

# Single source of truth for DB path:
# Set SQLITE_PATH in your shell to avoid accidentally using another DB.
_DEFAULT = "cruise_reddit.db"
_SQLITE_PATH = str(Path(os.getenv("SQLITE_PATH", _DEFAULT)).expanduser().resolve())


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
