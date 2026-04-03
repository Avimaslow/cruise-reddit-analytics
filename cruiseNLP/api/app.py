from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .db import fetch_all, fetch_one, get_conn, get_sqlite_path
from . import queries as Q
from .models import (
    EntityRef,
    FeedItem,
    Health,
    KeywordRow,
    LineShareRow,
    LineSummary,
    PortPostItem,
    PortPulse,
    PortSummary,
    PortIntelligenceRow,
    PortOverview,
    SearchResponse,
    SentimentSummary,
    ShipSummary,
    ThemeRow,
    TrendSpike,
)

app = FastAPI(title="Cruise Reddit Analytics API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _slug_to_name(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.split("-") if w)


def _score_pulse(
    post_mentions: int,
    avg_post_score: Optional[float],
    avg_post_comments: Optional[float],
    avg_post_sentiment: Optional[float],
) -> float:
    mentions_n = min(1.0, (post_mentions or 0) / 250.0)
    score_n = min(1.0, max(0.0, (avg_post_score or 0.0) / 400.0))
    comments_n = min(1.0, max(0.0, (avg_post_comments or 0.0) / 120.0))
    sentiment_n = max(0.0, min(1.0, ((avg_post_sentiment or 0.0) + 1.0) / 2.0))
    pulse = (mentions_n * 0.40) + (score_n * 0.25) + (comments_n * 0.20) + (sentiment_n * 0.15)
    return round(pulse * 100.0, 1)


def _port_row_to_intelligence(r: dict) -> PortIntelligenceRow:
    return PortIntelligenceRow(
        port_id=r["port_id"],
        name=_slug_to_name(r["port_id"]),
        mentions=int(r.get("mentions") or 0),
        avg_sentiment=r.get("avg_sentiment"),
        avg_severity=r.get("avg_severity"),
        neg_count=r.get("neg_count"),
        pos_count=r.get("pos_count"),
        neu_count=r.get("neu_count"),
        post_mentions=int(r.get("post_mentions") or 0),
        avg_post_score=r.get("avg_post_score"),
        avg_post_comments=r.get("avg_post_comments"),
        avg_post_sentiment=r.get("avg_post_sentiment"),
        pulse_score=_score_pulse(
            int(r.get("post_mentions") or 0),
            r.get("avg_post_score"),
            r.get("avg_post_comments"),
            r.get("avg_post_sentiment"),
        ),
    )


def _compute_spikes(trend_rows: list[dict]) -> list[TrendSpike]:
    spikes: list[TrendSpike] = []
    prev_mentions = 0
    for row in trend_rows:
        mentions = int(row.get("mentions") or 0)
        delta = mentions - prev_mentions
        baseline = max(prev_mentions, 1)
        ratio = round(mentions / baseline, 2)
        if prev_mentions > 0 and delta >= 10 and ratio >= 1.5:
            spikes.append(
                TrendSpike(
                    month=row.get("month") or "",
                    mentions=mentions,
                    delta_mentions=delta,
                    spike_ratio=ratio,
                )
            )
        prev_mentions = mentions
    return spikes


def _range_bounds(date_range: Optional[str]) -> tuple[Optional[int], Optional[int]]:
    if not date_range or date_range == "all":
        return None, None

    now = datetime.now(timezone.utc)
    days = {
        "30d": 30,
        "90d": 90,
        "180d": 180,
        "365d": 365,
    }.get(date_range)
    if not days:
        return None, None

    start = now - timedelta(days=days)
    return int(start.timestamp()), int(now.timestamp())


@app.get("/health", response_model=Health)
def health() -> Health:
    with get_conn() as conn:
        tables = fetch_all(conn, Q.DEBUG_TABLES, ())
    return Health(ok=True, sqlite_path=get_sqlite_path(), tables=[t["name"] for t in tables])


@app.get("/debug/tables")
def debug_tables() -> dict:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.DEBUG_TABLES, ())
    return {"sqlite_path": get_sqlite_path(), "tables": [r["name"] for r in rows]}


@app.get("/ports", response_model=list[EntityRef])
def list_ports(limit: int = Query(50, ge=1, le=500)) -> list[EntityRef]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LIST_PORTS, (limit,))
    return [
        EntityRef(entity_type="port", id=r["port_id"], name=_slug_to_name(r["port_id"]), mentions=r["mentions"])
        for r in rows
    ]


