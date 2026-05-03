"""
tm_add_prospect.py — scrape a Transfermarkt profile and add it directly to the
Real Forio 2014 prospects shortlist in Supabase.

Usage
-----
    python tm_add_prospect.py <transfermarkt_url>
    python tm_add_prospect.py          # will prompt for URL

Requirements
------------
    pip install supabase requests beautifulsoup4
"""

import os
import re
import sys

# ── Import scraper ────────────────────────────────────────────────────────────
SCRAPER_DIR = os.path.expanduser("~/Documents/scrape")
if SCRAPER_DIR not in sys.path:
    sys.path.insert(0, SCRAPER_DIR)

try:
    from tm_export import scrape_player
except ImportError as e:
    sys.exit(f"✗  Cannot import tm_export.py from {SCRAPER_DIR}\n   {e}")

# ── Supabase credentials (same as the app) ────────────────────────────────────
SUPABASE_URL  = "https://hqkpxiabebrresucxiay.supabase.co"
SUPABASE_ANON = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxa3B4aWFiZWJycmVzdWN4aWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzE1NTAsImV4cCI6MjA5MzE0NzU1MH0"
    ".xMFL9RlZyUpDIsFifRrwGYooYyJ-vTWYMkXhgOg81Ok"
)

try:
    from supabase import create_client
except ImportError:
    sys.exit("✗  Missing dependency: pip install supabase")

sb = create_client(SUPABASE_URL, SUPABASE_ANON)

# ── Position mapping ──────────────────────────────────────────────────────────
CATEGORIES = [
    "Portiere",
    "Terzino destro",
    "Terzino sinistro",
    "Difensore centrale destro",
    "Difensore centrale mancino",
    "Play",
    "Mezzala",
    "Trequartista",
    "Ala destra",
    "Ala sinistra",
    "Punta centrale",
]

_POS_MAP = {
    "portiere":                   "Portiere",
    "terzino destro":             "Terzino destro",
    "terzino sinistro":           "Terzino sinistro",
    "difensore centrale":         "Difensore centrale destro",
    "difensore centrale destro":  "Difensore centrale destro",
    "difensore centrale mancino": "Difensore centrale mancino",
    "mediano":                    "Play",
    "centrocampista":             "Play",
    "trequartista":               "Trequartista",
    "mezzala":                    "Mezzala",
    "ala destra":                 "Ala destra",
    "ala sinistra":               "Ala sinistra",
    "seconda punta":              "Punta centrale",
    "punta centrale":             "Punta centrale",
    "goalkeeper":                 "Portiere",
    "centre-back":                "Difensore centrale destro",
    "right-back":                 "Terzino destro",
    "left-back":                  "Terzino sinistro",
    "defensive midfield":         "Play",
    "central midfield":           "Play",
    "attacking midfield":         "Trequartista",
    "right winger":               "Ala destra",
    "left winger":                "Ala sinistra",
    "second striker":             "Punta centrale",
    "centre-forward":             "Punta centrale",
}

def _suggest_category(tm_position: str) -> str:
    if not tm_position:
        return ""
    low = tm_position.lower().strip()
    if low in _POS_MAP:
        return _POS_MAP[low]
    for key, val in _POS_MAP.items():
        if key in low:
            return val
    return ""


# ── Helpers ───────────────────────────────────────────────────────────────────
def _int_or_none(val):
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None

def _str_or_none(val):
    v = (val or "").strip()
    return v if v else None

def _pick_category(suggested: str) -> str:
    """Interactive category picker; pre-selects the suggestion."""
    print()
    print("  Categorie disponibili:")
    for i, cat in enumerate(CATEGORIES, 1):
        marker = "  ◀" if cat == suggested else ""
        print(f"    {i:2}. {cat}{marker}")
    print()

    default_idx = (CATEGORIES.index(suggested) + 1) if suggested in CATEGORIES else None
    prompt = f"  Scegli categoria [{default_idx or '?'}]: " if default_idx else "  Scegli categoria: "

    while True:
        raw = input(prompt).strip()
        if not raw and default_idx:
            return CATEGORIES[default_idx - 1]
        try:
            n = int(raw)
            if 1 <= n <= len(CATEGORIES):
                return CATEGORIES[n - 1]
        except ValueError:
            # allow typing the name directly
            matches = [c for c in CATEGORIES if raw.lower() in c.lower()]
            if len(matches) == 1:
                return matches[0]
        print("  ⚠  Input non valido, riprova.")


