from datetime import datetime, timezone
from typing import Dict, Tuple

import praw
from praw.models import Submission, Comment

from settings import Settings
from db import upsert_comment, mark_comments_ingested


def now_utc_int() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp())


def comment_to_row(c: Comment, post_id: str, subreddit_name: str) -> Dict:
    body = getattr(c, "body", "") or ""
    if body in ("[removed]", "[deleted]"):
        body = ""

    permalink = getattr(c, "permalink", None)
    return {
        "comment_id": c.id,
        "post_id": post_id,
        "subreddit": subreddit_name,
        "created_utc": int(getattr(c, "created_utc", 0) or 0),
        "body": body,
        "author": str(c.author) if c.author else None,
        "score": int(c.score) if c.score is not None else None,
        "permalink": f"https://www.reddit.com{permalink}" if permalink else None,
        "retrieved_at_utc": now_utc_int(),
    }


def ingest_comments_for_post(conn, reddit: praw.Reddit, post_id: str, settings: Settings) -> Tuple[int, int]:
    submission: Submission = reddit.submission(id=post_id)
    subreddit_name = str(submission.subreddit.display_name)

    # Expand "MoreComments" safely
    submission.comments.replace_more(limit=settings.replace_more_limit)

    count = 0
    for c in submission.comments.list():
        if not hasattr(c, "id"):
            continue
        upsert_comment(conn, comment_to_row(c, post_id, subreddit_name))
        count += 1
        if count >= settings.max_comments_per_post:
            break

    ingested_at = now_utc_int()
    mark_comments_ingested(conn, post_id, ingested_at, count)
    conn.commit()

    return count, ingested_at
