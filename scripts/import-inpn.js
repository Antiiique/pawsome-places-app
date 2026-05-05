#!/usr/bin/env node
/**
 * Import INPN protected areas + ONF forests into pet_friendly_places
 *
 * Usage:
 *   node scripts/import-inpn.js <fichier.geojson>
 *
 * Sources recommandées :
 *   1. Aires protégées (INPN) :
 *      https://www.data.gouv.fr/fr/datasets/espaces-naturels-proteges-en-france/
 *      → Télécharger le fichier GeoJSON "Espaces protégés de France métropolitaine"
 *
 *   2. Forêts publiques (ONF/IGN) :
 *      https://www.data.gouv.fr/fr/datasets/forets-publiques/
 *      → Télécharger le GeoJSON ou CSV des forêts domaniales et communales
 *
 * Output : un fichier import_inpn_YYYY-MM-DD.sql à coller dans l'éditeur Supabase
 */

const fs = require("fs");
const path = require("path");

// ─── Mapping type INPN → catégorie app ───────────────────────────────────────
// Le champ "type" dans les données INPN peut varier selon le dataset.
// On normalise en minuscules pour la comparaison.
const TYPE_MAP = [
  // Parcs nationaux — chiens interdits en zone centrale, autorisés en zone périphérique
  { match: ["parc national", "pn", "national park"],
    category: "outdoor", subcategory: "parc national",
    leash: true, dogs: true,
    description: "Parc national. Chiens autorisés en zone périphérique (en laisse). Interdits en zone centrale." },

  // Parcs naturels régionaux — chiens autorisés en laisse
  { match: ["parc naturel régional", "parc naturel regional", "pnr", "regional natural park"],
    category: "outdoor", subcategory: "parc naturel régional",
    leash: true, dogs: true,
    description: "Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés." },

  // Réserves naturelles — règles strictes, souvent interdits
  { match: ["réserve naturelle nationale", "reserve naturelle nationale", "rnn"],
    category: "outdoor", subcategory: "réserve naturelle",
    leash: true, dogs: true,
    description: "Réserve naturelle nationale. Chiens autorisés en laisse sur sentiers autorisés. Vérifier règlement local." },

  { match: ["réserve naturelle régionale", "reserve naturelle regionale", "rnr"],
    category: "outdoor", subcategory: "réserve naturelle",
    leash: true, dogs: true,
    description: "Réserve naturelle régionale. Chiens autorisés en laisse. Vérifier règlement local." },

  { match: ["réserve naturelle", "reserve naturelle", "nature reserve"],
    category: "outdoor", subcategory: "réserve naturelle",
    leash: true, dogs: true,
    description: "Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local." },

  // Forêts domaniales (ONF) — chiens autorisés, pas obligatoirement en laisse
  { match: ["forêt domaniale", "foret domaniale", "forêt de protection", "foret de protection", "domaniale"],
    category: "outdoor", subcategory: "forêt domaniale",
    leash: false, dogs: true,
    description: "Forêt domaniale ONF. Chiens autorisés, sous contrôle du maître." },

  // Forêts communales / régionales
  { match: ["forêt communale", "foret communale", "forêt régionale", "foret regionale", "forêt", "foret", "bois"],
    category: "outdoor", subcategory: "forêt",
    leash: false, dogs: true,
    description: "Forêt ouverte au public. Chiens autorisés, sous contrôle du maître." },

  // Natura 2000 — zones écologiques, pas toujours restrictives pour les chiens
  { match: ["zone spéciale de conservation", "zone de protection spéciale", "natura 2000", "zps", "zsc", "sic"],
    category: "outdoor", subcategory: "natura 2000",
    leash: false, dogs: true,
    description: "Zone Natura 2000. Accès libre, chiens sous contrôle. Respecter la faune sauvage." },

  // Conservatoire du Littoral
  { match: ["conservatoire du littoral", "conservatoire littoral", "site du conservatoire"],
    category: "outdoor", subcategory: "conservatoire littoral",
    leash: true, dogs: true,
    description: "Site du Conservatoire du Littoral. Chiens autorisés en laisse hors zones de nidification." },

  // Réserves de biosphère (UNESCO)
  { match: ["réserve de biosphère", "reserve de biosphere", "biosphere reserve"],
    category: "outdoor", subcategory: "réserve biosphère",
    leash: true, dogs: true,
    description: "Réserve de biosphère UNESCO. Accès libre dans les zones tampons et de transition." },

  // Arrêtés de protection de biotope
  { match: ["arrêté de protection de biotope", "arrete de protection de biotope", "apb"],
    category: "outdoor", subcategory: "zone protégée",
    leash: true, dogs: true,
    description: "Zone de protection de biotope. Accès réglementé, chiens en laisse obligatoire." },

  // Parcs et jardins génériques
  { match: ["parc", "jardin", "park", "garden", "base de loisirs", "espace vert"],
    category: "outdoor", subcategory: "parc",
    leash: false, dogs: true,
    description: "Espace naturel ou parc. Chiens généralement autorisés." },
];

