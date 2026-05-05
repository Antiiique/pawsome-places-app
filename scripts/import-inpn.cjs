#!/usr/bin/env node
/**
 * Import espaces naturels français dans pet_friendly_places
 *
 * Modes d'utilisation :
 *
 *   1) Automatique (télécharge les sources directement) :
 *      node scripts/import-inpn.js --auto
 *
 *   2) Fichier local (GeoJSON ou CSV) :
 *      node scripts/import-inpn.js monFichier.geojson
 *      node scripts/import-inpn.js monFichier.csv
 *
 * Sources embarquées en mode --auto :
 *   - 11 Parcs Nationaux (data.gouv.fr)
 *   - 59 Parcs Naturels Régionaux (data.gouv.fr)
 *   - Réserves Naturelles Régionales Occitanie (data.laregion.fr)
 *
 * Pour les Réserves Naturelles Nationales et forêts (format SHP) :
 *   → Télécharge le SHP depuis data.gouv.fr (lien dans le README ci-dessous)
 *   → Convertis-le en GeoJSON sur https://mapshaper.org (gratuit, glisser-déposer)
 *   → Lance : node scripts/import-inpn.js fichier-converti.geojson
 *
 * Output : fichier import_inpn_YYYY-MM-DD.sql à coller dans Supabase SQL Editor
 */

const fs   = require("fs");
const path = require("path");
const https = require("https");
const http  = require("http");

// ─── Sources auto-fetch ───────────────────────────────────────────────────────
const AUTO_SOURCES = [
  {
    label: "Parcs Nationaux (11)",
    url: "https://static.data.gouv.fr/resources/contours-des-11-parcs-nationaux-de-france/20260211-094019/pnx-coeur-aa-ama.geojson",
    defaultType: "parc national",
    nameFields: ["nom_pn", "NOM_PN", "nom_site", "NOM_SITE", "nom", "NOM", "name", "NAME"],
    codeFields: ["cd_pn", "CD_PN", "cd_ap", "CD_AP", "code", "CODE", "id_mnhn"],
    typeFields: [], // on force le type
    deptFields: ["dept_pn", "DEPT_PN", "code_dep", "CODE_DEP"],
    regionFields: ["reg_pn", "REG_PN"],
    surfFields: ["surf_pn", "SURF_PN", "surf_off", "SURF_OFF"],
    urlFields: ["url_fiche", "URL_FICHE", "url", "URL"],
  },
  {
    label: "Parcs Naturels Régionaux (59)",
    url: "https://www.data.gouv.fr/api/1/datasets/r/1c2e318d-eadd-4e3d-8b36-d3cac67cd796",
    defaultType: "parc naturel régional",
    projection: "webmercator", // coordonnées en EPSG:3857 (Web Mercator) → conversion automatique
    nameFields: ["name", "NAME", "nom", "NOM", "official_name", "short_name"],
    codeFields: ["ref", "REF", "wikidata", "id", "ID", "@id"],
    typeFields: ["boundary", "BOUNDARY", "type", "TYPE"],
    deptFields: ["addr:department", "department"],
    regionFields: ["addr:region", "region"],
    surfFields: ["area", "AREA"],
    urlFields: ["website", "contact:website", "url"],
  },
  {
    label: "Réserves Naturelles Régionales – Occitanie",
    url: "https://data.laregion.fr/api/explore/v2.1/catalog/datasets/reserves-naturelles-regionales-rnr/exports/json",
    defaultType: "réserve naturelle",
    nameFields: ["nom_site", "NOM_SITE", "nom", "NOM", "name", "NAME"],
    codeFields: ["id_mnhn", "ID_MNHN", "id_local", "ID_LOCAL", "code", "CODE"],
    typeFields: [],
    deptFields: ["nom_dep", "NOM_DEP", "code_dep", "CODE_DEP"],
    regionFields: [],
    surfFields: ["surf_off", "SURF_OFF", "surface", "SURFACE"],
    urlFields: ["url_fiche", "URL_FICHE", "url", "URL"],
    // Ce dataset a des coordonnées directes dans geo_point_2d
    pointField: "geo_point_2d",
  },
];

