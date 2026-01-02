# cruiseNLP/api/models.py
from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel


ObjectType = Literal["post", "comment"]
EntityType = Literal["port", "line"]


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


