# cruiseNLP/api/models.py
from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel


ObjectType = Literal["post", "comment"]
EntityType = Literal["port", "line", "ship"]


class Health(BaseModel):
    ok: bool
    sqlite_path: str
    tables: List[str] = []


class EntityRef(BaseModel):
    entity_type: EntityType
    id: str
    name: str
    mentions: Optional[int] = None


class SearchResponse(BaseModel):
    q: str
    limit: int
    results: List[EntityRef]


class SentimentSummary(BaseModel):
    mentions: int
    avg_sentiment: Optional[float] = None
    avg_severity: Optional[float] = None
    neg_count: Optional[int] = None
    pos_count: Optional[int] = None
    neu_count: Optional[int] = None


class ThemeRow(BaseModel):
    theme_label: str
    n: int
    avg_sent: Optional[float] = None
    neg_count: Optional[int] = None


class FeedItem(BaseModel):
    object_type: ObjectType
    object_id: str
    created_utc: Optional[int] = None
    subreddit: Optional[str] = None
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    severity_score: Optional[float] = None
    preview: Optional[str] = None
    permalink: Optional[str] = None


class PortSummary(BaseModel):
    port_id: str
    sentiment: SentimentSummary


class LineSummary(BaseModel):
    line_id: str
    sentiment: SentimentSummary

class ShipSummary(BaseModel):
    ship_id: str
    sentiment: SentimentSummary


class KeywordRow(BaseModel):
    keyword: str
    n: int


class LineShareRow(BaseModel):
    line_id: str
    line_name: str
    mentions: int
    mention_pct: float


class PortPulse(BaseModel):
    port_id: str
    post_mentions: int
    avg_post_score: Optional[float] = None
    avg_post_comments: Optional[float] = None
    avg_post_sentiment: Optional[float] = None
    pulse_score: float


class PortPostItem(BaseModel):
    post_id: str
    subreddit: Optional[str] = None
    created_utc: Optional[int] = None
    title: Optional[str] = None
    preview: Optional[str] = None
    author: Optional[str] = None
    score: Optional[int] = None
    num_comments: Optional[int] = None
    url: Optional[str] = None
    permalink: Optional[str] = None
    cruise_line: Optional[str] = None
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    severity_score: Optional[float] = None


class PortIntelligenceRow(BaseModel):
    port_id: str
    name: str
    mentions: int
    avg_sentiment: Optional[float] = None
    avg_severity: Optional[float] = None
    neg_count: Optional[int] = None
    pos_count: Optional[int] = None
    neu_count: Optional[int] = None
    post_mentions: int = 0
    avg_post_score: Optional[float] = None
    avg_post_comments: Optional[float] = None
    avg_post_sentiment: Optional[float] = None
    pulse_score: float


class TrendSpike(BaseModel):
    month: str
    mentions: int
    delta_mentions: int
    spike_ratio: float


class PortOverview(BaseModel):
    port: PortIntelligenceRow
    top_lines: List[LineShareRow]
    keywords: List[KeywordRow]
    themes: List[ThemeRow]
    traveler_favorites: List[ThemeRow]
    traveler_concerns: List[ThemeRow]
    trend: List[dict]
    spikes: List[TrendSpike]
    posts: dict[str, List[PortPostItem]]