// ─── Mapping type → propriétés app ───────────────────────────────────────────
const TYPE_MAP = [
  { match: ["parc national", "pn "],
    category: "outdoor", subcategory: "parc national", leash: true, dogs: true,
    desc: "Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale." },

  { match: ["parc naturel régional", "parc naturel regional", "pnr"],
    category: "outdoor", subcategory: "parc naturel régional", leash: true, dogs: true,
    desc: "Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés." },

  { match: ["réserve naturelle nationale", "reserve naturelle nationale", "rnn"],
    category: "outdoor", subcategory: "réserve naturelle", leash: true, dogs: true,
    desc: "Réserve naturelle nationale. Chiens autorisés en laisse sur sentiers autorisés. Vérifier règlement." },

  { match: ["réserve naturelle régionale", "reserve naturelle regionale", "rnr", "réserve naturelle"],
    category: "outdoor", subcategory: "réserve naturelle", leash: true, dogs: true,
    desc: "Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local." },

  { match: ["forêt domaniale", "foret domaniale"],
    category: "outdoor", subcategory: "forêt domaniale", leash: false, dogs: true,
    desc: "Forêt domaniale ONF. Chiens autorisés, sous contrôle du maître." },

  { match: ["forêt communale", "foret communale", "forêt", "foret", "bois"],
    category: "outdoor", subcategory: "forêt", leash: false, dogs: true,
    desc: "Forêt ouverte au public. Chiens autorisés, sous contrôle du maître." },

  { match: ["conservatoire du littoral", "conservatoire littoral"],
    category: "outdoor", subcategory: "conservatoire littoral", leash: true, dogs: true,
    desc: "Site du Conservatoire du Littoral. Chiens autorisés en laisse hors zones de nidification." },

  { match: ["natura 2000", "zps", "zsc", "sic", "zone spéciale de conservation", "zone de protection spéciale"],
    category: "outdoor", subcategory: "natura 2000", leash: false, dogs: true,
    desc: "Zone Natura 2000. Accès libre, chiens sous contrôle. Respecter la faune sauvage." },

  { match: ["réserve de biosphère", "reserve de biosphere"],
    category: "outdoor", subcategory: "réserve biosphère", leash: true, dogs: true,
    desc: "Réserve de biosphère UNESCO. Accès libre dans les zones tampons et de transition." },

  { match: ["parc", "park", "base de loisirs", "espace vert"],
    category: "outdoor", subcategory: "parc", leash: false, dogs: true,
    desc: "Espace naturel ou parc. Chiens généralement autorisés." },
];

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function getField(obj, candidates) {
  for (const k of candidates) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return null;
}

