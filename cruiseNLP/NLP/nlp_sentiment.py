# nlp_sentiment.py
from __future__ import annotations
from dataclasses import dataclass
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()

@dataclass
class SentimentResult:
    label: str
    score: float
    severity: float

NEG_WORDS = {"refund","sick","food poisoning","cancel","canceled","delayed","delay",
             "missed","overbooked","dirty","mold","bedbugs","theft","stolen","charged",
             "complaint","awful","terrible","worst","never again"}

def score_text(text: str) -> SentimentResult:
    text = (text or "").strip()
    if not text:
        return SentimentResult("neu", 0.0, 0.0)

    vs = analyzer.polarity_scores(text)
    compound = float(vs["compound"])

    if compound >= 0.05:
        label = "pos"
    elif compound <= -0.05:
        label = "neg"
    else:
        label = "neu"

    # Simple severity heuristic: strong negative + presence of certain keywords
    lowered = text.lower()
    keyword_hits = sum(1 for w in NEG_WORDS if w in lowered)
    severity = 0.0
    if label == "neg":
        severity = min(1.0, 0.8 * abs(compound) + 0.05 * keyword_hits)

    return SentimentResult(label, compound, float(severity))