// Champs INPN possibles pour le nom (certains datasets varient)
const NAME_FIELDS = ["nom", "NOM", "nom_ap", "NOM_AP", "lib_ap", "LIB_AP", "name", "NAME", "label", "LABEL", "denomination", "DENOMINATION"];
// Champs pour le type
const TYPE_FIELDS = ["typ_ap_lib", "TYP_AP_LIB", "type", "TYPE", "categorie", "CATEGORIE", "nature", "NATURE", "statut", "STATUT", "type_ap", "TYPE_AP"];
// Champs pour le code/ID INPN
const CODE_FIELDS = ["cd_ap", "CD_AP", "code", "CODE", "id_ap", "ID_AP", "identifiant", "IDENTIFIANT", "id", "ID"];
// Champs pour le département
const DEPT_FIELDS = ["dept_ap", "DEPT_AP", "departement", "DEPARTEMENT", "dep", "DEP", "num_dep"];
// Champs pour la région
const REGION_FIELDS = ["reg_ap", "REG_AP", "region", "REGION", "reg", "REG"];
// Champs pour la surface
const SURFACE_FIELDS = ["surf_off", "SURF_OFF", "surface", "SURFACE", "superficie", "SUPERFICIE", "area_ha", "AREA_HA"];
// Champs pour le site web
const URL_FIELDS = ["url", "URL", "website", "WEBSITE", "site_web", "SITE_WEB", "lien", "LIEN"];

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function getField(props, candidates) {
  for (const f of candidates) {
    if (props[f] !== undefined && props[f] !== null && props[f] !== "") return props[f];
  }
  return null;
}

function normalizeStr(s) {
  if (!s) return "";
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents
    .trim();
}

function mapType(typeStr) {
  if (!typeStr) return null;
  const norm = normalizeStr(typeStr);
  for (const mapping of TYPE_MAP) {
    for (const keyword of mapping.match) {
      const normKw = normalizeStr(keyword);
      if (norm.includes(normKw) || normKw.includes(norm)) {
        return mapping;
      }
    }
  }
  return null;
}

// Centroïde approximatif d'un polygon GeoJSON (moyenne des coordonnées du premier anneau)
function polygonCentroid(coords) {
  // coords = tableau de [lng, lat]
  let lngSum = 0, latSum = 0, count = 0;
  for (const [lng, lat] of coords) {
    if (isFinite(lng) && isFinite(lat)) {
      lngSum += lng; latSum += lat; count++;
    }
  }
  return count > 0 ? [lngSum / count, latSum / count] : null;
}

function geometryCentroid(geometry) {
  if (!geometry) return null;
  try {
    if (geometry.type === "Point") {
      return geometry.coordinates;
    }
    if (geometry.type === "Polygon") {
      return polygonCentroid(geometry.coordinates[0]);
    }
    if (geometry.type === "MultiPolygon") {
      // Prendre le plus grand polygone (celui avec le plus de points)
      let best = null, bestCount = 0;
      for (const poly of geometry.coordinates) {
        if (poly[0].length > bestCount) { best = poly[0]; bestCount = poly[0].length; }
      }
      return best ? polygonCentroid(best) : null;
    }
    if (geometry.type === "MultiPoint") {
      return polygonCentroid(geometry.coordinates);
    }
  } catch (e) {}
  return null;
}

