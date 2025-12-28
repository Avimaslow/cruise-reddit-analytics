import os
from dataclasses import dataclass
from typing import Dict
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    # Reddit API creds
    reddit_client_id: str
    reddit_client_secret: str
    reddit_user_agent: str

    # Storage
    sqlite_path: str

    # Subreddit config
    subreddits: Dict[str, str]

    # Ingestion knobs
    per_listing_limit: int

    # Comment knobs
    replace_more_limit: int
    max_comments_per_post: int

    # Throttle
    sleep_seconds_between_posts: float

    # Export
    export_dir: str


def load_settings() -> Settings:
    # You can add/remove here freely.
    # Keys must match subreddit names WITHOUT "r/" prefix.
    subreddits = {
        "Cruise": "Mixed",
        "Cruises": "Mixed",

        "royalcaribbean": "Royal Caribbean",
        "CarnivalCruise": "Carnival",
        "CarnivalCruiseFans": "Carnival",

        "NCL": "Norwegian",
        "MSCCruises": "MSC",
        "CelebrityCruises": "Celebrity",

        "dcl": "Disney",

        "PrincessCruises": "Princess",
        "VirginVoyages": "Virgin",
    }

    client_id = os.getenv("REDDIT_CLIENT_ID", "").strip()
    client_secret = os.getenv("REDDIT_CLIENT_SECRET", "").strip()
    user_agent = os.getenv("REDDIT_USER_AGENT", "").strip() or "RoyalCaribbeanNLP:v0.1"

    sqlite_path = os.getenv("SQLITE_PATH", "cruise_reddit.db").strip()

    per_listing_limit = int(os.getenv("PER_LISTING_LIMIT", "1000"))
    replace_more_limit = int(os.getenv("REPLACE_MORE_LIMIT", "32"))
    max_comments_per_post = int(os.getenv("MAX_COMMENTS_PER_POST", "2000"))

    sleep_seconds_between_posts = float(os.getenv("SLEEP_BETWEEN_POSTS", "0.2"))

    export_dir = os.getenv("EXPORT_DIR", "exports").strip()

    return Settings(
        reddit_client_id=client_id,
        reddit_client_secret=client_secret,
        reddit_user_agent=user_agent,
        sqlite_path=sqlite_path,
        subreddits=subreddits,
        per_listing_limit=per_listing_limit,
        replace_more_limit=replace_more_limit,
        max_comments_per_post=max_comments_per_post,
        sleep_seconds_between_posts=sleep_seconds_between_posts,
        export_dir=export_dir,
    )