@app.get("/ports/intelligence", response_model=list[PortIntelligenceRow])
def list_ports_intelligence(
    limit: int = Query(100, ge=1, le=500),
    line_id: Optional[str] = Query(None),
    date_range: Optional[str] = Query("all"),
) -> list[PortIntelligenceRow]:
    start_ts, end_ts = _range_bounds(date_range)
    with get_conn() as conn:
        rows = fetch_all(
            conn,
            Q.PORT_INTELLIGENCE,
            (
                line_id, line_id, start_ts, start_ts, end_ts, end_ts,
                line_id, line_id, start_ts, start_ts, end_ts, end_ts,
                limit,
            ),
        )
    return [_port_row_to_intelligence(r) for r in rows]


@app.get("/lines", response_model=list[EntityRef])
def list_lines(limit: int = Query(50, ge=1, le=200)) -> list[EntityRef]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LIST_LINES, (limit,))
    return [
        EntityRef(entity_type="line", id=r["line_id"], name=r["line_name"], mentions=r["mentions"])
        for r in rows
    ]


@app.get("/ships", response_model=list[EntityRef])
def list_ships(limit: int = Query(50, ge=1, le=200)) -> list[EntityRef]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LIST_SHIPS, (limit,))
    return [
        EntityRef(entity_type="ship", id=r["ship_id"], name=_slug_to_name(r["ship_id"]), mentions=r["mentions"])
        for r in rows
    ]


@app.get("/search", response_model=SearchResponse)
def search(q: str = Query(..., min_length=1), limit: int = Query(20, ge=1, le=100)) -> SearchResponse:
    qn = q.strip().lower()
    like = f"%{qn}%"

    with get_conn() as conn:
        ports = fetch_all(conn, Q.SEARCH_PORTS, (like, limit))
        lines = fetch_all(conn, Q.SEARCH_LINES, (like, like, limit))

    results: list[EntityRef] = []
    results.extend([EntityRef(entity_type="port", id=r["id"], name=_slug_to_name(r["name"]), mentions=r["mentions"]) for r in ports])
    results.extend([EntityRef(entity_type="line", id=r["id"], name=r["name"], mentions=r["mentions"]) for r in lines])
    results.sort(key=lambda x: (x.mentions or 0), reverse=True)
    return SearchResponse(q=q, limit=limit, results=results[:limit])


@app.get("/ports/{port_id}", response_model=PortSummary)
def port_summary(port_id: str) -> PortSummary:
    with get_conn() as conn:
        row = fetch_one(conn, Q.PORT_SENTIMENT_SUMMARY, (port_id, None, None, None, None, None, None))

    if not row:
        return PortSummary(port_id=port_id, sentiment=SentimentSummary(mentions=0))
    return PortSummary(port_id=port_id, sentiment=SentimentSummary(**row))


@app.get("/ports/{port_id}/pulse", response_model=PortPulse)
def port_pulse(port_id: str) -> PortPulse:
    with get_conn() as conn:
        row = fetch_one(conn, Q.PORT_POSTS_STATS, (port_id, None, None, None, None, None, None)) or {}

    post_mentions = int(row.get("post_mentions") or 0)
    avg_post_score = row.get("avg_post_score")
    avg_post_comments = row.get("avg_post_comments")
    avg_post_sentiment = row.get("avg_post_sentiment")

    pulse_score = _score_pulse(post_mentions, avg_post_score, avg_post_comments, avg_post_sentiment)
    return PortPulse(
        port_id=port_id,
        post_mentions=post_mentions,
        avg_post_score=avg_post_score,
        avg_post_comments=avg_post_comments,
        avg_post_sentiment=avg_post_sentiment,
        pulse_score=pulse_score,
    )


