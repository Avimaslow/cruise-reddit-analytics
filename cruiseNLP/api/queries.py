# cruiseNLP/api/queries.py
from __future__ import annotations

# IMPORTANT:
# extraction.port_ids is a JSON array string like ["cozumel","nassau"]
# so json_each(extraction.port_ids) works.

DEBUG_TABLES = """
SELECT name
FROM sqlite_master
WHERE type='table'
ORDER BY name;
"""

LIST_PORTS = """
SELECT
  je.value AS port_id,
  COUNT(*) AS mentions
FROM extraction e
JOIN json_each(e.port_ids) AS je
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
WHERE e.object_type='comment'
  AND e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
GROUP BY je.value
ORDER BY mentions DESC
LIMIT ?;
"""
PORT_LINES = """
WITH base AS (
  SELECT
    e.object_id,
    TRIM(e.cruise_line) AS cruise_line_raw,
    LOWER(TRIM(c.subreddit)) AS subreddit,
    je.value AS port_id
  FROM extraction e
  JOIN nlp_scores s
    ON s.object_type = e.object_type AND s.object_id = e.object_id
  JOIN comments c
    ON c.comment_id = e.object_id
  JOIN json_each(e.port_ids) AS je
  WHERE e.object_type = 'comment'
    AND e.port_ids IS NOT NULL
    AND e.port_ids != '[]'
    AND je.value = ?
),
labeled AS (
  SELECT
    port_id,
    COALESCE(
      NULLIF(cruise_line_raw, ''),
      CASE
        WHEN subreddit IN ('royalcaribbean', 'rccl', 'rcl') THEN 'Royal Caribbean'
        WHEN subreddit IN ('carnivalcruise', 'carnivalcruisefans') THEN 'Carnival'
        WHEN subreddit IN ('ncl', 'norwegiancruise') THEN 'Norwegian'
        WHEN subreddit IN ('msccruises') THEN 'MSC'
        WHEN subreddit IN ('disneycruise', 'disneycruiseline') THEN 'Disney'
        WHEN subreddit IN ('princesscruises') THEN 'Princess'
        WHEN subreddit IN ('celebritycruises') THEN 'Celebrity'
        WHEN subreddit IN ('hollandamerica') THEN 'Holland America'
        WHEN subreddit IN ('virginvoyages') THEN 'Virgin Voyages'
        WHEN subreddit IN ('cruise', 'cruises') THEN NULL
        ELSE NULL
      END
    ) AS line_name
  FROM base
)
SELECT
  LOWER(REPLACE(TRIM(line_name), ' ', '-')) AS line_id,
  TRIM(line_name) AS line_name,
  COUNT(*) AS mentions
FROM labeled
WHERE line_name IS NOT NULL
GROUP BY TRIM(line_name)
ORDER BY mentions DESC
LIMIT ?;
"""


PORT_SHIPS = """
SELECT
  se.value AS ship_id,
  COUNT(*) AS mentions
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN json_each(e.port_ids) AS pe
JOIN json_each(e.ship_ids) AS se
WHERE e.object_type='comment'
  AND e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
  AND pe.value = ?
  AND e.ship_ids IS NOT NULL
  AND e.ship_ids != '[]'
GROUP BY se.value
ORDER BY mentions DESC
LIMIT ?;
"""


LIST_LINES = """
SELECT
  TRIM(e.cruise_line) AS line_name,
  LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) AS line_id,
  COUNT(*) AS mentions
FROM extraction e
WHERE e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
GROUP BY TRIM(e.cruise_line)
ORDER BY mentions DESC
LIMIT ?;
"""

SEARCH_PORTS = """
SELECT
  je.value AS id,
  je.value AS name,
  COUNT(*) AS mentions
FROM extraction e
JOIN json_each(e.port_ids) AS je
WHERE e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
  AND je.value LIKE ?
GROUP BY je.value
ORDER BY mentions DESC
LIMIT ?;
"""

