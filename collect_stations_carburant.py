#!/usr/bin/env python3
"""
Collecte les stations-service françaises depuis l'API officielle prix-carburants.gouv.fr
~9 700 stations avec adresse, GPS, carburants disponibles, services, horaires.
Génère :
  - data/output/stations_carburant.csv  (référence)
  - public/import/stations_carburant.json (import via page /admin/import-stations)
"""

import requests, csv, os, time, json as _json

OUTPUT_DIR  = "data/output"
CSV_FILE    = os.path.join(OUTPUT_DIR, "stations_carburant.csv")
PUBLIC_DIR  = "public/import"
JSON_FILE   = os.path.join(PUBLIC_DIR, "stations_carburant.json")

API_BASE  = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records"
PAGE_SIZE = 100

COLS = [
    "name", "category", "subcategory", "address", "city", "country",
    "latitude", "longitude", "accepts_dogs", "accepts_cats",
    "dogs_on_leash_only", "outdoor_seating", "water_bowl_provided",
    "rating", "description", "verified", "source", "opening_hours",
]

FUEL_LABELS = {
    "Gazole": "Diesel", "SP95": "SP95", "SP98": "SP98",
    "E10": "E10", "E85": "E85", "GPLc": "GPL",
}

SERVICE_MAP = {
    "Toilettes publiques":        "🚻 Toilettes",
    "Boutique alimentaire":       "🛒 Boutique",
    "Boutique non alimentaire":   "🛒 Boutique",
    "Restauration sur place":     "🍽️ Restauration",
    "Lavage automatique":         "🚗 Lavage auto",
    "Lavage manuel":              "🚗 Lavage",
    "Station de gonflage":        "🔧 Gonflage",
    "Automate CB 24/24":          "💳 CB 24h/24",
    "DAB (Distributeur automatique de billets)": "💳 DAB",
    "Relais colis":               "📦 Relais colis",
    "WiFi":                       "📶 WiFi",
    "Aire de camping-cars":       "🏕️ Camping-cars",
    "Vente de gaz domestique (Butane, Propane)": "🔵 Gaz",
}

def clean(s):
    return str(s or "").replace("\n", " ").strip()

def parse_services(raw) -> list[str]:
    if not raw:
        return []
    try:
        obj = _json.loads(raw) if isinstance(raw, str) else raw
        svcs = obj.get("service", [])
        if isinstance(svcs, str):
            svcs = [svcs]
        return [SERVICE_MAP[s] for s in svcs if s in SERVICE_MAP]
    except Exception:
        return []

def parse_horaires(raw) -> str:
    if not raw:
        return ""
    try:
        obj = _json.loads(raw) if isinstance(raw, str) else raw
        auto = obj.get("@automate-24-24", "0")
        if auto == "1":
            return "Ouvert 24h/24"
        jours = obj.get("jour", [])
        if not isinstance(jours, list):
            jours = [jours]
        parts = []
        for j in jours[:3]:  # on prend les 3 premiers jours
            nom = j.get("@nom", "")
            ferme = j.get("@ferme", "")
            if ferme:
                continue
            h = j.get("horaire", {})
            if isinstance(h, dict):
                ouv = h.get("@ouverture", "")
                fer = h.get("@fermeture", "")
                if ouv and fer:
                    parts.append(f"{nom[:3]} {ouv}-{fer}")
        return ", ".join(parts)[:150]
    except Exception:
        return ""

def fetch_all():
    stations = []
    offset   = 0
    total    = None
    print("Connexion à l'API prix-carburants.gouv.fr...")

    while True:
        try:
            r = requests.get(
                API_BASE,
                params={"limit": PAGE_SIZE, "offset": offset},
                timeout=30,
            )
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f"  ✗ offset={offset} : {e} — nouvelle tentative dans 3s")
            time.sleep(3)
            continue

        if total is None:
            total = data.get("total_count", 0)
            print(f"  → {total} stations disponibles")

        records = data.get("results", [])
        if not records:
            break

        stations.extend(records)
        offset += len(records)

        if offset % 1000 == 0:
            print(f"  → {offset}/{total} récupérées...")

        if offset >= total:
            break

        time.sleep(0.05)

    return stations

def process(stations):
    rows = []
    seen = set()

    for s in stations:
        # Coordonnées — geom.lat / geom.lon en degrés décimaux
        geom = s.get("geom")
        if geom and isinstance(geom, dict):
            lat = geom.get("lat")
            lon = geom.get("lon")
        else:
            # Fallback : champs latitude/longitude en centidegrés
            lat_raw = s.get("latitude")
            lon_raw = s.get("longitude")
            if lat_raw is None or lon_raw is None:
                continue
            lat = float(lat_raw) / 100000
            lon = float(lon_raw) / 100000

        if lat is None or lon is None:
            continue
        lat, lon = float(lat), float(lon)

        # France métropolitaine uniquement
        if not (41.0 <= lat <= 51.5 and -5.5 <= lon <= 10.0):
            continue

        # Déduplication par coordonnées
        key = (round(lat, 3), round(lon, 3))
        if key in seen:
            continue
        seen.add(key)

        # Adresse
        address = clean(s.get("adresse", ""))[:200]
        city    = clean(s.get("ville", ""))[:80]
        cp      = clean(s.get("cp", ""))

        # Carburants disponibles
        fuels_raw = s.get("carburants_disponibles") or []
        if isinstance(fuels_raw, str):
            fuels_raw = [fuels_raw]
        fuels = [FUEL_LABELS.get(f, f) for f in fuels_raw if f in FUEL_LABELS]
        if not fuels:
            fuels = ["Carburant"]

        # Services
        services = parse_services(s.get("services", ""))

        # Horaires
        horaires = parse_horaires(s.get("horaires", ""))

        # Nom (pas de champ nom dans l'API — on construit)
        name = f"Station essence {city}" if city else "Station essence"
        if address:
            name = f"Station {address.split()[0] if address.split() else ''} {city}".strip()
        name = name[:120]

        # Description
        desc_parts = [f"⛽ {', '.join(fuels)}."]
        if services:
            desc_parts.append("  ".join(services[:4]) + ".")
        if cp:
            desc_parts.append(f"({cp} {city})")
        description = " ".join(desc_parts)[:350]

        rows.append({
            "name":               name,
            "category":           "station_carburant",
            "subcategory":        "",
            "address":            address,
            "city":               city,
            "country":            "France",
            "latitude":           round(lat, 6),
            "longitude":          round(lon, 6),
            "accepts_dogs":       True,
            "accepts_cats":       False,
            "dogs_on_leash_only": True,
            "outdoor_seating":    False,
            "water_bowl_provided":False,
            "rating":             None,
            "description":        description,
            "verified":           True,
            "source":             "prix_carburants_gouv",
            "opening_hours":      horaires or None,
        })

    return rows

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)

    stations = fetch_all()
    print(f"\nTraitement de {len(stations)} stations...")
    rows = process(stations)
    print(f"→ {len(rows)} stations valides")

    # JSON pour l'import via la page admin
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        _json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = os.path.getsize(JSON_FILE) // 1024
    print(f"✓ JSON : {JSON_FILE} ({size_kb} KB)")

    # CSV pour référence
    def to_csv_val(v):
        if v is None: return ""
        if v is True: return "true"
        if v is False: return "false"
        return str(v)
    with open(CSV_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLS)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: to_csv_val(row.get(k)) for k in COLS})
    print(f"✓ CSV  : {CSV_FILE}")
    print(f"\n→ Lance l'import sur : https://pawsome-places-app.lovable.app/admin/import-stations")

if __name__ == "__main__":
    main()