function normalizeStr(s) {
  if (!s) return "";
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function mapType(typeStr, defaultType) {
  const source = defaultType || typeStr;
  if (!source) return null;
  const norm = normalizeStr(source);
  for (const m of TYPE_MAP) {
    for (const kw of m.match) {
      if (norm.includes(normalizeStr(kw))) return m;
    }
  }
  return null;
}

function polygonCentroid(coords) {
  let lngSum = 0, latSum = 0, n = 0;
  for (const [lng, lat] of coords) {
    if (isFinite(lng) && isFinite(lat)) { lngSum += lng; latSum += lat; n++; }
  }
  return n ? [lngSum / n, latSum / n] : null;
}

function geometryCentroid(geometry) {
  if (!geometry) return null;
  try {
    if (geometry.type === "Point") return geometry.coordinates;
    if (geometry.type === "Polygon") return polygonCentroid(geometry.coordinates[0]);
    if (geometry.type === "MultiPolygon") {
      let best = null, bestN = 0;
      for (const poly of geometry.coordinates) {
        if (poly[0].length > bestN) { best = poly[0]; bestN = poly[0].length; }
      }
      return best ? polygonCentroid(best) : null;
    }
    if (geometry.type === "MultiPoint") return polygonCentroid(geometry.coordinates);
  } catch {}
  return null;
}

function isInFrance(lat, lng) {
  // Métropole + DOM/TOM approximatif
  return (lat >= 41 && lat <= 52 && lng >= -5.5 && lng <= 10)   // métropole
      || (lat >= 14 && lat <= 18 && lng >= -63 && lng <= -60)    // Antilles
      || (lat >= -23 && lat <= -20 && lng >= 55 && lng <= 56)    // Réunion
      || (lat >= 1 && lat <= 6 && lng >= -55 && lng <= -50)      // Guyane
      || (lat >= -13 && lat <= -12 && lng >= 44 && lng <= 46);   // Mayotte
}

// Conversion Web Mercator (EPSG:3857) → WGS84 (EPSG:4326)
function webMercatorToWgs84(x, y) {
  const R = 6378137.0;
  const lng = x * 180 / (R * Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI;
  return [lng, lat]; // [lng, lat] WGS84
}

// Conversion Lambert 93 (EPSG:2154) → WGS84 (EPSG:4326)
function lambert93ToWgs84(x, y) {
  const n  = 0.7256077650532670;
  const c  = 11754255.4261;
  const xs = 700000.0;
  const ys = 12655612.0499;
  const e  = 0.08181919084262149;
  const l0 = 3 * Math.PI / 180;

  const dx    = x - xs;
  const dy    = ys - y;
  const R     = Math.sqrt(dx * dx + dy * dy);
  const gamma = Math.atan2(dx, dy);
  const L     = -Math.log(Math.abs(R / c)) / n;

  let phi = 2 * Math.atan(Math.exp(L)) - Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const sinPhi = Math.sin(phi);
    phi = 2 * Math.atan(
      Math.exp(L) * Math.pow((1 + e * sinPhi) / (1 - e * sinPhi), e / 2)
    ) - Math.PI / 2;
  }

  const lambda = gamma / n + l0;
  return [lambda * 180 / Math.PI, phi * 180 / Math.PI]; // [lng, lat] WGS84
}

function escapeSql(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

// ─── Fetch avec suivi de redirections ────────────────────────────────────────

function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "PawsomePlaces-Import/1.0" } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        res.destroy();
        return resolve(fetchUrl(next, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        res.destroy();
        return reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
      }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("error", reject);
  });
}

// ─── Traitement d'un tableau de features ─────────────────────────────────────