SEARCH_LINES = """
SELECT
  LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) AS id,
  TRIM(e.cruise_line) AS name,
  COUNT(*) AS mentions
FROM extraction e
WHERE e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
  AND (LOWER(TRIM(e.cruise_line)) LIKE ? OR LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) LIKE ?)
GROUP BY TRIM(e.cruise_line)
ORDER BY mentions DESC
LIMIT ?;
"""

PORT_SENTIMENT_SUMMARY = """
SELECT
  COUNT(*) AS mentions,
  AVG(s.sentiment_score) AS avg_sentiment,
  AVG(s.severity_score) AS avg_severity,
  SUM(CASE WHEN s.sentiment_label='neg' THEN 1 ELSE 0 END) AS neg_count,
  SUM(CASE WHEN s.sentiment_label='pos' THEN 1 ELSE 0 END) AS pos_count,
  SUM(CASE WHEN s.sentiment_label='neu' THEN 1 ELSE 0 END) AS neu_count
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN json_each(e.port_ids) AS je
WHERE e.object_type='comment'
  AND e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
  AND je.value = ?;
"""

LINE_SENTIMENT_SUMMARY = """
SELECT
  COUNT(*) AS mentions,
  AVG(s.sentiment_score) AS avg_sentiment,
  AVG(s.severity_score) AS avg_severity,
  SUM(CASE WHEN s.sentiment_label='neg' THEN 1 ELSE 0 END) AS neg_count,
  SUM(CASE WHEN s.sentiment_label='pos' THEN 1 ELSE 0 END) AS pos_count,
  SUM(CASE WHEN s.sentiment_label='neu' THEN 1 ELSE 0 END) AS neu_count
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
WHERE e.object_type='comment'
  AND e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
  AND LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) = ?;
"""

PORT_THEMES = """
SELECT
  t.theme_label,
  COUNT(*) AS n,
  AVG(s.sentiment_score) AS avg_sent,
  SUM(CASE WHEN s.sentiment_label='neg' THEN 1 ELSE 0 END) AS neg_count
FROM themes t
JOIN nlp_scores s
  ON s.object_type = t.object_type AND s.object_id = t.object_id
JOIN extraction e
  ON e.object_type = t.object_type AND e.object_id = t.object_id
JOIN json_each(e.port_ids) AS je
WHERE t.object_type='comment'
  AND e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
  AND je.value = ?
GROUP BY t.theme_label
HAVING n >= ?
ORDER BY avg_sent ASC
LIMIT ?;
"""

LINE_THEMES = """
SELECT
  t.theme_label,
  COUNT(*) AS n,
  AVG(s.sentiment_score) AS avg_sent,
  SUM(CASE WHEN s.sentiment_label='neg' THEN 1 ELSE 0 END) AS neg_count
FROM themes t
JOIN nlp_scores s
  ON s.object_type = t.object_type AND s.object_id = t.object_id
JOIN extraction e
  ON e.object_type = t.object_type AND e.object_id = t.object_id
WHERE t.object_type='comment'
  AND e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
  AND LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) = ?
GROUP BY t.theme_label
HAVING n >= ?
ORDER BY avg_sent ASC
LIMIT ?;
"""