function escapeSql(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return val.toString();
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function sqlVal(val) {
  return escapeSql(val);
}

// ─── Lecture du fichier GeoJSON ───────────────────────────────────────────────

function parseGeoJSON(filepath) {
  const raw = fs.readFileSync(filepath, "utf8");
  const data = JSON.parse(raw);

  // Supporte FeatureCollection et simple tableau de features
  let features = [];
  if (data.type === "FeatureCollection") features = data.features || [];
  else if (Array.isArray(data)) features = data;
  else if (data.type === "Feature") features = [data];
  else throw new Error("Format GeoJSON non reconnu. Attendu: FeatureCollection, Feature, ou tableau.");

  console.log(`✅ ${features.length} features trouvées dans le fichier`);
  return features;
}

// ─── Lecture CSV ──────────────────────────────────────────────────────────────
function parseCSV(filepath) {
  const raw = fs.readFileSync(filepath, "utf8");
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error("CSV vide ou invalide");

  // Détection du séparateur (virgule, point-virgule ou tabulation)
  const firstLine = lines[0];
  const sep = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";

  const headers = firstLine.split(sep).map(h => h.replace(/^"|"$/g, "").trim());

  const features = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map(p => p.replace(/^"|"$/g, "").trim());
    if (parts.length < 2) continue;
    const props = {};
    headers.forEach((h, idx) => { props[h] = parts[idx] || null; });

    // Cherche lat/lng dans le CSV
    const latField = ["latitude", "LATITUDE", "lat", "LAT", "y", "Y", "centroid_lat"].find(f => headers.includes(f));
    const lngField = ["longitude", "LONGITUDE", "lng", "LNG", "lon", "LON", "x", "X", "centroid_lng", "centroid_lon"].find(f => headers.includes(f));

    let geometry = null;
    if (latField && lngField && props[latField] && props[lngField]) {
      const lat = parseFloat(props[latField]);
      const lng = parseFloat(props[lngField]);
      if (isFinite(lat) && isFinite(lng)) {
        geometry = { type: "Point", coordinates: [lng, lat] };
      }
    }

    features.push({ type: "Feature", properties: props, geometry });
  }

  console.log(`✅ ${features.length} lignes trouvées dans le CSV`);
  return features;
}

// ─── Génération SQL ───────────────────────────────────────────────────────────