function processFeatures(features, source) {
  const records = [];
  const unknownTypes = {};
  let noCoords = 0, noName = 0;

  for (const feat of features) {
    // Supporte GeoJSON features ET objets plats (CSV/JSON tabulaire)
    const props = feat.properties || feat;
    const geometry = feat.geometry || null;

    // Nom
    const name = getField(props, source.nameFields || []);
    if (!name || !name.trim()) { noName++; continue; }

    // Type et mapping
    const typeRaw = getField(props, source.typeFields || []);
    const mapping = mapType(typeRaw, source.defaultType);
    if (!mapping) {
      if (typeRaw) { unknownTypes[typeRaw] = (unknownTypes[typeRaw] || 0) + 1; }
      continue;
    }

    // Coordonnées
    let lat = null, lng = null;

    // 1. Champ geo_point_2d (format data.laregion.fr)
    if (source.pointField && props[source.pointField]) {
      const pt = props[source.pointField];
      if (typeof pt === "object" && pt.lat != null) { lat = pt.lat; lng = pt.lon; }
      else if (typeof pt === "string") {
        const parts = pt.split(",").map(Number);
        if (parts.length === 2) { lat = parts[0]; lng = parts[1]; }
      }
    }

    // 2. Champs lat/lng explicites
    if (lat === null) {
      const latF = ["latitude", "LATITUDE", "lat", "LAT", "y", "Y"].find(f => props[f] != null);
      const lngF = ["longitude", "LONGITUDE", "lng", "LNG", "lon", "LON", "x", "X"].find(f => props[f] != null);
      if (latF && lngF) { lat = parseFloat(props[latF]); lng = parseFloat(props[lngF]); }
    }

    // 3. Centroïde de la géométrie GeoJSON
    if ((lat === null || !isFinite(lat)) && geometry) {
      const c = geometryCentroid(geometry);
      if (c) { lng = c[0]; lat = c[1]; }
    }

    // 4. Reprojection si les coordonnées sont en projection cartographique
    if (source.projection && lng !== null && isFinite(lng)) {
      let wgs84;
      if (source.projection === "webmercator") wgs84 = webMercatorToWgs84(lng, lat);
      else if (source.projection === "lambert93") wgs84 = lambert93ToWgs84(lng, lat);
      if (wgs84) { lng = wgs84[0]; lat = wgs84[1]; }
    }

    if (lat === null || !isFinite(lat) || lng === null || !isFinite(lng)) { noCoords++; continue; }
    if (!isInFrance(lat, lng)) { noCoords++; continue; }

    // Métadonnées
    const sourceId = getField(props, source.codeFields || []);
    const dept     = getField(props, source.deptFields || []);
    const region   = getField(props, source.regionFields || []);
    const website  = getField(props, source.urlFields || []);
    const surfVal  = getField(props, source.surfFields || []);

    let description = mapping.desc;
    if (surfVal) {
      const ha = parseFloat(surfVal);
      if (isFinite(ha) && ha > 0) {
        const display = ha >= 1000 ? `${Math.round(ha / 100) / 10} km²` : `${Math.round(ha)} ha`;
        description += ` Surface : ${display}.`;
      }
    }

    records.push({
      name: name.trim().slice(0, 200),
      category: mapping.category,
      subcategory: mapping.subcategory,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      country: "France",
      region: region || null,
      department: dept || null,
      description,
      website: website || null,
      source_id: sourceId ? String(sourceId).trim() : null,
      accepts_dogs: mapping.dogs,
      dogs_on_leash_only: mapping.leash,
    });
  }

  return { records, unknownTypes, noCoords, noName };
}

// ─── Génération SQL ───────────────────────────────────────────────────────────

