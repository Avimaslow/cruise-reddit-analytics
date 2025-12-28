import os
import time

from settings import load_settings
from reddit_client import create_reddit
from db import connect, init_db, iter_post_ids_needing_comments
from ingest_posts import ingest_subreddit_posts
from ingest_comments import ingest_comments_for_post
from export_csv import export_posts, export_comments


def main() -> None:
    settings = load_settings()
    reddit = create_reddit(settings)

    conn = connect(settings.sqlite_path)
    init_db(conn)

    # 1) Ingest posts (max accessible via multiple listings)
    total_posts = 0
    for sub_name, line_label in settings.subreddits.items():
        try:
            total_posts += ingest_subreddit_posts(conn, reddit, sub_name, line_label, settings)
        except Exception as e:
            print(f"[WARN] posts failed for r/{sub_name}: {e}")

    print(f"\n[RUN] Posts ingestion complete. Upserted (this run): {total_posts}")

    # 2) Ingest comments (only for posts that need it)
    total_comments = 0
    processed_posts = 0

    for post_id in iter_post_ids_needing_comments(conn, only_recent_days=14):
        try:
            c, ingested_at = ingest_comments_for_post(conn, reddit, post_id, settings)
            total_comments += c
            processed_posts += 1

            if processed_posts % 25 == 0:
                print(f"[COMMENTS] processed {processed_posts} posts; total comments upserted: {total_comments}")

            time.sleep(settings.sleep_seconds_between_posts)
        except Exception as e:
            print(f"[WARN] comments failed for post {post_id}: {e}")

    print(f"\n[RUN] Comments ingestion complete. Posts processed: {processed_posts}, comments upserted: {total_comments}")

    # 3) Export
    pcount = export_posts(conn, settings, "posts.csv")
    ccount = export_comments(conn, settings, "comments.csv")
    print(f"[EXPORT] {settings.export_dir}/posts.csv rows={pcount}")
    print(f"[EXPORT] {settings.export_dir}/comments.csv rows={ccount}")

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