@app.get("/ports/{port_id}/overview", response_model=PortOverview)
def port_overview(
    port_id: str,
    line_id: Optional[str] = Query(None),
    date_range: Optional[str] = Query("all"),
) -> PortOverview:
    start_ts, end_ts = _range_bounds(date_range)
    with get_conn() as conn:
        summary_row = fetch_one(
            conn,
            Q.PORT_SENTIMENT_SUMMARY,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts),
        ) or {
            "mentions": 0,
            "avg_sentiment": None,
            "avg_severity": None,
            "neg_count": 0,
            "pos_count": 0,
            "neu_count": 0,
        }
        post_stats_row = fetch_one(
            conn,
            Q.PORT_POSTS_STATS,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts),
        ) or {}
        themes_rows = fetch_all(
            conn,
            Q.PORT_THEMES,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts, 3, 24),
        )
        keyword_rows = fetch_all(
            conn,
            Q.PORT_KEYWORDS,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts, 12),
        )
        trend_rows = fetch_all(
            conn,
            Q.PORT_TREND,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts),
        )
        line_rows = fetch_all(
            conn,
            Q.PORT_LINE_SHARES,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts, 8),
        )
        top_posts = fetch_all(
            conn,
            Q.PORT_TOP_POSTS,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts, 12),
        )
        commented_posts = fetch_all(
            conn,
            Q.PORT_MOST_COMMENTED_POSTS,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts, 12),
        )
        recent_posts = fetch_all(
            conn,
            Q.PORT_RECENT_POSTS,
            (port_id, line_id, line_id, start_ts, start_ts, end_ts, end_ts, 12),
        )

    intelligence = _port_row_to_intelligence({**summary_row, **post_stats_row, "port_id": port_id})
    themes = [ThemeRow(**r) for r in themes_rows]
    favorites = sorted(
        [t for t in themes if (t.avg_sent or 0) > 0],
        key=lambda t: ((t.avg_sent or 0), t.n),
        reverse=True,
    )[:5]
    concerns = sorted(
        [t for t in themes if (t.avg_sent or 0) <= 0],
        key=lambda t: ((t.avg_sent or 0), -t.n),
    )[:5]

    def _to_posts(rows: list[dict]) -> list[PortPostItem]:
        return [
            PortPostItem(
                post_id=r["post_id"],
                subreddit=r.get("subreddit"),
                created_utc=r.get("created_utc"),
                title=r.get("title"),
                preview=((r.get("selftext") or "").strip()[:220] if (r.get("selftext") or "").strip() else ""),
                author=r.get("author"),
                score=r.get("score"),
                num_comments=r.get("num_comments"),
                url=r.get("url"),
                permalink=r.get("permalink"),
                cruise_line=r.get("cruise_line"),
                sentiment_label=r.get("sentiment_label"),
                sentiment_score=r.get("sentiment_score"),
                severity_score=r.get("severity_score"),
            )
            for r in rows
        ]

    return PortOverview(
        port=intelligence,
        top_lines=[LineShareRow(**r) for r in line_rows],
        keywords=[KeywordRow(**r) for r in keyword_rows],
        themes=themes,
        traveler_favorites=favorites,
        traveler_concerns=concerns,
        trend=trend_rows,
        spikes=_compute_spikes(trend_rows),
        posts={
            "top": _to_posts(top_posts),
            "most_commented": _to_posts(commented_posts),
            "recent": _to_posts(recent_posts),
        },
    )


@app.get("/ports/{port_id}/themes", response_model=list[ThemeRow])
def port_themes(
    port_id: str,
    limit: int = Query(15, ge=1, le=100),
    min_n: int = Query(5, ge=1, le=5000),
) -> list[ThemeRow]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.PORT_THEMES, (port_id, None, None, None, None, None, None, min_n, limit))
    return [ThemeRow(**r) for r in rows]


@app.get("/ports/{port_id}/keywords", response_model=list[KeywordRow])
def port_keywords(port_id: str, limit: int = Query(12, ge=1, le=100)) -> list[KeywordRow]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.PORT_KEYWORDS, (port_id, None, None, None, None, None, None, limit))
    return [KeywordRow(**r) for r in rows]


@app.get("/ports/{port_id}/feed", response_model=list[FeedItem])
def port_feed(
    port_id: str,
    limit: int = Query(25, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
    theme: Optional[str] = Query(None),
) -> list[FeedItem]:
    with get_conn() as conn:
        if theme:
            rows = fetch_all(conn, Q.PORT_WORST_FEED_BY_THEME, (preview_chars, port_id, theme, limit))
        else:
            rows = fetch_all(conn, Q.PORT_WORST_FEED, (preview_chars, port_id, limit))
    return [FeedItem(**r) for r in rows]


@app.get("/ports/{port_id}/posts", response_model=list[PortPostItem])
def port_posts(
    port_id: str,
    sort: Literal["top", "most_commented", "recent"] = Query("top"),
    limit: int = Query(20, ge=1, le=200),
    preview_chars: int = Query(220, ge=50, le=2000),
) -> list[PortPostItem]:
    qmap = {
        "top": Q.PORT_TOP_POSTS,
        "most_commented": Q.PORT_MOST_COMMENTED_POSTS,
        "recent": Q.PORT_RECENT_POSTS,
    }
    query = qmap[sort]
    with get_conn() as conn:
        rows = fetch_all(conn, query, (port_id, None, None, None, None, None, None, limit))

    out: list[PortPostItem] = []
    for r in rows:
        text = (r.get("selftext") or "").strip()
        preview = text[:preview_chars] if text else ""
        out.append(
            PortPostItem(
                post_id=r["post_id"],
                subreddit=r.get("subreddit"),
                created_utc=r.get("created_utc"),
                title=r.get("title"),
                preview=preview,
                author=r.get("author"),
                score=r.get("score"),
                num_comments=r.get("num_comments"),
                url=r.get("url"),
                permalink=r.get("permalink"),
                cruise_line=r.get("cruise_line"),
                sentiment_label=r.get("sentiment_label"),
                sentiment_score=r.get("sentiment_score"),
                severity_score=r.get("severity_score"),
            )
        )
    return out


@app.get("/ports/{port_id}/trend")
def port_trend(port_id: str) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.PORT_TREND, (port_id, None, None, None, None, None, None))