def _confirm(prompt: str) -> bool:
    ans = input(prompt).strip().lower()
    return ans in ("", "s", "si", "sì", "y", "yes")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    # 1 — get URL
    if len(sys.argv) > 1:
        url = sys.argv[1].strip()
    else:
        url = input("  URL Transfermarkt: ").strip()

    if not url:
        sys.exit("✗  Nessun URL fornito.")
    if "transfermarkt" not in url:
        sys.exit("✗  L'URL deve essere un link transfermarkt.it")

    print()
    print("=" * 60)
    print("  Scraping Transfermarkt…")
    print("=" * 60)

    # 2 — scrape
    try:
        raw = scrape_player(url)
    except Exception as e:
        sys.exit(f"\n✗  Errore durante lo scraping: {e}")

    name        = raw.get("Nome", "").strip()
    birth_date  = _str_or_none(raw.get("Data Nascita"))
    birth_year  = _int_or_none(raw.get("Anno Nascita"))
    nationality = _str_or_none(raw.get("Nazionalità"))
    height_cm   = _int_or_none(raw.get("Altezza (cm)"))
    foot        = _str_or_none(raw.get("Piede Dominante"))
    current_club= _str_or_none(raw.get("Squadra"))
    agent       = _str_or_none(raw.get("Procuratore"))
    minutes     = _int_or_none(raw.get("Minuti Giocati"))
    profile_url = _str_or_none(raw.get("Link Profilo")) or url
    tm_position = raw.get("Posizione", "")

    if not name:
        sys.exit("✗  Impossibile estrarre il nome del giocatore.")

    # 3 — show extracted data
    print()
    print("  ┌─ Dati estratti ──────────────────────────────────")
    print(f"  │  Nome:        {name}")
    print(f"  │  Nascita:     {birth_date or '—'}  ({birth_year or '—'})")
    print(f"  │  Nazionalità: {nationality or '—'}")
    print(f"  │  Altezza:     {height_cm or '—'} cm")
    print(f"  │  Piede:       {foot or '—'}")
    print(f"  │  Squadra:     {current_club or '—'}")
    print(f"  │  Procuratore: {agent or '—'}")
    print(f"  │  Minuti:      {minutes or '—'}")
    print(f"  │  Posizione TM:{tm_position or '—'}")
    print(f"  │  Profilo:     {profile_url}")
    print("  └──────────────────────────────────────────────────")

    # 4 — pick category
    suggested = _suggest_category(tm_position)
    if not suggested:
        print(f"\n  ⚠  Posizione TM «{tm_position}» non mappata automaticamente.")
    category = _pick_category(suggested)
    print(f"\n  → Categoria: {category}")

    # 5 — confirm
    print()
    if not _confirm(f"  Aggiungere {name} alla shortlist? [S/n] "):
        print("  Annullato.")
        return

    # 6 — insert into Supabase
    try:
        res = sb.table("prospects").insert({
            "category":    category,
            "name":        name,
            "birth_date":  birth_date,
            "birth_year":  birth_year,
            "nationality": nationality,
            "height_cm":   height_cm,
            "foot":        foot,
            "current_club":current_club,
            "agent":       agent,
            "minutes":     minutes,
            "profile_url": profile_url,
            "status":      "monitoring",
        }).execute()
    except Exception as e:
        sys.exit(f"\n✗  Errore Supabase: {e}")

    print()
    print(f"  ✅  {name} aggiunto alla shortlist come {category}.")
    print("      L'app si aggiornerà automaticamente via realtime.")
    print()


if __name__ == "__main__":
    main()