function generateSQL(allRecords) {
  const lines = [
    "-- ============================================================",
    "-- Import espaces naturels France (INPN / data.gouv.fr / ONF)",
   `-- Généré le ${new Date().toISOString().split("T")[0]}`,
    "-- ============================================================",
    "",
    "BEGIN;",
    "",
  ];

  // Déduplication :
  // • Si source_id connu → on vérifie que source='inpn' + source_id n'existe pas
  // • Sinon → on vérifie proximité (≈1 km) + nom identique
  // Le rayon de 0.009° ≈ 1 km couvre les variations de centroïde sur de grandes aires.

  for (const rec of allRecords) {
    lines.push("INSERT INTO pet_friendly_places (");
    lines.push("  name, category, subcategory,");
    lines.push("  latitude, longitude,");
    lines.push("  country, region, department,");
    lines.push("  description, website,");
    lines.push("  source, source_id,");
    lines.push("  accepts_dogs, accepts_cats, dogs_on_leash_only,");
    lines.push("  outdoor_seating, verified");
    lines.push(")");
    lines.push("SELECT");
    lines.push(`  ${escapeSql(rec.name)},`);
    lines.push(`  ${escapeSql(rec.category)},`);
    lines.push(`  ${escapeSql(rec.subcategory)},`);
    lines.push(`  ${escapeSql(rec.latitude)},`);
    lines.push(`  ${escapeSql(rec.longitude)},`);
    lines.push(`  'France',`);
    lines.push(`  ${escapeSql(rec.region)},`);
    lines.push(`  ${escapeSql(rec.department)},`);
    lines.push(`  ${escapeSql(rec.description)},`);
    lines.push(`  ${escapeSql(rec.website)},`);
    lines.push(`  'inpn',`);
    lines.push(`  ${escapeSql(rec.source_id)},`);
    lines.push(`  ${escapeSql(rec.accepts_dogs)},`);
    lines.push(`  FALSE,`);
    lines.push(`  ${escapeSql(rec.dogs_on_leash_only)},`);
    lines.push(`  TRUE,`);
    lines.push(`  FALSE`);
    lines.push("WHERE NOT EXISTS (");
    lines.push("  SELECT 1 FROM pet_friendly_places WHERE");

    if (rec.source_id) {
      lines.push(`    source = 'inpn' AND source_id = ${escapeSql(rec.source_id)}`);
    } else {
      const latMin = (rec.latitude  - 0.009).toFixed(6);
      const latMax = (rec.latitude  + 0.009).toFixed(6);
      const lngMin = (rec.longitude - 0.012).toFixed(6);
      const lngMax = (rec.longitude + 0.012).toFixed(6);
      lines.push(`    latitude  BETWEEN ${latMin} AND ${latMax}`);
      lines.push(`    AND longitude BETWEEN ${lngMin} AND ${lngMax}`);
      lines.push(`    AND LOWER(TRIM(name)) = LOWER(TRIM(${escapeSql(rec.name)}))`);
    }

    lines.push(");");
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");
  lines.push(`-- Total enregistrements traités : ${allRecords.length}`);
  return lines.join("\n");
}

// ─── Parsing fichier local ────────────────────────────────────────────────────

function parseLocalGeoJSON(filepath) {
  const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
  if (data.type === "FeatureCollection") return data.features || [];
  if (Array.isArray(data)) return data;
  if (data.type === "Feature") return [data];
  throw new Error("Format GeoJSON non reconnu");
}

function parseLocalCSV(filepath) {
  const lines = fs.readFileSync(filepath, "utf8").split(/\r?\n/).filter(l => l.trim());
  const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map(line => {
    const parts = line.split(sep).map(p => p.replace(/^"|"$/g, "").trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = parts[i] || null; });
    return obj; // pas de .properties / .geometry → processFeatures les gère
  }).filter(o => Object.values(o).some(v => v));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage:");
    console.log("  node scripts/import-inpn.js --auto             # télécharge automatiquement");
    console.log("  node scripts/import-inpn.js fichier.geojson    # fichier local GeoJSON");
    console.log("  node scripts/import-inpn.js fichier.csv        # fichier local CSV");
    console.log("\nPour les forêts et RNN (format SHP) :");
    console.log("  1. Télécharge le SHP depuis data.gouv.fr :");
    console.log("     Forêts : https://www.data.gouv.fr/datasets/forets-domaniales-et-publiques");
    console.log("     RNN    : https://www.data.gouv.fr/datasets/reserve-naturelle-nationale-et-son-perimetre-de-protection-associe");
    console.log("  2. Convertis en GeoJSON sur https://mapshaper.org");
    console.log("  3. Lance : node scripts/import-inpn.js fichier-converti.geojson");
    process.exit(0);
  }

  const allRecords = [];

  if (args[0] === "--auto") {
    // Mode auto : téléchargement des sources connues
    for (const src of AUTO_SOURCES) {
      process.stdout.write(`\n⬇️  Téléchargement : ${src.label}... `);
      let raw;
      try {
        raw = await fetchUrl(src.url);
        console.log("✓");
      } catch (e) {
        console.log(`✗ (${e.message}) — source ignorée`);
        continue;
      }

      let features;
      try {
        const data = JSON.parse(raw);
        // GeoJSON FeatureCollection
        if (data.type === "FeatureCollection") features = data.features || [];
        // Tableau d'objets (JSON tabulaire)
        else if (Array.isArray(data)) features = data;
        else { console.log("  Format non reconnu, ignoré"); continue; }
      } catch (e) {
        console.log(`  Erreur de parsing JSON : ${e.message}`);
        continue;
      }

      const { records, unknownTypes, noCoords, noName } = processFeatures(features, src);
      console.log(`  → ${records.length} lieux valides, ${noCoords} sans coords, ${noName} sans nom`);
      if (Object.keys(unknownTypes).length) {
        console.log(`  ⚠ Types non reconnus : ${Object.entries(unknownTypes).map(([t,c]) => `"${t}" (${c})`).join(", ")}`);
      }
      allRecords.push(...records);
    }

  } else {
    // Mode fichier local
    const filepath = args[0];
    if (!fs.existsSync(filepath)) {
      console.error(`Fichier introuvable : ${filepath}`);
      process.exit(1);
    }

    const ext = path.extname(filepath).toLowerCase();
    let features;

    if (ext === ".geojson" || ext === ".json") {
      features = parseLocalGeoJSON(filepath);
    } else if (ext === ".csv") {
      features = parseLocalCSV(filepath);
    } else {
      console.error("Format non supporté. Utilise .geojson, .json ou .csv");
      console.error("Pour les Shapefiles (.shp), convertis d'abord sur https://mapshaper.org");
      process.exit(1);
    }

    console.log(`\n📂 ${features.length} éléments dans le fichier`);

    // Détection automatique du type depuis le contenu
    const autoSource = {
      label: path.basename(filepath),
      defaultType: null, // sera déduit depuis les propriétés
      nameFields:   ["nom_site","NOM_SITE","nom_pn","NOM_PN","nom","NOM","name","NAME","label","LABEL","denomination","lib_ap"],
      codeFields:   ["cd_ap","CD_AP","id_mnhn","ID_MNHN","cd_pn","CD_PN","id_local","ID_LOCAL","code","CODE","id","ID","ref"],
      typeFields:   ["typ_ap_lib","TYP_AP_LIB","type","TYPE","categorie","CATEGORIE","nature","NATURE","statut","STATUT","llib_frt","LLIB_FRT"],
      deptFields:   ["nom_dep","NOM_DEP","dept_pn","DEPT_PN","code_dep","CODE_DEP","departement","DEPARTEMENT"],
      regionFields: ["reg_ap","REG_AP","reg_pn","REG_PN","region","REGION"],
      surfFields:   ["surf_off","SURF_OFF","surf_pn","SURF_PN","surface","SURFACE","superficie","SUPERFICIE"],
      urlFields:    ["url_fiche","URL_FICHE","url","URL","website","WEBSITE","site_web","lien"],
      pointField:   "geo_point_2d",
    };

    const { records, unknownTypes, noCoords, noName } = processFeatures(features, autoSource);
    console.log(`✅ ${records.length} lieux valides | ${noCoords} sans coords | ${noName} sans nom`);
    if (Object.keys(unknownTypes).length > 0) {
      console.log("\n⚠️  Types non reconnus (envoie cette liste pour que je les ajoute) :");
      Object.entries(unknownTypes).sort((a,b) => b[1]-a[1]).forEach(([t,c]) => {
        console.log(`   "${t}" → ${c} fois`);
      });
    }
    allRecords.push(...records);
  }

  if (allRecords.length === 0) {
    console.error("\n❌ Aucun lieu à importer.");
    process.exit(1);
  }

  // Déduplication locale (évite les doublons entre sources)
  const seen = new Set();
  const deduped = allRecords.filter(r => {
    const key = r.source_id
      ? `id:${r.source_id}`
      : `pos:${r.latitude.toFixed(3)}_${r.longitude.toFixed(3)}_${r.name.toLowerCase().slice(0,20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n📊 Résumé :`);
  console.log(`  ${allRecords.length} total → ${deduped.length} après déduplication locale`);

  // Répartition par subcategory
  const subCats = {};
  deduped.forEach(r => { subCats[r.subcategory] = (subCats[r.subcategory] || 0) + 1; });
  console.log("\n📂 Répartition par type :");
  Object.entries(subCats).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`  ${s.padEnd(30)} ${c}`);
  });

  const sql = generateSQL(deduped);
  const outFile = `import_inpn_${new Date().toISOString().split("T")[0]}.sql`;
  fs.writeFileSync(outFile, sql, "utf8");

  console.log(`\n✅ Fichier SQL généré : ${outFile}`);
  console.log(`   → Ouvre le SQL Editor de Supabase`);
  console.log(`   → Colle le contenu et exécute`);
  console.log(`   → Chaque INSERT vérifie les doublons avant d'insérer`);
}

main().catch(e => { console.error("Erreur :", e.message); process.exit(1); });