PORT_WORST_FEED = """
SELECT
  c.comment_id AS object_id,
  'comment' AS object_type,
  c.created_utc,
  c.subreddit,
  s.sentiment_label,
  s.sentiment_score,
  s.severity_score,
  SUBSTR(COALESCE(c.body,''), 1, ?) AS preview,
  c.permalink
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c
  ON c.comment_id = e.object_id
JOIN json_each(e.port_ids) AS je
WHERE e.object_type='comment'
  AND e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
  AND je.value = ?
  AND COALESCE(c.author,'') NOT IN ('AutoModerator')
ORDER BY s.severity_score DESC, s.sentiment_score ASC
LIMIT ?;
"""
PORT_WORST_FEED_BY_THEME = """
SELECT
  c.comment_id AS object_id,
  'comment' AS object_type,
  c.created_utc,
  c.subreddit,
  s.sentiment_label,
  s.sentiment_score,
  s.severity_score,
  SUBSTR(COALESCE(c.body,''), 1, ?) AS preview,
  c.permalink
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c
  ON c.comment_id = e.object_id
JOIN json_each(e.port_ids) AS je
JOIN themes t
  ON t.object_type = e.object_type AND t.object_id = e.object_id
WHERE e.object_type='comment'
  AND e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
  AND je.value = ?
  AND t.theme_label = ?
  AND COALESCE(c.author,'') NOT IN ('AutoModerator')
ORDER BY s.severity_score DESC, s.sentiment_score ASC
LIMIT ?;
"""
PORT_TREND = """
SELECT
  strftime('%Y-%m', datetime(c.created_utc, 'unixepoch')) AS month,
  AVG(s.severity_score) AS avg_sev,
  AVG(s.sentiment_score) AS avg_sent
FROM extraction e
JOIN nlp_scores s ON s.object_id = e.object_id
JOIN comments c ON c.comment_id = e.object_id
JOIN json_each(e.port_ids) je
WHERE je.value = ?
GROUP BY month
ORDER BY month;
"""

LINE_WORST_FEED = """
SELECT
  c.comment_id AS object_id,
  'comment' AS object_type,
  c.created_utc,
  c.subreddit,
  s.sentiment_label,
  s.sentiment_score,
  s.severity_score,
  SUBSTR(COALESCE(c.body,''), 1, ?) AS preview,
  c.permalink
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c
  ON c.comment_id = e.object_id
WHERE e.object_type='comment'
  AND e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
  AND LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) = ?
  AND COALESCE(c.author,'') NOT IN ('AutoModerator')
ORDER BY s.severity_score DESC, s.sentiment_score ASC
LIMIT ?;
"""

LINE_PORTS = """
SELECT
  je.value AS port_id,
  COUNT(*) AS mentions,
  AVG(s.severity_score) AS avg_sev,
  AVG(s.sentiment_score) AS avg_sent
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN json_each(e.port_ids) AS je
WHERE e.object_type='comment'
  AND e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
  AND LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) = ?
  AND e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
GROUP BY je.value
ORDER BY mentions DESC
LIMIT ?;
"""

LINE_TOP_COMMENTS = """
SELECT
  c.comment_id AS object_id,
  'comment' AS object_type,
  c.created_utc,
  c.subreddit,
  c.score,
  s.sentiment_label,
  s.sentiment_score,
  s.severity_score,
  SUBSTR(COALESCE(c.body,''), 1, ?) AS preview,
  c.permalink
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c
  ON c.comment_id = e.object_id
WHERE e.object_type='comment'
  AND e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
  AND LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) = ?
  AND COALESCE(c.author,'') NOT IN ('AutoModerator')
ORDER BY c.score DESC, s.severity_score DESC
LIMIT ?;
"""


LINE_WORST_COMMENTS = """
SELECT
  c.comment_id AS object_id,
  'comment' AS object_type,
  c.created_utc,
  c.subreddit,
  c.score,
  s.sentiment_label,
  s.sentiment_score,
  s.severity_score,
  SUBSTR(COALESCE(c.body,''), 1, ?) AS preview,
  c.permalink
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c
  ON c.comment_id = e.object_id
WHERE e.object_type='comment'
  AND e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
  AND LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) = ?
  AND COALESCE(c.author,'') NOT IN ('AutoModerator')
ORDER BY s.severity_score DESC, s.sentiment_score ASC
LIMIT ?;
"""


LINE_TREND = """
SELECT
  strftime('%Y-%m', datetime(c.created_utc, 'unixepoch')) AS month,
  AVG(s.severity_score) AS avg_sev,
  AVG(s.sentiment_score) AS avg_sent,
  COUNT(*) AS mentions
FROM extraction e
JOIN nlp_scores s ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c ON c.comment_id = e.object_id
WHERE e.object_type='comment'
  AND e.cruise_line IS NOT NULL
  AND TRIM(e.cruise_line) <> ''
  AND LOWER(REPLACE(TRIM(e.cruise_line), ' ', '-')) = ?
GROUP BY month
ORDER BY month;
"""

