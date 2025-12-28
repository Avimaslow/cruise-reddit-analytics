import sqlite3
from typing import Any, Dict, Iterable, Optional

SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS posts (
  post_id TEXT PRIMARY KEY,
  subreddit TEXT NOT NULL,
  cruise_line_from_subreddit TEXT,
  created_utc INTEGER,
  title TEXT,
  selftext TEXT,
  author TEXT,
  score INTEGER,
  num_comments INTEGER,
  url TEXT,
  permalink TEXT,
  over_18 INTEGER,
  is_self INTEGER,
  link_flair_text TEXT,
  retrieved_at_utc INTEGER,

  -- comment ingestion bookkeeping
  comments_last_ingested_utc INTEGER,
  comments_last_count INTEGER
);

CREATE TABLE IF NOT EXISTS comments (
  comment_id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  created_utc INTEGER,
  body TEXT,
  author TEXT,
  score INTEGER,
  permalink TEXT,
  retrieved_at_utc INTEGER,
  FOREIGN KEY(post_id) REFERENCES posts(post_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_subreddit_created ON posts(subreddit, created_utc);
CREATE INDEX IF NOT EXISTS idx_posts_comments_last ON posts(comments_last_ingested_utc);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);


CREATE TABLE IF NOT EXISTS nlp_scores (
  object_type TEXT NOT NULL,          -- 'post' or 'comment'
  object_id   TEXT NOT NULL,          -- post_id or comment_id
  sentiment_label TEXT,               -- 'pos'/'neg'/'neu'
  sentiment_score REAL,               -- e.g. VADER compound [-1,1]
  severity_score  REAL,               -- heuristic 0..1 (optional)
  model_version   TEXT,
  scored_at_utc   INTEGER,
  PRIMARY KEY (object_type, object_id)
);

CREATE INDEX IF NOT EXISTS idx_nlp_scores_type ON nlp_scores(object_type);
CREATE INDEX IF NOT EXISTS idx_nlp_scores_sent ON nlp_scores(sentiment_label);

CREATE TABLE IF NOT EXISTS extraction (
  object_type TEXT NOT NULL,          -- 'post' or 'comment'
  object_id   TEXT NOT NULL,
  cruise_line TEXT,                   -- best-guess (can be NULL)
  ship_ids    TEXT,                   -- JSON array string: ["wonder-of-the-seas", ...]
  port_ids    TEXT,                   -- JSON array string
  confidence  REAL,
  extracted_at_utc INTEGER,
  PRIMARY KEY (object_type, object_id)
);

CREATE INDEX IF NOT EXISTS idx_extraction_type ON extraction(object_type);
CREATE INDEX IF NOT EXISTS idx_extraction_line ON extraction(cruise_line);


CREATE TABLE IF NOT EXISTS themes (
  object_type   TEXT NOT NULL,          -- 'post' or 'comment'
  object_id     TEXT NOT NULL,
  theme_label   TEXT NOT NULL,          -- e.g. 'food_dining'
  theme_score   REAL,                  -- 0..1
  model_version TEXT,
  labeled_at_utc INTEGER,
  PRIMARY KEY (object_type, object_id, theme_label)
);

CREATE INDEX IF NOT EXISTS idx_themes_object ON themes(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_themes_label  ON themes(theme_label);

"""


def connect(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def upsert_post(conn: sqlite3.Connection, row: Dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO posts (
          post_id, subreddit, cruise_line_from_subreddit, created_utc, title, selftext,
          author, score, num_comments, url, permalink, over_18, is_self, link_flair_text,
          retrieved_at_utc,
          comments_last_ingested_utc, comments_last_count
        ) VALUES (
          :post_id, :subreddit, :cruise_line_from_subreddit, :created_utc, :title, :selftext,
          :author, :score, :num_comments, :url, :permalink, :over_18, :is_self, :link_flair_text,
          :retrieved_at_utc,
          COALESCE(:comments_last_ingested_utc, NULL),
          COALESCE(:comments_last_count, NULL)
        )
        ON CONFLICT(post_id) DO UPDATE SET
          subreddit=excluded.subreddit,
          cruise_line_from_subreddit=excluded.cruise_line_from_subreddit,
          created_utc=excluded.created_utc,
          title=excluded.title,
          selftext=excluded.selftext,
          author=excluded.author,
          score=excluded.score,
          num_comments=excluded.num_comments,
          url=excluded.url,
          permalink=excluded.permalink,
          over_18=excluded.over_18,
          is_self=excluded.is_self,
          link_flair_text=excluded.link_flair_text,
          retrieved_at_utc=excluded.retrieved_at_utc
        """,
        row,
    )


def upsert_comment(conn: sqlite3.Connection, row: Dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO comments (
          comment_id, post_id, subreddit, created_utc, body, author, score,
          permalink, retrieved_at_utc
        ) VALUES (
          :comment_id, :post_id, :subreddit, :created_utc, :body, :author, :score,
          :permalink, :retrieved_at_utc
        )
        ON CONFLICT(comment_id) DO UPDATE SET
          post_id=excluded.post_id,
          subreddit=excluded.subreddit,
          created_utc=excluded.created_utc,
          body=excluded.body,
          author=excluded.author,
          score=excluded.score,
          permalink=excluded.permalink,
          retrieved_at_utc=excluded.retrieved_at_utc
        """,
        row,
    )


def mark_comments_ingested(conn: sqlite3.Connection, post_id: str, ingested_at_utc: int, comment_count: int) -> None:
    conn.execute(
        """
        UPDATE posts
        SET comments_last_ingested_utc = ?,
            comments_last_count = ?
        WHERE post_id = ?
        """,
        (ingested_at_utc, comment_count, post_id),
    )


def iter_post_ids_needing_comments(
    conn: sqlite3.Connection,
    only_recent_days: Optional[int] = 14
) -> Iterable[str]:
    """
    Strategy:
      - Always ingest comments for posts missing comment ingestion metadata
      - For recent posts (default 14 days), re-ingest if num_comments changed
    """
    cur = conn.cursor()

    # Posts never ingested for comments
    cur.execute(
        """
        SELECT post_id FROM posts
        WHERE comments_last_ingested_utc IS NULL
        ORDER BY created_utc DESC
        """
    )
    for (pid,) in cur.fetchall():
        yield pid

    if only_recent_days is None:
        return

    # Recent posts where comment count changed since last ingestion
    seconds = int(only_recent_days * 86400)
    cur.execute(
        """
        SELECT post_id
        FROM posts
        WHERE created_utc IS NOT NULL
          AND (strftime('%s','now') - created_utc) <= ?
          AND comments_last_ingested_utc IS NOT NULL
          AND (comments_last_count IS NULL OR num_comments IS NULL OR num_comments > comments_last_count)
        ORDER BY created_utc DESC
        """,
        (seconds,),
    )
    for (pid,) in cur.fetchall():
        yield pid


def upsert_nlp_score(conn, row: dict) -> None:
    conn.execute(
        """
        INSERT INTO nlp_scores (
          object_type, object_id, sentiment_label, sentiment_score,
          severity_score, model_version, scored_at_utc
        ) VALUES (
          :object_type, :object_id, :sentiment_label, :sentiment_score,
          :severity_score, :model_version, :scored_at_utc
        )
        ON CONFLICT(object_type, object_id) DO UPDATE SET
          sentiment_label=excluded.sentiment_label,
          sentiment_score=excluded.sentiment_score,
          severity_score=excluded.severity_score,
          model_version=excluded.model_version,
          scored_at_utc=excluded.scored_at_utc
        """,
        row,
    )

def upsert_extraction(conn, row: dict) -> None:
    conn.execute(
        """
        INSERT INTO extraction (
          object_type, object_id, cruise_line, ship_ids, port_ids,
          confidence, extracted_at_utc
        ) VALUES (
          :object_type, :object_id, :cruise_line, :ship_ids, :port_ids,
          :confidence, :extracted_at_utc
        )
        ON CONFLICT(object_type, object_id) DO UPDATE SET
          cruise_line=excluded.cruise_line,
          ship_ids=excluded.ship_ids,
          port_ids=excluded.port_ids,
          confidence=excluded.confidence,
          extracted_at_utc=excluded.extracted_at_utc
        """,
        row,
    )
def upsert_theme(conn, row: dict) -> None:
    conn.execute(
        """
        INSERT INTO themes (
          object_type, object_id, theme_label, theme_score,
          model_version, labeled_at_utc
        ) VALUES (
          :object_type, :object_id, :theme_label, :theme_score,
          :model_version, :labeled_at_utc
        )
        ON CONFLICT(object_type, object_id, theme_label) DO UPDATE SET
          theme_score=excluded.theme_score,
          model_version=excluded.model_version,
          labeled_at_utc=excluded.labeled_at_utc
        """,
        row,
    )

