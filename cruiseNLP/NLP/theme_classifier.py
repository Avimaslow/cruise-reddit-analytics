# NLP/theme_classifier.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

from .text_normalize import normalize_text

MODEL_VERSION = "themes_v1_rules_2025-12-28"

@dataclass(frozen=True)
class ThemeHit:
    label: str
    score: float   # 0..1
    hits: int

# Each theme has keywords/phrases. We match against normalized text.
# Tips:
# - include common misspellings / slang
# - keep phrases fairly specific to avoid noise
THEME_KEYWORDS: Dict[str, List[str]] = {
    "pricing_fees_refunds": [
        "refund", "refunded", "charge", "charged", "overcharged", "billing", "bill", "fee", "fees",
        "gratuity", "gratuities", "service charge", "port fee", "taxes", "credit", "onboard credit",
        "cancellation", "cancelled", "canceled", "travel insurance", "insurance denied",
        "dispute", "claim", "compensation", "voucher",
    ],
    "embarkation_lines": [
        "embark", "embarkation", "disembark", "disembarkation",
        "terminal", "port terminal", "check in", "checkin", "security line",
        "tsa", "customs", "immigration", "passport control",
        "long line", "lines were insane", "took hours", "waiting for hours",
        "boarding", "boarded late", "missed boarding", "late boarding",
        "shuttle", "transfer", "traffic", "parking",
        "baggage drop", "lost luggage", "luggage", "bag tag",
    ],
    "itinerary_changes": [
        "itinerary", "itinerary change", "changed itinerary", "cancelled port", "canceled port",
        "missed port", "skipped port", "port cancelled", "port canceled",
        "sea day", "extra sea day", "rerouted", "route changed",
        "weather changed", "could not dock", "tender cancelled", "tender canceled",
    ],
    "excursions": [
        "excursion", "shore excursion", "shorex", "shore x", "tour", "tours",
        "third party", "shoreexcursionsgroup", "viator", "getyourguide",
        "snorkel", "snorkeling", "zip line", "zipline", "ruins", "atv",
        "beach day", "resort pass",
    ],
    "service_staff": [
        "customer service", "guest services", "front desk", "desk",
        "rude", "unhelpful", "dismissive", "manager", "supervisor",
        "steward", "stateroom attendant", "room attendant",
        "waiter", "waitress", "server", "bartender",
        "service was", "treated", "ignored", "won't help", "would not help",
    ],
    "food_dining": [
        "food", "dining", "buffet", "main dining", "mdr", "specialty dining",
        "restaurant", "steakhouse", "sushi", "pizza", "dessert",
        "cold food", "warm food", "undercooked", "overcooked",
        "food poisoning", "got sick from food", "quality of food",
    ],
    "cleanliness": [
        "dirty", "filthy", "gross", "smell", "smelled", "mold", "mould",
        "cockroach", "bugs", "bed bugs", "stains", "sticky",
        "not clean", "unclean", "bathroom was dirty",
    ],
    "cabin_room": [
        "cabin", "stateroom", "room", "suite",
        "small room", "tiny room",
        "air conditioning", "ac broken", "a c broken", "no ac", "hot room",
        "noise in cabin", "loud cabin", "engine noise",
        "balcony", "bathroom", "shower", "toilet",
        "bed", "pillow", "mattress",
    ],
    "crowds_noise": [
        "crowded", "crowds", "too many people", "overcrowded", "packed",
        "line everywhere", "long waits",
        "loud", "noise", "noisy", "screaming kids", "kids running",
        "chair hog", "pool deck packed",
    ],
    "wifi_tech": [
        "wifi", "wi fi", "internet", "connection", "slow internet",
        "starlink", "app crashed", "app", "website", "online check in",
        "chat package", "streaming", "vpn",
    ],
    "health_illness": [
        "norovirus", "noro", "covid", "flu", "sickness", "illness", "vomit", "vomiting",
        "diarrhea", "diarrhoea", "quarantine", "medical", "medical center",
        "seasick", "seasickness",
    ],
    "safety_security": [
        "unsafe", "safety", "security", "assault", "rape", "harassed", "harrassed",
        "stolen", "theft", "robbed", "fight", "fighting",
        "police", "injury", "injured",
    ],
}

def score_theme_hits(text: str, max_themes: int = 3) -> List[ThemeHit]:
    t = normalize_text(text or "")
    if not t:
        return []

    hits: List[ThemeHit] = []

    for label, keywords in THEME_KEYWORDS.items():
        count = 0
        for kw in keywords:
            kw_norm = normalize_text(kw)
            if not kw_norm:
                continue
            # simple substring match in normalized text
            if kw_norm in t:
                count += 1

        if count > 0:
            # score saturates
            score = min(1.0, count / 4.0)
            hits.append(ThemeHit(label=label, score=round(score, 3), hits=count))

    # prioritize higher hits, then higher score
    hits.sort(key=lambda x: (x.hits, x.score), reverse=True)
    return hits[:max_themes]
