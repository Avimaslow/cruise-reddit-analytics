# backfill_nlp.py
from __future__ import annotations
from datetime import datetime, timezone
from typing import List

from scraping.db import connect, init_db, upsert_nlp_score, upsert_extraction
from scraping.settings import load_settings

from NLP.nlp_sentiment import score_text
from NLP.entity_extract import extract_entities, dumps_list



def now_utc_int() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp())

# v1 lists (replace with file-loading later)
SHIP_KEYWORDS: List[str] = [
    "Wonder of the Seas", "Icon of the Seas", "Oasis of the Seas",
    "Symphony of the Seas", "Harmony of the Seas",
]
PORT_KEYWORDS: List[str] = [
    "Cozumel", "Costa Maya", "Belize City", "Roatan", "Nassau", "Labadee",
]

def score_posts(conn):
    cur = conn.cursor()
    cur.execute("SELECT post_id, title, selftext FROM posts")
    rows = cur.fetchall()
    for i, (post_id, title, selftext) in enumerate(rows, start=1):
        text = f"{title or ''}\n\n{selftext or ''}".strip()
        s = score_text(text)

        upsert_nlp_score(conn, {
            "object_type": "post",
            "object_id": post_id,
            "sentiment_label": s.label,
            "sentiment_score": s.score,
            "severity_score": s.severity,
            "model_version": "vader_v1",
            "scored_at_utc": now_utc_int(),
        })

        ent = extract_entities(text, SHIP_KEYWORDS, PORT_KEYWORDS)
        upsert_extraction(conn, {
            "object_type": "post",
            "object_id": post_id,
            "cruise_line": ent.cruise_line,
            "ship_ids": dumps_list(ent.ship_ids),
            "port_ids": dumps_list(ent.port_ids),
            "confidence": ent.confidence,
            "extracted_at_utc": now_utc_int(),
        })

        if i % 500 == 0:
            conn.commit()
            print(f"[POST NLP] processed {i}/{len(rows)}")

    conn.commit()
    print(f"[POST NLP] done: {len(rows)}")

def score_comments(conn):
    cur = conn.cursor()
    cur.execute("SELECT comment_id, body, author FROM comments")
    rows = cur.fetchall()
    for i, (comment_id, body, author) in enumerate(rows, start=1):
        # Skip obvious bot noise in v1
        if author == "AutoModerator":
            continue

        text = (body or "").strip()
        s = score_text(text)

        upsert_nlp_score(conn, {
            "object_type": "comment",
            "object_id": comment_id,
            "sentiment_label": s.label,
            "sentiment_score": s.score,
            "severity_score": s.severity,
            "model_version": "vader_v1",
            "scored_at_utc": now_utc_int(),
        })

        ent = extract_entities(text, SHIP_KEYWORDS, PORT_KEYWORDS)
        upsert_extraction(conn, {
            "object_type": "comment",
            "object_id": comment_id,
            "cruise_line": ent.cruise_line,
            "ship_ids": dumps_list(ent.ship_ids),
            "port_ids": dumps_list(ent.port_ids),
            "confidence": ent.confidence,
            "extracted_at_utc": now_utc_int(),
        })

        if i % 5000 == 0:
            conn.commit()
            print(f"[COMMENT NLP] processed {i}/{len(rows)}")

    conn.commit()
    print(f"[COMMENT NLP] done: {len(rows)}")

def main():
    settings = load_settings()
    conn = connect(settings.sqlite_path)
    init_db(conn)

    score_posts(conn)
    score_comments(conn)

    conn.close()
    print("Done NLP backfill.")

if __name__ == "__main__":
    main()
