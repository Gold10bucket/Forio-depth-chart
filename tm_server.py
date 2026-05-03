"""
tm_server.py — local bridge so the depth-chart web app can scrape Transfermarkt.
Run this once in the background before using the "+ Prospect" button.

    python tm_server.py          # then open the app in any browser

Listens on http://localhost:7654  (same machine only — never exposed to the internet)
"""

import os, re, sys
from flask import Flask, request, jsonify

SCRAPER_DIR = os.path.expanduser("~/Documents/scrape")
if SCRAPER_DIR not in sys.path:
    sys.path.insert(0, SCRAPER_DIR)

try:
    from tm_export import scrape_player
except ImportError as e:
    sys.exit(f"✗  Cannot import tm_export.py from {SCRAPER_DIR}\n   {e}")

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

def _map_category(pos):
    if not pos: return ""
    low = pos.lower().strip()
    if low in _POS_MAP: return _POS_MAP[low]
    for k, v in _POS_MAP.items():
        if k in low: return v
    return ""

def _int(v):
    try: return int(v) if v else None
    except: return None

app = Flask(__name__)

@app.after_request
def cors(r):
    r.headers["Access-Control-Allow-Origin"]  = "*"
    r.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return r

@app.route("/scrape")
def scrape():
    url = request.args.get("url", "").strip()
    if not url:
        return jsonify({"error": "url parameter required"}), 400
    if "transfermarkt" not in url:
        return jsonify({"error": "URL must be a transfermarkt link"}), 400
    try:
        raw = scrape_player(url)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({
        "name":        raw.get("Nome", ""),
        "birthDate":   raw.get("Data Nascita") or None,
        "birthYear":   _int(raw.get("Anno Nascita")),
        "nationality": raw.get("Nazionalità") or None,
        "heightCm":    _int(raw.get("Altezza (cm)")),
        "foot":        raw.get("Piede Dominante") or None,
        "category":    _map_category(raw.get("Posizione", "")),
        "currentClub": raw.get("Squadra") or None,
        "agent":       raw.get("Procuratore") or None,
        "minutes":     _int(raw.get("Minuti Giocati")),
        "profileUrl":  raw.get("Link Profilo") or url,
    })

@app.route("/health")
def health():
    return jsonify({"ok": True})

if __name__ == "__main__":
    print("=" * 50)
    print(" TM Server pronto — http://localhost:7654")
    print(" Apri l'app e usa il pulsante + Prospect")
    print("=" * 50)
    app.run(port=7654, debug=False)
