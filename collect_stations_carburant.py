#!/usr/bin/env python3
"""
Collecte les stations-service françaises depuis l'API officielle prix-carburants.gouv.fr
~11 000 stations avec marque, adresse, GPS, carburants, services, horaires.
Génère data/output/stations_carburant.csv — import via Supabase Dashboard (drag & drop)
"""

import requests, csv, os, time, json

OUTPUT_DIR = "data/output"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "stations_carburant.csv")

# API officielle data.economie.gouv.fr (opendatasoft)
API_BASE = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records"
PAGE_SIZE = 100

COLS = [
    "name", "category", "subcategory", "address", "city", "country",
    "latitude", "longitude", "accepts_dogs", "accepts_cats",
    "dogs_on_leash_only", "outdoor_seating", "water_bowl_provided",
    "rating", "description", "verified", "source", "opening_hours", "phone", "website",
]

FUEL_LABELS = {
    "Gazole": "Diesel",
    "SP95": "SP95",
    "SP98": "SP98",
    "E10": "E10",
    "E85": "E85",
    "GPLc": "GPL",
}

SERVICE_LABELS = {
    "Toilettes publiques": "🚻 Toilettes",
    "Boutique alimentaire": "🛒 Boutique",
    "Boutique non alimentaire": "🛒 Boutique",
    "Restauration sur place": "🍽️ Restauration",
    "Vente de gaz domestique": "🔵 Gaz",
    "Station de gonflage": "🔧 Gonflage",
    "Lavage automatique": "🚗 Lavage auto",
    "Lavage manuel": "🚗 Lavage",
    "Relais colis": "📦 Relais colis",
    "DAB (Distributeur automatique de billets)": "💳 DAB",
    "WiFi": "📶 WiFi",
    "Aire de camping-cars": "🏕️ Camping-cars",
    "Automate CB 24/24": "💳 CB 24h/24",
}

def clean(s):
    if s is None:
        return ""
    return str(s).replace("\n", " ").replace('"', "'").strip()

def extract_brand(name: str) -> str:
    """Extrait la marque depuis le nom de la station."""
    name_low = name.lower()
    brands = [
        "Total", "TotalEnergies", "Shell", "BP", "Esso", "Esso Express",
        "Intermarché", "Leclerc", "Carrefour", "Auchan", "Casino", "Géant",
        "Super U", "Hyper U", "Système U", "Cora", "Lidl", "Aldi",
        "Netto", "Simply Market", "Monoprix", "Franprix",
        "Vito", "Dyneff", "Avia", "Agip", "Q8", "Fina",
        "Elyrion", "Prio", "Indépendant",
    ]
    for brand in brands:
        if brand.lower() in name_low:
            return brand
    # Essayer de prendre le premier mot comme marque
    first_word = name.split()[0] if name.split() else ""
    return first_word if len(first_word) > 2 else "Station"

def fetch_all():
    """Récupère toutes les stations via pagination."""
    stations = []
    offset = 0
    total = None
    print("Connexion à l'API prix-carburants.gouv.fr...")

    while True:
        params = {
            "limit": PAGE_SIZE,
            "offset": offset,
            "order_by": "id",
        }
        try:
            r = requests.get(API_BASE, params=params, timeout=30)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f"  ✗ Erreur offset {offset}: {e}")
            time.sleep(3)
            continue

        if total is None:
            total = data.get("total_count", 0)
            print(f"  → {total} stations trouvées")

        records = data.get("results", [])
        if not records:
            break

        stations.extend(records)
        offset += len(records)

        if offset % 1000 == 0 or offset >= total:
            print(f"  → {offset}/{total} récupérées...")

        if offset >= total:
            break

        time.sleep(0.05)  # Respecter l'API

    return stations