SHIP_SENTIMENT_SUMMARY = """
SELECT
  COUNT(*) AS mentions,
  AVG(s.sentiment_score) AS avg_sentiment,
  AVG(s.severity_score) AS avg_severity,
  SUM(CASE WHEN s.sentiment_label='neg' THEN 1 ELSE 0 END) AS neg_count,
  SUM(CASE WHEN s.sentiment_label='pos' THEN 1 ELSE 0 END) AS pos_count,
  SUM(CASE WHEN s.sentiment_label='neu' THEN 1 ELSE 0 END) AS neu_count
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN json_each(e.ship_ids) AS se
WHERE e.object_type='comment'
  AND e.ship_ids IS NOT NULL
  AND e.ship_ids != '[]'
  AND se.value = ?;
"""
SHIP_PORTS = """
SELECT
  pe.value AS port_id,
  COUNT(*) AS mentions,
  AVG(s.severity_score) AS avg_sev,
  AVG(s.sentiment_score) AS avg_sent
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN json_each(e.ship_ids) AS se
JOIN json_each(e.port_ids) AS pe
WHERE e.object_type='comment'
  AND e.ship_ids IS NOT NULL
  AND e.ship_ids != '[]'
  AND se.value = ?
  AND e.port_ids IS NOT NULL
  AND e.port_ids != '[]'
GROUP BY pe.value
ORDER BY mentions DESC
LIMIT ?;
"""
SHIP_TREND = """
SELECT
  strftime('%Y-%m', datetime(c.created_utc, 'unixepoch')) AS month,
  AVG(s.severity_score) AS avg_sev,
  AVG(s.sentiment_score) AS avg_sent,
  COUNT(*) AS mentions
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c
  ON c.comment_id = e.object_id
JOIN json_each(e.ship_ids) AS se
WHERE e.object_type='comment'
  AND e.ship_ids IS NOT NULL
  AND e.ship_ids != '[]'
  AND se.value = ?
GROUP BY month
ORDER BY month;
"""
SHIP_TOP_COMMENTS = """
SELECT
  c.comment_id AS object_id,
  'comment' AS object_type,
  c.created_utc,
  c.subreddit,
  c.score,
  s.sentiment_label,
  s.sentiment_score,
  s.severity_score,
  SUBSTR(COALESCE(c.body,''), 1, ?) AS preview,
  c.permalink
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c
  ON c.comment_id = e.object_id
JOIN json_each(e.ship_ids) AS se
WHERE e.object_type='comment'
  AND e.ship_ids IS NOT NULL
  AND e.ship_ids != '[]'
  AND se.value = ?
  AND COALESCE(c.author,'') NOT IN ('AutoModerator')
ORDER BY c.score DESC, s.severity_score DESC
LIMIT ?;
"""
SHIP_WORST_COMMENTS = """
SELECT
  c.comment_id AS object_id,
  'comment' AS object_type,
  c.created_utc,
  c.subreddit,
  c.score,
  s.sentiment_label,
  s.sentiment_score,
  s.severity_score,
  SUBSTR(COALESCE(c.body,''), 1, ?) AS preview,
  c.permalink
FROM extraction e
JOIN nlp_scores s
  ON s.object_type = e.object_type AND s.object_id = e.object_id
JOIN comments c
  ON c.comment_id = e.object_id
JOIN json_each(e.ship_ids) AS se
WHERE e.object_type='comment'
  AND e.ship_ids IS NOT NULL
  AND e.ship_ids != '[]'
  AND se.value = ?
  AND COALESCE(c.author,'') NOT IN ('AutoModerator')
ORDER BY s.severity_score DESC, s.sentiment_score ASC
LIMIT ?;
"""

