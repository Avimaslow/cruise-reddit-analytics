from datetime import datetime, timezone
from typing import Dict, Iterable

import praw
from praw.models import Submission

from settings import Settings
from db import upsert_post


def now_utc_int() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp())


def submission_to_row(sub: Submission, subreddit_name: str, line_label: str) -> Dict:
    selftext = sub.selftext or ""
    if selftext in ("[removed]", "[deleted]"):
        selftext = ""

    return {
        "post_id": sub.id,
        "subreddit": subreddit_name,
        "cruise_line_from_subreddit": line_label,
        "created_utc": int(sub.created_utc) if sub.created_utc else None,
        "title": sub.title or "",
        "selftext": selftext,
        "author": str(sub.author) if sub.author else None,
        "score": int(sub.score) if sub.score is not None else None,
        "num_comments": int(sub.num_comments) if sub.num_comments is not None else None,
        "url": sub.url,
        "permalink": f"https://www.reddit.com{sub.permalink}",
        "over_18": int(bool(sub.over_18)),
        "is_self": int(bool(sub.is_self)),
        "link_flair_text": sub.link_flair_text,
        "retrieved_at_utc": now_utc_int(),
        "comments_last_ingested_utc": None,
        "comments_last_count": None,
    }


def iter_listings(sr: praw.models.Subreddit, per_limit: int) -> Iterable[Submission]:
    """
    Max accessible coverage without pretending you can infinite-page:
      - new/hot/rising (recency + discovery)
      - top() across time windows (historical sampling)
    """
    yield from sr.new(limit=per_limit)
    yield from sr.hot(limit=per_limit)
    yield from sr.rising(limit=per_limit)

    for t in ["day", "week", "month", "year", "all"]:
        yield from sr.top(time_filter=t, limit=per_limit)


def ingest_subreddit_posts(conn, reddit: praw.Reddit, subreddit_name: str, line_label: str, settings: Settings) -> int:
    sr = reddit.subreddit(subreddit_name)
    seen_ids = set()
    kept = 0

    print(f"\n[POSTS] r/{subreddit_name}: collecting (limit per listing={settings.per_listing_limit})")

    for idx, sub in enumerate(iter_listings(sr, settings.per_listing_limit), start=1):
        if not getattr(sub, "id", None):
            continue
        if sub.id in seen_ids:
            continue
        seen_ids.add(sub.id)

        upsert_post(conn, submission_to_row(sub, subreddit_name, line_label))
        kept += 1

        if idx % 200 == 0:
            conn.commit()
            print(f"  collected {kept} unique posts so far...")

    conn.commit()
    print(f"[POSTS] r/{subreddit_name}: done. unique posts this run: {kept}")
    return kept
