# cruiseNLP/api/app.py
from __future__ import annotations

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from .db import get_conn, get_sqlite_path, fetch_all, fetch_one
from . import queries as Q
from .models import (
    Health, SearchResponse, EntityRef,
    PortSummary, LineSummary, SentimentSummary,
    ThemeRow, FeedItem
)

app = FastAPI(title="Cruise Reddit Analytics API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OK for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=Health)
def health():
    with get_conn() as conn:
        tables = fetch_all(conn, Q.DEBUG_TABLES, ())
    return {
        "ok": True,
        "sqlite_path": get_sqlite_path(),
        "tables": [t["name"] for t in tables],
    }


@app.get("/debug/tables")
def debug_tables():
    with get_conn() as conn:
        rows = fetch_all(conn, Q.DEBUG_TABLES, ())
    return {"sqlite_path": get_sqlite_path(), "tables": [r["name"] for r in rows]}


# ---------- ID discovery ----------
@app.get("/ports", response_model=list[EntityRef])
def list_ports(limit: int = Query(50, ge=1, le=500)):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LIST_PORTS, (limit,))
    return [
        EntityRef(entity_type="port", id=r["port_id"], name=r["port_id"], mentions=r["mentions"])
        for r in rows
    ]


@app.get("/lines", response_model=list[EntityRef])
def list_lines(limit: int = Query(50, ge=1, le=200)):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LIST_LINES, (limit,))
    return [
        EntityRef(entity_type="line", id=r["line_id"], name=r["line_name"], mentions=r["mentions"])
        for r in rows
    ]


# ---------- Search ----------
@app.get("/search", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
):
    qn = q.strip().lower()
    like = f"%{qn}%"

    with get_conn() as conn:
        ports = fetch_all(conn, Q.SEARCH_PORTS, (like, limit))
        lines = fetch_all(conn, Q.SEARCH_LINES, (like, like, limit))

    results: list[EntityRef] = []
    results += [EntityRef(entity_type="port", id=r["id"], name=r["name"], mentions=r["mentions"]) for r in ports]
    results += [EntityRef(entity_type="line", id=r["id"], name=r["name"], mentions=r["mentions"]) for r in lines]

    # Sort by mentions desc
    results.sort(key=lambda x: (x.mentions or 0), reverse=True)
    results = results[:limit]

    return {"q": q, "limit": limit, "results": results}


# ---------- Port ----------
@app.get("/ports/{port_id}", response_model=PortSummary)
def port_summary(port_id: str):
    with get_conn() as conn:
        row = fetch_one(conn, Q.PORT_SENTIMENT_SUMMARY, (port_id,))

    if not row:
        return PortSummary(port_id=port_id, sentiment=SentimentSummary(mentions=0))

    return PortSummary(port_id=port_id, sentiment=SentimentSummary(**row))


@app.get("/ports/{port_id}/themes", response_model=list[ThemeRow])
def port_themes(
    port_id: str,
    limit: int = Query(15, ge=1, le=100),
    min_n: int = Query(30, ge=1, le=5000),
):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.PORT_THEMES, (port_id, min_n, limit))
    return [ThemeRow(**r) for r in rows]


@app.get("/ports/{port_id}/feed", response_model=list[FeedItem])
def port_feed(
    port_id: str,
    limit: int = Query(25, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
    theme: str | None = Query(None),   # ✅ add this
):
    with get_conn() as conn:
        if theme:
            rows = fetch_all(conn, Q.PORT_WORST_FEED_BY_THEME, (preview_chars, port_id, theme, limit))
        else:
            rows = fetch_all(conn, Q.PORT_WORST_FEED, (preview_chars, port_id, limit))
    return [FeedItem(**r) for r in rows]


# ---------- Line ----------
@app.get("/lines/{line_id}", response_model=LineSummary)
def line_summary(line_id: str):
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
):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LINE_THEMES, (line_id, min_n, limit))
    return [ThemeRow(**r) for r in rows]


@app.get("/lines/{line_id}/feed", response_model=list[FeedItem])
def line_feed(
    line_id: str,
    limit: int = Query(25, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LINE_WORST_FEED, (preview_chars, line_id, limit))
    return [FeedItem(**r) for r in rows]

@app.get("/ports/{port_id}/trend")
def port_trend(port_id: str):
    with get_conn() as conn:
        return fetch_all(conn, Q.PORT_TREND, (port_id,))
@app.get("/ports/{port_id}/lines")
def port_lines(port_id: str, limit: int = Query(30, ge=1, le=200)):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.PORT_LINES, (port_id, limit))
    return rows  # each row has line_id, line_name, mentions


@app.get("/ports/{port_id}/ships")
def port_ships(port_id: str, limit: int = Query(30, ge=1, le=200)):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.PORT_SHIPS, (port_id, limit))
    return rows  # each row has ship_id, mentions


@app.get("/lines/{line_id}/ports")
def line_ports(line_id: str, limit: int = Query(20, ge=1, le=200)):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LINE_PORTS, (line_id, limit))
    return rows  # port_id, mentions, avg_sev, avg_sent