def process(stations):
    """Transforme les données brutes en lignes CSV."""
    rows = []
    seen = set()

    for s in stations:
        fields = s.get("fields", s)  # compatibilité format

        # Coordonnées
        geom = fields.get("geom")
        if geom and isinstance(geom, dict):
            coords = geom.get("coordinates", [])
            if len(coords) == 2:
                lon, lat = float(coords[0]), float(coords[1])
            else:
                continue
        else:
            lat_raw = fields.get("latitude") or fields.get("lat")
            lon_raw = fields.get("longitude") or fields.get("lon")
            if lat_raw is None or lon_raw is None:
                continue
            lat, lon = float(lat_raw), float(lon_raw)
            # Certaines sources stockent en centidegrés
            if abs(lat) > 180:
                lat /= 100000
            if abs(lon) > 180:
                lon /= 100000

        # Vérification France métropolitaine
        if not (41.0 <= lat <= 51.5 and -5.5 <= lon <= 10.0):
            continue

        # Adresse
        address = clean(fields.get("adresse", fields.get("address", "")))
        city    = clean(fields.get("ville", fields.get("city", "")))
        cp      = clean(fields.get("cp", fields.get("code_postal", "")))
        if not city:
            continue

        # Nom / marque
        raw_name = clean(fields.get("nom", fields.get("name", "")))
        if not raw_name:
            raw_name = f"Station {city}"
        brand = extract_brand(raw_name)

        # Déduplication
        key = (round(lat, 3), round(lon, 3))
        if key in seen:
            continue
        seen.add(key)

        # Carburants disponibles
        fuels = []
        carburants_raw = fields.get("carburants_disponibles", "")
        if isinstance(carburants_raw, str) and carburants_raw:
            for code, label in FUEL_LABELS.items():
                if code.lower() in carburants_raw.lower():
                    fuels.append(label)
        # Fallback: champs individuels
        for code, label in FUEL_LABELS.items():
            key_f = f"prix_{code.lower().replace('/', '_')}"
            if fields.get(key_f) and label not in fuels:
                fuels.append(label)

        if not fuels:
            fuels = ["Carburants disponibles"]

        # Services
        services = []
        services_raw = fields.get("services_service", fields.get("services", ""))
        if isinstance(services_raw, str) and services_raw:
            for svc, label in SERVICE_LABELS.items():
                if svc.lower() in services_raw.lower():
                    services.append(label)

        has_toilets_flag = any("Toilettes" in s for s in services)

        # Horaires
        horaires = clean(fields.get("horaires", fields.get("schedule", "")))
        if len(horaires) > 200:
            horaires = horaires[:200]

        # Description
        desc_parts = [f"Carburants : {', '.join(fuels)}."]
        if services:
            desc_parts.append(f"Services : {', '.join(services[:5])}.")
        if cp:
            desc_parts.append(f"CP {cp}.")
        description = " ".join(desc_parts)[:350]

        rows.append({
            "name":              raw_name[:120],
            "category":          "station_carburant",
            "subcategory":       brand[:80],
            "address":           address[:200],
            "city":              city[:80],
            "country":           "France",
            "latitude":          round(lat, 6),
            "longitude":         round(lon, 6),
            "accepts_dogs":      "TRUE",
            "accepts_cats":      "FALSE",
            "dogs_on_leash_only":"TRUE",
            "outdoor_seating":   "FALSE",
            "water_bowl_provided":"FALSE",
            "rating":            "",
            "description":       description,
            "verified":          "TRUE",
            "source":            "prix_carburants_gouv",
            "opening_hours":     horaires,
            "phone":             "",
            "website":           "",
        })

    return rows

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    stations = fetch_all()
    print(f"\nTraitement de {len(stations)} stations brutes...")
    rows = process(stations)
    print(f"→ {len(rows)} stations valides après filtrage/dédoublonnage")

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLS)
        writer.writeheader()
        writer.writerows(rows)

    size_kb = os.path.getsize(OUTPUT_FILE) // 1024
    print(f"✓ Fichier généré : {OUTPUT_FILE} ({size_kb} KB, {len(rows)} lignes)")
    print("\nÉtape suivante :")
    print("  Supabase Dashboard → Table Editor → pet_friendly_places → Import data → glisse stations_carburant.csv")

if __name__ == "__main__":
    main()
