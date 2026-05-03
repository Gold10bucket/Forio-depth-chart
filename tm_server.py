"""
tm_server.py — local bridge between the depth-chart app and the Transfermarkt scraper.
Run this once before opening the app whenever you want to add prospects via TM URL.

    python tm_server.py

Listens on http://localhost:7654
Endpoint: GET /scrape?url=<transfermarkt_url>
Returns JSON with all prospect fields pre-filled.

Requirements: pip install flask requests beautifulsoup4
"""

import os
import sys
import re

from flask import Flask, request, jsonify

# ── Import the scraper ────────────────────────────────────────────────────────
# Path to the directory containing tm_export.py.
# Change this if you move tm_export.py elsewhere.
SCRAPER_DIR = os.path.expanduser("~/Documents/scrape")
if SCRAPER_DIR not in sys.path:
    sys.path.insert(0, SCRAPER_DIR)

try:
    from tm_export import scrape_player
except ImportError as e:
    print(f"⚠  Could not import tm_export: {e}")
    print(f"   Make sure tm_export.py is at: {SCRAPER_DIR}/tm_export.py")
    sys.exit(1)

# ── Map TM position labels → app category names ───────────────────────────────
_POS_MAP = {
    # Italian labels (from scraper)
    "Portiere":                    "Portiere",
    "Terzino destro":              "Terzino destro",
    "Terzino sinistro":            "Terzino sinistro",
    "Difensore centrale":          "Difensore centrale destro",
    "Difensore centrale destro":   "Difensore centrale destro",
    "Difensore centrale mancino":  "Difensore centrale mancino",
    "Mediano":                     "Play",
    "Centrocampista":              "Play",
    "Trequartista":                "Trequartista",
    "Mezzala":                     "Mezzala",
    "Ala destra":                  "Ala destra",
    "Ala sinistra":                "Ala sinistra",
    "Seconda punta":               "Punta centrale",
    "Punta centrale":              "Punta centrale",
    # English fallbacks
    "Goalkeeper":                  "Portiere",
    "Centre-Back":                 "Difensore centrale destro",
    "Right-Back":                  "Terzino destro",
    "Left-Back":                   "Terzino sinistro",
    "Defensive Midfield":          "Play",
    "Central Midfield":            "Play",
    "Attacking Midfield":          "Trequartista",
    "Right Winger":                "Ala destra",
    "Left Winger":                 "Ala sinistra",
    "Second Striker":              "Punta centrale",
    "Centre-Forward":              "Punta centrale",
}

def _map_category(tm_position: str) -> str:
    """Best-effort map of TM position string to app category."""
    if not tm_position:
        return ""
    # Exact match
    if tm_position in _POS_MAP:
        return _POS_MAP[tm_position]
    # Partial match (TM sometimes includes section prefix)
    tm_lower = tm_position.lower()
    for key, val in _POS_MAP.items():
        if key.lower() in tm_lower:
            return val
    return ""

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

@app.after_request
def cors(response):
    response.headers["Access-Control-Allow-Origin"] = "* "
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response

@app.route("/scrape")
def scrape():
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "url parameter required"}), 400
    if "transfermarkt" not in url:
        return jsonify({"error": "URL must be a transfermarkt.it link"}), 400

    try:
        raw = scrape_player(url)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Parse birth year as int
    birth_year = raw.get("Anno Nascita", "")
    try:
        birth_year = int(birth_year) if birth_year else None
    except ValueError:
        birth_year = None

    # Parse height as int
    height_cm = raw.get("Altezza (cm)", "")
    try:
        height_cm = int(height_cm) if height_cm else None
    except ValueError:
        height_cm = None

    # Parse minutes as int
    minutes = raw.get("Minuti Giocati", "")
    try:
        minutes = int(minutes) if minutes else None
    except ValueError:
        minutes = None

    result = {
        "name":        raw.get("Nome") or "",
        "birthDate":   raw.get("Data Nascita") or None,
        "birthYear":   birth_year,
        "nationality": raw.get("Nazionalità") or None,
        "heightCm":    height_cm,
        "foot":        raw.get("Piede Dominante") or None,
        "category":    _map_category(raw.get("Posizione", "")),
        "tmPosition":  raw.get("Posizione") or "",
        "currentClub": raw.get("Squadra") or None,
        "agent":       raw.get("Procuratore") or None,
        "minutes":     minutes,
        "profileUrl":  raw.get("Link Profilo") or url,
    }

    return jsonify(result)

@app.route("/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    print("=" * 60)
    print(" TM Server — http://localhost:7654")
    print(" GET /scrape?url=<transfermarkt_url>")
    print("=" * 60)
    app.run(port=7654, debug=False)
