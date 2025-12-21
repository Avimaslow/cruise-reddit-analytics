import csv
import os
from typing import Optional
from settings import Settings

POST_FIELDS = [
    "post_id","subreddit","cruise_line_from_subreddit","created_utc","title","selftext",
    "author","score","num_comments","url","permalink","over_18","is_self","link_flair_text",
    "retrieved_at_utc","comments_last_ingested_utc","comments_last_count"
]
COMMENT_FIELDS = [
    "comment_id","post_id","subreddit","created_utc","body","author","score","permalink","retrieved_at_utc"
]


def export_posts(conn, settings: Settings, outfile: str, subreddit: Optional[str] = None) -> int:
    os.makedirs(settings.export_dir, exist_ok=True)
    path = os.path.join(settings.export_dir, outfile)
    cur = conn.cursor()

    if subreddit:
        cur.execute(
            f"SELECT {','.join(POST_FIELDS)} FROM posts WHERE subreddit=? ORDER BY created_utc DESC",
            (subreddit,),
        )
    else:
        cur.execute(f"SELECT {','.join(POST_FIELDS)} FROM posts ORDER BY created_utc DESC")

    rows = cur.fetchall()
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(POST_FIELDS)
        w.writerows(rows)
    return len(rows)


def export_comments(conn, settings: Settings, outfile: str, subreddit: Optional[str] = None) -> int:
    os.makedirs(settings.export_dir, exist_ok=True)
    path = os.path.join(settings.export_dir, outfile)
    cur = conn.cursor()

    if subreddit:
        cur.execute(
            f"""
            SELECT {','.join(COMMENT_FIELDS)}
            FROM comments
            WHERE subreddit=?
            ORDER BY created_utc DESC
            """,
            (subreddit,),
        )
    else:
        cur.execute(f"SELECT {','.join(COMMENT_FIELDS)} FROM comments ORDER BY created_utc DESC")

    rows = cur.fetchall()
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(COMMENT_FIELDS)
        w.writerows(rows)
    return len(rows)