@app.get("/lines/{line_id}/top-comments")
def line_top_comments(
    line_id: str,
    limit: int = Query(20, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LINE_TOP_COMMENTS, (preview_chars, line_id, limit))
    return rows

@app.get("/lines/{line_id}/worst-comments")
def line_worst_comments(
    line_id: str,
    limit: int = Query(20, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.LINE_WORST_COMMENTS, (preview_chars, line_id, limit))
    return rows

@app.get("/lines/{line_id}/trend")
def line_trend(line_id: str):
    with get_conn() as conn:
        return fetch_all(conn, Q.LINE_TREND, (line_id,))

    from .models import ShipSummary  # you'll add this model below

    @app.get("/ships/{ship_id}", response_model=ShipSummary)
    def ship_summary(ship_id: str):
        with get_conn() as conn:
            row = fetch_one(conn, Q.SHIP_SENTIMENT_SUMMARY, (ship_id,))
        if not row:
            return ShipSummary(ship_id=ship_id, sentiment=SentimentSummary(mentions=0))
        return ShipSummary(ship_id=ship_id, sentiment=SentimentSummary(**row))

    @app.get("/ships/{ship_id}/ports")
    def ship_ports(ship_id: str, limit: int = Query(80, ge=1, le=200)):
        with get_conn() as conn:
            return fetch_all(conn, Q.SHIP_PORTS, (ship_id, limit))

    @app.get("/ships/{ship_id}/themes", response_model=list[ThemeRow])
    def ship_themes(
            ship_id: str,
            limit: int = Query(15, ge=1, le=100),
            min_n: int = Query(30, ge=1, le=5000),
    ):
        with get_conn() as conn:
            rows = fetch_all(conn, Q.SHIP_THEMES, (ship_id, min_n, limit))
        return [ThemeRow(**r) for r in rows]

    @app.get("/ships/{ship_id}/trend")
    def ship_trend(ship_id: str):
        with get_conn() as conn:
            return fetch_all(conn, Q.SHIP_TREND, (ship_id,))

    @app.get("/ships/{ship_id}/top-comments")
    def ship_top_comments(
            ship_id: str,
            limit: int = Query(15, ge=1, le=200),
            preview_chars: int = Query(240, ge=50, le=2000),
    ):
        with get_conn() as conn:
            return fetch_all(conn, Q.SHIP_TOP_COMMENTS, (preview_chars, ship_id, limit))

    @app.get("/ships/{ship_id}/worst-comments")
    def ship_worst_comments(
            ship_id: str,
            limit: int = Query(15, ge=1, le=200),
            preview_chars: int = Query(240, ge=50, le=2000),
    ):
        with get_conn() as conn:
            return fetch_all(conn, Q.SHIP_WORST_COMMENTS, (preview_chars, ship_id, limit))
# ---------- Ship ----------
from .models import ShipSummary  # make sure this exists (step 3)

@app.get("/ships/{ship_id}", response_model=ShipSummary)
def ship_summary(ship_id: str):
    with get_conn() as conn:
        row = fetch_one(conn, Q.SHIP_SENTIMENT_SUMMARY, (ship_id,))

    if not row:
        return ShipSummary(ship_id=ship_id, sentiment=SentimentSummary(mentions=0))

    return ShipSummary(ship_id=ship_id, sentiment=SentimentSummary(**row))


@app.get("/ships/{ship_id}/ports")
def ship_ports(ship_id: str, limit: int = Query(80, ge=1, le=200)):
    with get_conn() as conn:
        return fetch_all(conn, Q.SHIP_PORTS, (ship_id, limit))


@app.get("/ships/{ship_id}/themes", response_model=list[ThemeRow])
def ship_themes(
    ship_id: str,
    limit: int = Query(15, ge=1, le=100),
    min_n: int = Query(20, ge=1, le=5000),
):
    with get_conn() as conn:
        rows = fetch_all(conn, Q.SHIP_THEMES, (ship_id, min_n, limit))
    return [ThemeRow(**r) for r in rows]


@app.get("/ships/{ship_id}/trend")
def ship_trend(ship_id: str):
    with get_conn() as conn:
        return fetch_all(conn, Q.SHIP_TREND, (ship_id,))


@app.get("/ships/{ship_id}/top-comments")
def ship_top_comments(
    ship_id: str,
    limit: int = Query(15, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
):
    with get_conn() as conn:
        return fetch_all(conn, Q.SHIP_TOP_COMMENTS, (preview_chars, ship_id, limit))


@app.get("/ships/{ship_id}/worst-comments")
def ship_worst_comments(
    ship_id: str,
    limit: int = Query(15, ge=1, le=200),
    preview_chars: int = Query(240, ge=50, le=2000),
):
    with get_conn() as conn:
        return fetch_all(conn, Q.SHIP_WORST_COMMENTS, (preview_chars, ship_id, limit))
