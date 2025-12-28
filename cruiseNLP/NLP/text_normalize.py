# text_normalize.py
import re
import unicodedata

_WS_RE = re.compile(r"\s+")
_PUNC_RE = re.compile(r"[^a-z0-9\s]")

def strip_accents(s: str) -> str:
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch))

def normalize_text(s: str) -> str:
    """
    v2 normalization:
    - lowercase
    - remove accents (Roatán -> roatan)
    - replace punctuation with spaces
    - collapse whitespace
    """
    if not s:
        return ""
    s = s.lower()
    s = strip_accents(s)
    s = _PUNC_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    return s
