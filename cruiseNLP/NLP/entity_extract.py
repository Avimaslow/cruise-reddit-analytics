# entity_extract.py
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional


from .text_normalize import normalize_text
from .ports_loader import load_ports_txt, PortDict

@dataclass
class ExtractResult:
    cruise_line: Optional[str]
    ship_ids: List[str]
    port_ids: List[str]
    confidence: float

# ---- Cruise line patterns (normalized matching) ----
# We run these against normalized text (accents removed, punctuation stripped),
# so keep patterns simple + word-boundary aware.
CRUISE_LINE_PATTERNS: List[Tuple[str, List[str]]] = [
    ("Royal Caribbean", [r"(?<!\w)royal caribbean(?!\w)", r"(?<!\w)rcl(?!\w)", r"(?<!\w)rccl(?!\w)", r"(?<!\w)royal(?!\w)"]),
    ("Carnival",        [r"(?<!\w)carnival(?!\w)", r"(?<!\w)ccl(?!\w)"]),
    ("Norwegian",       [r"(?<!\w)norwegian(?!\w)", r"(?<!\w)ncl(?!\w)"]),
    ("MSC",             [r"(?<!\w)msc(?!\w)", r"(?<!\w)msc cruises(?!\w)"]),
    ("Celebrity",       [r"(?<!\w)celebrity(?!\w)"]),
    ("Disney",          [r"(?<!\w)disney cruise(?!\w)", r"(?<!\w)disney(?!\w)", r"(?<!\w)dcl(?!\w)"]),
    ("Princess",        [r"(?<!\w)princess(?!\w)"]),
    ("Virgin",          [r"(?<!\w)virgin voyages(?!\w)", r"(?<!\w)virgin(?!\w)", r"(?<!\w)vv(?!\w)"]),
]

def normalize_id(s: str) -> str:
    s = normalize_text(s)
    return s.replace(" ", "-")

def guess_cruise_line(text_norm: str) -> Tuple[Optional[str], float]:
    for line, pats in CRUISE_LINE_PATTERNS:
        for p in pats:
            if re.search(p, text_norm):
                # confidence: higher for full name, slightly lower for abbreviations/short tokens
                conf = 0.9 if " " in normalize_text(line) else 0.8
                # if pattern is very short like "vv", treat as lower confidence
                if p.endswith("vv(?!\\w)"):
                    conf = 0.65
                return line, conf
    return None, 0.0

def extract_ports(text_norm: str, ports: PortDict) -> Tuple[List[str], float]:
    """
    Exact match ports using aliases.
    Multi-word aliases are matched first (aliases_sorted).
    Uses word boundaries to avoid partial matches.
    """
    found: List[str] = []
    used_spans: List[Tuple[int, int]] = []

    for alias_norm, port_id in ports.aliases_sorted:
        # boundary match
        m = re.search(rf"(?<!\w){re.escape(alias_norm)}(?!\w)", text_norm)
        if not m:
            continue

        span = (m.start(), m.end())

        # prevent overlap (so short alias doesn't match inside a longer one)
        if any(not (span[1] <= s[0] or span[0] >= s[1]) for s in used_spans):
            continue

        if port_id not in found:
            found.append(port_id)
            used_spans.append(span)

    if not found:
        return [], 0.0

    # confidence: multiword hits boost confidence, more matches boost confidence
    multiword_hits = 0
    for pid in found:
        canon = ports.canonical.get(pid, "")
        if " " in normalize_text(canon):
            multiword_hits += 1

    conf = min(0.95, 0.70 + 0.05 * len(found) + 0.05 * multiword_hits)
    return found, conf

def extract_ships_v1(text_norm: str, ships: List[str]) -> Tuple[List[str], float]:
    """
    Keep ships conservative for now (exact match only).
    Ships are optional in your current pipeline.
    Later we can add fuzzy matching with a high threshold.
    """
    if not ships:
        return [], 0.0

    found: List[str] = []
    # normalize ships once
    ship_norms = [(normalize_text(s), normalize_id(s)) for s in ships if s]
    ship_norms.sort(key=lambda x: len(x[0]), reverse=True)

    for ship_alias_norm, ship_id in ship_norms:
        if not ship_alias_norm:
            continue
        if re.search(rf"(?<!\w){re.escape(ship_alias_norm)}(?!\w)", text_norm):
            if ship_id not in found:
                found.append(ship_id)

    if not found:
        return [], 0.0

    conf = min(0.9, 0.70 + 0.05 * len(found))
    return found, conf

def extract_entities(
    text: str,
    ships: List[str],
    ports: List[str],  # kept for backward compatibility; not used if ports.txt is present
    ports_file: str = "NLP/ports.txt",
) -> ExtractResult:
    """
    v2 entity extraction:
    - normalize text (accents/punct/whitespace)
    - cruise line: regex patterns over normalized text
    - ports: load from ports.txt with aliases; exact match multiword-first
    - ships: conservative exact match only (for now)
    """
    text_norm = normalize_text(text or "")

    # cruise line
    line, line_conf = guess_cruise_line(text_norm)

    # ports (from file)
    port_ids: List[str] = []
    port_conf = 0.0
    try:
        ports_dict = load_ports_txt(ports_file)
        port_ids, port_conf = extract_ports(text_norm, ports_dict)
    except FileNotFoundError:
        # fallback: use provided ports list as exact matches (v1 behavior)
        port_ids = [normalize_id(p) for p in ports if p and re.search(rf"(?<!\w){re.escape(normalize_text(p))}(?!\w)", text_norm)]
        port_conf = 0.65 if port_ids else 0.0

    # ships (conservative)
    ship_ids, ship_conf = extract_ships_v1(text_norm, ships)

    # overall confidence (weighted; line strongest, then ports, then ships)
    conf = 0.0
    if line:
        conf += 0.55 * line_conf
    if port_ids:
        conf += 0.35 * port_conf
    if ship_ids:
        conf += 0.10 * ship_conf

    return ExtractResult(
        cruise_line=line,
        ship_ids=ship_ids,
        port_ids=port_ids,
        confidence=round(float(conf), 3),
    )

def dumps_list(xs: List[str]) -> str:
    return json.dumps(xs, ensure_ascii=False)
