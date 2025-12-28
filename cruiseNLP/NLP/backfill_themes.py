# NLP/backfill_themes.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Tuple

from scraping.db import connect, init_db, upsert_theme
from .theme_classifier import score_theme_hits, MODEL_VERSION

def now_utc_int() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp())

def iter_posts(conn) -> Iterable[Tuple[str, str]]:
    cur = conn.cursor()
    cur.execute("SELECT post_id, COALESCE(title,'') || ' ' || COALESCE(selftext,'') FROM posts")
    yield from cur.fetchall()

def iter_comments(conn) -> Iterable[Tuple[str, str]]:
    cur = conn.cursor()
    cur.execute("SELECT comment_id, COALESCE(body,'') FROM comments")
    yield from cur.fetchall()

def main():
    import os
    db_path = os.getenv("SQLITE_PATH", "scraping/cruise_reddit.db")

    conn = connect(db_path)
    init_db(conn)

    ts = now_utc_int()

    # Posts
    post_count = 0
    theme_rows = 0
    for post_id, text in iter_posts(conn):
        post_count += 1
        hits = score_theme_hits(text, max_themes=3)
        for h in hits:
            upsert_theme(conn, {
                "object_type": "post",
                "object_id": post_id,
                "theme_label": h.label,
                "theme_score": h.score,
                "model_version": MODEL_VERSION,
                "labeled_at_utc": ts,
            })
            theme_rows += 1

        if post_count % 1000 == 0:
            conn.commit()
            print(f"[POST THEMES] processed {post_count}")

    conn.commit()
    print(f"[POST THEMES] done: posts={post_count}, theme_rows_upserted={theme_rows}")

    # Comments
    comment_count = 0
    theme_rows = 0
    for comment_id, text in iter_comments(conn):
        comment_count += 1
        hits = score_theme_hits(text, max_themes=3)
        for h in hits:
            upsert_theme(conn, {
                "object_type": "comment",
                "object_id": comment_id,
                "theme_label": h.label,
                "theme_score": h.score,
                "model_version": MODEL_VERSION,
                "labeled_at_utc": ts,
            })
            theme_rows += 1

        if comment_count % 20000 == 0:
            conn.commit()
            print(f"[COMMENT THEMES] processed {comment_count}")

    conn.commit()
    print(f"[COMMENT THEMES] done: comments={comment_count}, theme_rows_upserted={theme_rows}")
    print("Done themes backfill.")

    conn.close()

if __name__ == "__main__":
    main()