function generateSQL(records) {
  const lines = [];

  lines.push("-- ============================================================");
  lines.push("-- Import INPN / ONF — espaces naturels & forêts de France");
  lines.push(`-- Généré le ${new Date().toISOString().split("T")[0]}`);
  lines.push("-- Coller dans l'éditeur SQL de Supabase et exécuter");
  lines.push("-- ============================================================");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");

  for (const rec of records) {
    // Déduplication : on n'insère pas si un lieu INPN avec ce source_id existe déjà
    // ET on n'insère pas si un lieu est déjà présent à moins de 500m avec un nom similaire
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
    lines.push(`  ${sqlVal(rec.name)},`);
    lines.push(`  ${sqlVal(rec.category)},`);
    lines.push(`  ${sqlVal(rec.subcategory)},`);
    lines.push(`  ${sqlVal(rec.latitude)},`);
    lines.push(`  ${sqlVal(rec.longitude)},`);
    lines.push(`  ${sqlVal(rec.country)},`);
    lines.push(`  ${sqlVal(rec.region)},`);
    lines.push(`  ${sqlVal(rec.department)},`);
    lines.push(`  ${sqlVal(rec.description)},`);
    lines.push(`  ${sqlVal(rec.website)},`);
    lines.push(`  'inpn',`);
    lines.push(`  ${sqlVal(rec.source_id)},`);
    lines.push(`  ${sqlVal(rec.accepts_dogs)},`);
    lines.push(`  FALSE,`); // accepts_cats toujours false pour les espaces naturels
    lines.push(`  ${sqlVal(rec.dogs_on_leash_only)},`);
    lines.push(`  TRUE,`);  // outdoor_seating = TRUE (espace de plein air)
    lines.push(`  FALSE`);  // verified = FALSE (à valider manuellement)
    lines.push("WHERE NOT EXISTS (");
    // Check 1 : même source_id INPN déjà importé
    if (rec.source_id) {
      lines.push(`  SELECT 1 FROM pet_friendly_places`);
      lines.push(`  WHERE source = 'inpn' AND source_id = ${sqlVal(rec.source_id)}`);
    } else {
      // Check 2 : proximité géographique + nom similaire
      const latMin = (rec.latitude - 0.005).toFixed(6);
      const latMax = (rec.latitude + 0.005).toFixed(6);
      const lngMin = (rec.longitude - 0.007).toFixed(6);
      const lngMax = (rec.longitude + 0.007).toFixed(6);
      lines.push(`  SELECT 1 FROM pet_friendly_places`);
      lines.push(`  WHERE latitude BETWEEN ${latMin} AND ${latMax}`);
      lines.push(`    AND longitude BETWEEN ${lngMin} AND ${lngMax}`);
      lines.push(`    AND LOWER(TRIM(name)) = LOWER(TRIM(${sqlVal(rec.name)}))`);
    }
    lines.push(");");
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");
  lines.push(`-- Total lignes traitées : ${records.length}`);

  return lines.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node scripts/import-inpn.js <fichier.geojson|fichier.csv>");
    console.error("\nTéléchargez les données INPN depuis :");
    console.error("  https://www.data.gouv.fr/fr/datasets/espaces-naturels-proteges-en-france/");
    console.error("  https://www.data.gouv.fr/fr/datasets/forets-publiques/");
    process.exit(1);
  }

  const filepath = args[0];
  if (!fs.existsSync(filepath)) {
    console.error(`Fichier introuvable : ${filepath}`);
    process.exit(1);
  }

  const ext = path.extname(filepath).toLowerCase();
  let features;
  try {
    if (ext === ".geojson" || ext === ".json") {
      features = parseGeoJSON(filepath);
    } else if (ext === ".csv") {
      features = parseCSV(filepath);
    } else {
      console.error("Format non supporté. Utilisez .geojson, .json ou .csv");
      process.exit(1);
    }
  } catch (e) {
    console.error("Erreur lors de la lecture du fichier :", e.message);
    process.exit(1);
  }

  // Statistiques des types trouvés
  const typeCounts = {};
  const records = [];
  let skipped = 0;
  let noCoords = 0;
  let unknownType = 0;

  for (const feature of features) {
    const props = feature.properties || {};

    // Nom
    const name = getField(props, NAME_FIELDS);
    if (!name || name.trim() === "") { skipped++; continue; }

    // Type
    const typeRaw = getField(props, TYPE_FIELDS);
    const mapping = mapType(typeRaw);
    if (!mapping) {
      if (typeRaw) {
        unknownType++;
        if (!typeCounts[typeRaw]) typeCounts[typeRaw] = 0;
        typeCounts[typeRaw]++;
      } else {
        skipped++;
      }
      continue;
    }

    // Coordonnées
    const centroid = geometryCentroid(feature.geometry);
    if (!centroid) { noCoords++; continue; }
    const [lng, lat] = centroid;
    if (!isFinite(lat) || !isFinite(lng)) { noCoords++; continue; }
    // France métropolitaine + DOM/TOM bounds approximatifs
    if (lat < -30 || lat > 55 || lng < -70 || lng > 60) { noCoords++; continue; }

    // Métadonnées
    const sourceId = getField(props, CODE_FIELDS);
    const region = getField(props, REGION_FIELDS);
    const department = getField(props, DEPT_FIELDS);
    const website = getField(props, URL_FIELDS);
    const surfaceHa = getField(props, SURFACE_FIELDS);

    let description = mapping.description;
    if (surfaceHa) {
      const ha = parseFloat(surfaceHa);
      if (isFinite(ha) && ha > 0) {
        const display = ha >= 1000 ? `${Math.round(ha / 100) / 10} km²` : `${Math.round(ha)} ha`;
        description += ` Surface : ${display}.`;
      }
    }

    records.push({
      name: name.trim(),
      category: mapping.category,
      subcategory: mapping.subcategory,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      country: "France",
      region: region || null,
      department: department || null,
      description,
      website: website || null,
      source_id: sourceId || null,
      accepts_dogs: mapping.dogs,
      dogs_on_leash_only: mapping.leash,
    });
  }

  console.log(`\n📊 Résultats :`);
  console.log(`  ✅ ${records.length} lieux à importer`);
  console.log(`  ⏭️  ${skipped} ignorés (sans nom)`);
  console.log(`  📍 ${noCoords} sans coordonnées valides`);
  if (unknownType > 0) {
    console.log(`  ❓ ${unknownType} types non reconnus :`);
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([t, c]) => {
      console.log(`     "${t}" (${c} fois)`);
    });
    console.log(`  → Si des types importants sont listés ci-dessus, dis-le moi pour les ajouter au mapping.`);
  }

  if (records.length === 0) {
    console.error("\n❌ Aucun lieu à importer. Vérifie le fichier et les champs disponibles.");
    process.exit(1);
  }

  // Répartition par subcategory
  const subCats = {};
  records.forEach(r => { subCats[r.subcategory] = (subCats[r.subcategory] || 0) + 1; });
  console.log("\n📂 Répartition par type :");
  Object.entries(subCats).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
    console.log(`  ${s} : ${c}`);
  });

  // Génération SQL
  const sql = generateSQL(records);
  const outFile = `import_inpn_${new Date().toISOString().split("T")[0]}.sql`;
  fs.writeFileSync(outFile, sql, "utf8");

  console.log(`\n✅ Fichier SQL généré : ${outFile}`);
  console.log(`   → Colle son contenu dans l'éditeur SQL de Supabase et exécute.`);
  console.log(`   → Chaque INSERT vérifie l'absence de doublon avant d'insérer.`);
}

main();
