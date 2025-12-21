import praw
from settings import Settings


def create_reddit(settings: Settings) -> praw.Reddit:
    if not settings.reddit_client_id or not settings.reddit_client_secret:
        raise RuntimeError(
            "Missing Reddit credentials.\n"
            "Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT in your environment (.env)."
        )

    reddit = praw.Reddit(
        client_id=settings.reddit_client_id,
        client_secret=settings.reddit_client_secret,
        user_agent=settings.reddit_user_agent,
    )
    reddit.read_only = True
    return reddit