@app.get("/ports/{port_id}/lines")
def port_lines(port_id: str, limit: int = Query(30, ge=1, le=200)) -> list[dict]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.PORT_LINES, (port_id, limit))
        if not rows:
            rows = fetch_all(conn, Q.PORT_LINE_SHARES, (port_id, limit))
    return rows


@app.get("/ports/{port_id}/line-shares", response_model=list[LineShareRow])
def port_line_shares(port_id: str, limit: int = Query(10, ge=1, le=200)) -> list[LineShareRow]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.PORT_LINE_SHARES, (port_id, None, None, None, None, None, None, limit))
    return [LineShareRow(**r) for r in rows]


@app.get("/ports/{port_id}/ships")
def port_ships(port_id: str, limit: int = Query(30, ge=1, le=200)) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.PORT_SHIPS, (port_id, limit))


@app.get("/lines/{line_id}", response_model=LineSummary)
def line_summary(line_id: str) -> LineSummary:
    with get_conn() as conn:
        row = fetch_one(conn, Q.LINE_SENTIMENT_SUMMARY, (line_id,))
    if not row:
        return LineSummary(line_id=line_id, sentiment=SentimentSummary(mentions=0))
    return LineSummary(line_id=line_id, sentiment=SentimentSummary(**row))


@app.get("/lines/{line_id}/themes", response_model=list[ThemeRow])
def line_themes(
    line_id: str,
    limit: int = Query(15, ge=1, le=100),
    min_n: int = Query(30, ge=1, le=5000),
) -> list[ThemeRow]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LINE_THEMES, (line_id, min_n, limit))
    return [ThemeRow(**r) for r in rows]


@app.get("/lines/{line_id}/feed", response_model=list[FeedItem])
def line_feed(
    line_id: str,
    limit: int = Query(25, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
) -> list[FeedItem]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LINE_WORST_FEED, (preview_chars, line_id, limit))
    return [FeedItem(**r) for r in rows]


@app.get("/lines/{line_id}/ports")
def line_ports(line_id: str, limit: int = Query(20, ge=1, le=200)) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.LINE_PORTS, (line_id, limit))


@app.get("/lines/{line_id}/top-comments")
def line_top_comments(
    line_id: str,
    limit: int = Query(20, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.LINE_TOP_COMMENTS, (preview_chars, line_id, limit))


@app.get("/lines/{line_id}/worst-comments")
def line_worst_comments(
    line_id: str,
    limit: int = Query(20, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.LINE_WORST_COMMENTS, (preview_chars, line_id, limit))


@app.get("/lines/{line_id}/trend")
def line_trend(line_id: str) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.LINE_TREND, (line_id,))


@app.get("/ships/{ship_id}", response_model=ShipSummary)
def ship_summary(ship_id: str) -> ShipSummary:
    with get_conn() as conn:
        row = fetch_one(conn, Q.SHIP_SENTIMENT_SUMMARY, (ship_id,))
    if not row:
        return ShipSummary(ship_id=ship_id, sentiment=SentimentSummary(mentions=0))
    return ShipSummary(ship_id=ship_id, sentiment=SentimentSummary(**row))


@app.get("/ships/{ship_id}/ports")
def ship_ports(ship_id: str, limit: int = Query(80, ge=1, le=200)) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.SHIP_PORTS, (ship_id, limit))


@app.get("/ships/{ship_id}/themes", response_model=list[ThemeRow])
def ship_themes(
    ship_id: str,
    limit: int = Query(15, ge=1, le=100),
    min_n: int = Query(20, ge=1, le=5000),
) -> list[ThemeRow]:
    with get_conn() as conn:
        rows = fetch_all(conn, Q.SHIP_THEMES, (ship_id, min_n, limit))
    return [ThemeRow(**r) for r in rows]


@app.get("/ships/{ship_id}/trend")
def ship_trend(ship_id: str) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.SHIP_TREND, (ship_id,))


@app.get("/ships/{ship_id}/top-comments")
def ship_top_comments(
    ship_id: str,
    limit: int = Query(15, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.SHIP_TOP_COMMENTS, (preview_chars, ship_id, limit))


@app.get("/ships/{ship_id}/worst-comments")
def ship_worst_comments(
    ship_id: str,
    limit: int = Query(15, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
) -> list[dict]:
    with get_conn() as conn:
        return fetch_all(conn, Q.SHIP_WORST_COMMENTS, (preview_chars, ship_id, limit))
