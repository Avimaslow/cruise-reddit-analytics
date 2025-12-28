# ports_loader.py
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

from .text_normalize import normalize_text


@dataclass(frozen=True)
class PortDict:
    canonical: Dict[str, str]              # port_id -> Canonical Name
    alias_to_id: Dict[str, str]            # normalized alias -> port_id
    aliases_sorted: List[Tuple[str, str]]  # (alias_norm, port_id) sorted by alias length desc

def slugify(name: str) -> str:
    return normalize_text(name).replace(" ", "-")

def load_ports_txt(path: str) -> PortDict:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"ports file not found: {path}")

    canonical: Dict[str, str] = {}
    alias_to_id: Dict[str, str] = {}

    for raw in p.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        if "|" in line:
            canon, alias_part = line.split("|", 1)
            canon = canon.strip()
            aliases = [a.strip() for a in alias_part.split(",") if a.strip()]
        else:
            canon = line
            aliases = []

        port_id = slugify(canon)
        canonical[port_id] = canon

        # include canonical as alias too
        all_aliases = aliases + [canon]
        for a in all_aliases:
            an = normalize_text(a)
            if an:
                alias_to_id[an] = port_id

    aliases_sorted = sorted(alias_to_id.items(), key=lambda x: len(x[0]), reverse=True)
    return PortDict(canonical=canonical, alias_to_id=alias_to_id, aliases_sorted=aliases_sorted)
