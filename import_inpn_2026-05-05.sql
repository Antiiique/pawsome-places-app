-- ============================================================
-- Import espaces naturels France (INPN / data.gouv.fr / ONF)
-- Généré le 2026-05-05
-- ============================================================

BEGIN;

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national du Mercantour CT (coeur terrestre)',
  'outdoor',
  'parc national',
  44.174361,
  7.084381,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 44.165361 AND 44.183361
    AND longitude BETWEEN 7.072381 AND 7.096381
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national du Mercantour CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Calanques AMA (aire maritime adjacente)',
  'outdoor',
  'parc national',
  43.213147,
  5.516377,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 43.204147 AND 43.222147
    AND longitude BETWEEN 5.504377 AND 5.528377
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Calanques AMA (aire maritime adjacente)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Calanques CM (coeur marin)',
  'outdoor',
  'parc national',
  43.202507,
  5.450158,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 43.193507 AND 43.211507
    AND longitude BETWEEN 5.438158 AND 5.462158
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Calanques CM (coeur marin)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Calanques CT (coeur terrestre)',
  'outdoor',
  'parc national',
  43.222695,
  5.438626,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 43.213695 AND 43.231695
    AND longitude BETWEEN 5.426626 AND 5.450626
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Calanques CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Calanques AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  43.227763,
  5.552562,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 43.218763 AND 43.236763
    AND longitude BETWEEN 5.540562 AND 5.564562
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Calanques AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc amazonien de Guyane AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  2.946399,
  -52.543626,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 2.937399 AND 2.955399
    AND longitude BETWEEN -52.555626 AND -52.531626
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc amazonien de Guyane AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc amazonien de Guyane CT (coeur terrestre)',
  'outdoor',
  'parc national',
  3.043926,
  -53.076412,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 3.034926 AND 3.052926
    AND longitude BETWEEN -53.088412 AND -53.064412
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc amazonien de Guyane CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de la Guadeloupe AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  16.172533,
  -61.700289,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 16.163533 AND 16.181533
    AND longitude BETWEEN -61.712289 AND -61.688289
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de la Guadeloupe AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de la Guadeloupe AMA (aire maritime adjacente)',
  'outdoor',
  'parc national',
  16.310594,
  -61.659131,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 16.301594 AND 16.319594
    AND longitude BETWEEN -61.671131 AND -61.647131
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de la Guadeloupe AMA (aire maritime adjacente)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de la Guadeloupe CM (coeur marin)',
  'outdoor',
  'parc national',
  16.298138,
  -61.639509,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 16.289138 AND 16.307138
    AND longitude BETWEEN -61.651509 AND -61.627509
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de la Guadeloupe CM (coeur marin)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de Port-Cros AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  43.188722,
  6.624739,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 43.179722 AND 43.197722
    AND longitude BETWEEN 6.612739 AND 6.636739
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de Port-Cros AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de Port-Cros CM (coeur marin)',
  'outdoor',
  'parc national',
  43.001619,
  6.206857,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 42.992619 AND 43.010619
    AND longitude BETWEEN 6.194857 AND 6.218857
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de Port-Cros CM (coeur marin)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de Port-Cros CT (coeur terrestre)',
  'outdoor',
  'parc national',
  43.001504,
  6.206182,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 42.992504 AND 43.010504
    AND longitude BETWEEN 6.194182 AND 6.218182
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de Port-Cros CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de Port-Cros AMA (aire maritime adjacente)',
  'outdoor',
  'parc national',
  43.126933,
  6.382367,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 43.117933 AND 43.135933
    AND longitude BETWEEN 6.370367 AND 6.394367
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de Port-Cros AMA (aire maritime adjacente)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national du Mercantour AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  44.10815,
  7.058711,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 44.099150 AND 44.117150
    AND longitude BETWEEN 7.046711 AND 7.070711
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national du Mercantour AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de la Vanoise CT (coeur terrestre)',
  'outdoor',
  'parc national',
  45.374633,
  6.842717,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 45.365633 AND 45.383633
    AND longitude BETWEEN 6.830717 AND 6.854717
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de la Vanoise CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de la Vanoise AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  45.34613,
  6.531401,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 45.337130 AND 45.355130
    AND longitude BETWEEN 6.519401 AND 6.543401
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de la Vanoise AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de forêts CT (coeur terrestre)',
  'outdoor',
  'parc national',
  47.821978,
  4.928502,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 47.812978 AND 47.830978
    AND longitude BETWEEN 4.916502 AND 4.940502
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de forêts CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de forêts AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  47.814155,
  4.915301,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 47.805155 AND 47.823155
    AND longitude BETWEEN 4.903301 AND 4.927301
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de forêts AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Cévennes CT (coeur terrestre)',
  'outdoor',
  'parc national',
  44.256398,
  3.633806,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 44.247398 AND 44.265398
    AND longitude BETWEEN 3.621806 AND 3.645806
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Cévennes CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Ecrins AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  44.797648,
  6.303802,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 44.788648 AND 44.806648
    AND longitude BETWEEN 6.291802 AND 6.315802
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Ecrins AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Ecrins CT (coeur terrestre)',
  'outdoor',
  'parc national',
  44.85469,
  6.280413,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 44.845690 AND 44.863690
    AND longitude BETWEEN 6.268413 AND 6.292413
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Ecrins CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de La Réunion AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  -21.00009,
  55.533674,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN -21.009090 AND -20.991090
    AND longitude BETWEEN 55.521674 AND 55.545674
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de La Réunion AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de La Réunion CT (coeur terrestre)',
  'outdoor',
  'parc national',
  -21.123292,
  55.530225,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN -21.132292 AND -21.114292
    AND longitude BETWEEN 55.518225 AND 55.542225
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de La Réunion CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national de la Guadeloupe CT (coeur terrestre)',
  'outdoor',
  'parc national',
  16.086802,
  -61.68295,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 16.077802 AND 16.095802
    AND longitude BETWEEN -61.694950 AND -61.670950
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national de la Guadeloupe CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Cévennes AA (aire d''adhésion)',
  'outdoor',
  'parc national',
  44.269325,
  3.841333,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 44.260325 AND 44.278325
    AND longitude BETWEEN 3.829333 AND 3.853333
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Cévennes AA (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Pyrénées (aire d''adhésion)',
  'outdoor',
  'parc national',
  42.924769,
  -0.085858,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 42.915769 AND 42.933769
    AND longitude BETWEEN -0.097858 AND -0.073858
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Pyrénées (aire d''adhésion)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc national des Pyrénées CT (coeur terrestre)',
  'outdoor',
  'parc national',
  42.799041,
  -0.239828,
  'France',
  NULL,
  NULL,
  'Parc national. Chiens autorisés en zone périphérique en laisse. Interdits en zone centrale.',
  NULL,
  'inpn',
  NULL,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    latitude  BETWEEN 42.790041 AND 42.808041
    AND longitude BETWEEN -0.251828 AND -0.227828
    AND LOWER(TRIM(name)) = LOWER(TRIM('Parc national des Pyrénées CT (coeur terrestre)'))
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de Camargue',
  'outdoor',
  'parc naturel régional',
  43.45192,
  4.582245,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'http://www.parc-camargue.fr/',
  'inpn',
  'Q1570460',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1570460'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de Corse',
  'outdoor',
  'parc naturel régional',
  42.218,
  8.941787,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr.corsica/',
  'inpn',
  'Q2385782',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2385782'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Vexin Français',
  'outdoor',
  'parc naturel régional',
  49.114593,
  1.873088,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'http://www.pnr-vexin-francais.fr/',
  'inpn',
  'Q3364648',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364648'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Alpilles',
  'outdoor',
  'parc naturel régional',
  43.753412,
  4.863331,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-alpilles.fr/',
  'inpn',
  'Q1516356',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1516356'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Gâtinais français',
  'outdoor',
  'parc naturel régional',
  48.398554,
  2.408044,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-gatinais-francais.fr/',
  'inpn',
  'Q3364632',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364632'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Queyras',
  'outdoor',
  'parc naturel régional',
  44.70967,
  6.864876,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-queyras.fr/',
  'inpn',
  'Q3364641',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364641'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de Brière',
  'outdoor',
  'parc naturel régional',
  47.436643,
  -2.300384,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-briere.com/',
  'inpn',
  'Q691480',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q691480'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Ballons des Vosges',
  'outdoor',
  'parc naturel régional',
  47.931334,
  6.810118,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-ballons-vosges.fr/',
  'inpn',
  'Q2376227',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2376227'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Verdon',
  'outdoor',
  'parc naturel régional',
  43.817866,
  6.323927,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'http://parcduverdon.fr/',
  'inpn',
  'Q1690573',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1690573'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de la Sainte-Baume',
  'outdoor',
  'parc naturel régional',
  43.306863,
  5.892363,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-saintebaume.fr/',
  'inpn',
  'Q49119210',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q49119210'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Corbières-Fenouillèdes',
  'outdoor',
  'parc naturel régional',
  42.91788,
  2.448593,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc.corbieres-fenouilledes.fr/',
  'inpn',
  'Q108539989',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q108539989'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de la Narbonnaise en Méditerranée',
  'outdoor',
  'parc naturel régional',
  43.035893,
  3.036332,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-narbonnaise.fr/',
  'inpn',
  'Q2138337',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2138337'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de Millevaches en Limousin',
  'outdoor',
  'parc naturel régional',
  45.686379,
  2.033372,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-millevaches.fr/',
  'inpn',
  '193411',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = '193411'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Haut-Languedoc',
  'outdoor',
  'parc naturel régional',
  43.577289,
  2.501492,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-haut-languedoc.fr/',
  'inpn',
  'Q3364639',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364639'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Grands Causses',
  'outdoor',
  'parc naturel régional',
  44.086318,
  3.006625,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-grands-causses.fr/',
  'inpn',
  'Q2685564',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2685564'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de la Forêt d''Orient',
  'outdoor',
  'parc naturel régional',
  48.308536,
  4.427862,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-foret-orient.fr/',
  'inpn',
  'Q1380450',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1380450'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de la Montagne de Reims',
  'outdoor',
  'parc naturel régional',
  49.130578,
  3.930724,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-montagnedereims.fr/',
  'inpn',
  'Q661361',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q661361'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Landes de Gascogne',
  'outdoor',
  'parc naturel régional',
  44.325891,
  -0.459225,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-landes-de-gascogne.fr/',
  'inpn',
  'Q780321',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q780321'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Pilat',
  'outdoor',
  'parc naturel régional',
  45.3941,
  4.562851,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-pilat.fr/',
  'inpn',
  'Q3364643',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364643'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Volcans d''Auvergne',
  'outdoor',
  'parc naturel régional',
  45.379405,
  2.84464,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parcdesvolcans.fr/',
  'inpn',
  'Q2138367',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2138367'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Massif des Bauges',
  'outdoor',
  'parc naturel régional',
  45.674848,
  6.1198,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parcdesbauges.com/',
  'inpn',
  'Q3123538',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3123538'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Pyrénées catalanes',
  'outdoor',
  'parc naturel régional',
  42.546629,
  2.094048,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-pyrenees-catalanes.fr/',
  'inpn',
  'Q1570794',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1570794'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Vallée de la Rance - Côte d''Émeraude',
  'outdoor',
  'parc naturel régional',
  48.539312,
  -2.084609,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  NULL,
  'inpn',
  'Q69867486',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q69867486'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de l''Aubrac',
  'outdoor',
  'parc naturel régional',
  44.63502,
  3.02431,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-aubrac.fr/',
  'inpn',
  'Q54561886',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q54561886'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Monts d''Ardèche',
  'outdoor',
  'parc naturel régional',
  44.810742,
  4.253517,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-monts-ardeche.fr/',
  'inpn',
  'Q1421234',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1421234'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Mont-Ventoux',
  'outdoor',
  'parc naturel régional',
  44.118941,
  5.158315,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parcduventoux.fr/',
  'inpn',
  'Q97391055',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q97391055'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Oise-Pays de France',
  'outdoor',
  'parc naturel régional',
  49.194345,
  2.594129,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-oise-paysdefrance.fr/',
  'inpn',
  'Q3364617',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364617'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Vercors',
  'outdoor',
  'parc naturel régional',
  44.943993,
  5.428231,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'http://www.parc-du-vercors.fr/',
  'inpn',
  'Q3364644',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364644'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Causses du Quercy',
  'outdoor',
  'parc naturel régional',
  44.539097,
  1.672885,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-causses-du-quercy.fr/',
  'inpn',
  'Q2323358',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2323358'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Normandie-Maine',
  'outdoor',
  'parc naturel régional',
  48.495876,
  -0.306711,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-normandie-maine.fr/',
  'inpn',
  'Q3364618',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364618'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Vosges du Nord',
  'outdoor',
  'parc naturel régional',
  48.943463,
  7.512278,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-vosges-nord.fr/',
  'inpn',
  'Q1517395',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1517395'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Caps et marais d''Opale',
  'outdoor',
  'parc naturel régional',
  50.778104,
  1.940431,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-opale.fr/',
  'inpn',
  'Q3364628',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364628'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Médoc',
  'outdoor',
  'parc naturel régional',
  45.253363,
  -0.830132,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-medoc.fr/',
  'inpn',
  'Q64174288',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q64174288'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Perche',
  'outdoor',
  'parc naturel régional',
  48.423358,
  0.713587,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-perche.fr/',
  'inpn',
  'Q746489',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q746489'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Marais poitevin',
  'outdoor',
  'parc naturel régional',
  46.394824,
  -1.015368,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-marais-poitevin.fr/',
  'inpn',
  'Q3364387',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364387'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Marais du Cotentin et du Bessin',
  'outdoor',
  'parc naturel régional',
  49.314757,
  -1.319181,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://parc-cotentin-bessin.fr/',
  'inpn',
  'Q2138341',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2138341'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Livradois-Forez',
  'outdoor',
  'parc naturel régional',
  45.49157,
  3.713645,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-livradois-forez.org/',
  'inpn',
  'Q911925',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q911925'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Baronnies provençales',
  'outdoor',
  'parc naturel régional',
  44.357767,
  5.443014,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.baronnies-provencales.fr/',
  'inpn',
  'Q19407172',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q19407172'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de la Brenne',
  'outdoor',
  'parc naturel régional',
  46.623831,
  1.258993,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-brenne.fr/',
  'inpn',
  'Q1304427',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1304427'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional d''Armorique',
  'outdoor',
  'parc naturel régional',
  48.365385,
  -4.025845,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-armorique.fr/',
  'inpn',
  'Q1343332',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1343332'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de Lorraine',
  'outdoor',
  'parc naturel régional',
  48.80175,
  6.770931,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-lorraine.com/',
  'inpn',
  'Q1397893',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1397893'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de Chartreuse',
  'outdoor',
  'parc naturel régional',
  45.456605,
  5.77598,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-chartreuse.net/',
  'inpn',
  'Q3364619',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364619'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Ardennes',
  'outdoor',
  'parc naturel régional',
  49.918894,
  4.557057,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-ardennes.fr/',
  'inpn',
  'Q3364626',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364626'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Golfe du Morbihan',
  'outdoor',
  'parc naturel régional',
  47.589375,
  -2.749158,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-golfe-morbihan.bzh/',
  'inpn',
  'Q18173441',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q18173441'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Morvan',
  'outdoor',
  'parc naturel régional',
  47.111346,
  4.07238,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parcdumorvan.org/',
  'inpn',
  'Q2138345',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2138345'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Luberon',
  'outdoor',
  'parc naturel régional',
  43.948055,
  5.596413,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parcduluberon.fr/',
  'inpn',
  'Q2138343',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2138343'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de l''Avesnois',
  'outdoor',
  'parc naturel régional',
  50.146609,
  3.934827,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-avesnois.fr',
  'inpn',
  'Q3364624',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364624'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Boucles de la Seine Normande',
  'outdoor',
  'parc naturel régional',
  49.432806,
  0.666137,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-seine-normande.com/',
  'inpn',
  'Q977363',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q977363'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Pyrénées ariégeoises',
  'outdoor',
  'parc naturel régional',
  42.939118,
  1.262917,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-pyrenees-ariegeoises.fr/',
  'inpn',
  'Q2138364',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q2138364'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Doubs Horloger',
  'outdoor',
  'parc naturel régional',
  47.207196,
  6.710636,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'http://www.pays-horloger.fr/',
  'inpn',
  'Q86072426',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q86072426'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Loire-Anjou-Touraine',
  'outdoor',
  'parc naturel régional',
  47.236799,
  0.049855,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-loire-anjou-touraine.fr/',
  'inpn',
  'Q1531999',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1531999'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional des Préalpes d''Azur',
  'outdoor',
  'parc naturel régional',
  43.787682,
  6.878134,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-prealpesdazur.fr/',
  'inpn',
  'Q3364630',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364630'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Périgord-Limousin',
  'outdoor',
  'parc naturel régional',
  45.595247,
  0.800802,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.pnr-perigord-limousin.fr/',
  'inpn',
  'Q850607',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q850607'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional du Haut-Jura',
  'outdoor',
  'parc naturel régional',
  46.345281,
  5.893166,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-haut-jura.fr/',
  'inpn',
  'Q3364633',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364633'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional de la Haute Vallée de Chevreuse',
  'outdoor',
  'parc naturel régional',
  48.681217,
  1.936414,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.parc-naturel-chevreuse.fr',
  'inpn',
  'Q3364627',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q3364627'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Baie de Somme Picardie Maritime',
  'outdoor',
  'parc naturel régional',
  50.208165,
  1.697049,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'https://www.baiedesomme3vallees.fr/',
  'inpn',
  'Q66803124',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q66803124'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Parc naturel régional Scarpe-Escaut',
  'outdoor',
  'parc naturel régional',
  50.423301,
  3.383573,
  'France',
  NULL,
  NULL,
  'Parc naturel régional. Chiens autorisés en laisse sur les sentiers balisés.',
  'http://pnr-scarpe-escaut.fr/',
  'inpn',
  'Q1584372',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'Q1584372'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Combe Chaude',
  'outdoor',
  'réserve naturelle',
  43.967109,
  3.721215,
  'France',
  NULL,
  'GARD',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 56 ha.',
  'http://inpn.mnhn.fr/espace/protege/FR9300034',
  'inpn',
  'FR9300034',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300034'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Sainte Lucie',
  'outdoor',
  'réserve naturelle',
  43.04556,
  3.058991,
  'France',
  NULL,
  'AUDE',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 825 ha.',
  'http://inpn.mnhn.fr/espace/protege/FR9300036',
  'inpn',
  'FR9300036',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300036'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Mahistre et Musette',
  'outdoor',
  'réserve naturelle',
  43.599674,
  4.232995,
  'France',
  NULL,
  'GARD',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 261 ha.',
  'http://inpn.mnhn.fr/espace/protege/FR9300137',
  'inpn',
  'FR9300137',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300137'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Coteaux du Fel',
  'outdoor',
  'réserve naturelle',
  44.656445,
  2.522074,
  'France',
  NULL,
  'AVEYRON',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 81 ha.',
  'http://inpn.mnhn.fr/espace/protege/FR9300094',
  'inpn',
  'FR9300094',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300094'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Cambounet-sur-le-Sor',
  'outdoor',
  'réserve naturelle',
  43.583324,
  2.134903,
  'France',
  NULL,
  'TARN',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 31 ha.',
  'http://inpn.mnhn.fr/espace/protege/FR9300131',
  'inpn',
  'FR9300131',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300131'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Confluence Garonne Ariège',
  'outdoor',
  'réserve naturelle',
  43.509495,
  1.4203,
  'France',
  NULL,
  'HAUTE-GARONNE',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 587 ha.',
  'https://inpn.mnhn.fr/espace/protege/FR9300162',
  'inpn',
  'FR9300162',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300162'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Nyer',
  'outdoor',
  'réserve naturelle',
  42.49229,
  2.275997,
  'France',
  NULL,
  'PYRENEES-ORIENTALES',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 2.2 km².',
  'http://inpn.mnhn.fr/espace/protege/FR9300035',
  'inpn',
  'FR9300035',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300035'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Massif de Saint-Barthélemy',
  'outdoor',
  'réserve naturelle',
  42.836378,
  1.850931,
  'France',
  NULL,
  'ARIEGE',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 461 ha.',
  'https://inpn.mnhn.fr/espace/protege/FR9300160',
  'inpn',
  'FR9300160',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300160'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Scamandre',
  'outdoor',
  'réserve naturelle',
  43.611349,
  4.340147,
  'France',
  NULL,
  'GARD',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 147 ha.',
  'http://inpn.mnhn.fr/espace/protege/FR9300033',
  'inpn',
  'FR9300033',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300033'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Marais de Bonnefont',
  'outdoor',
  'réserve naturelle',
  44.819452,
  1.794709,
  'France',
  NULL,
  'LOT',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 42 ha.',
  'http://inpn.mnhn.fr/espace/protege/FR9300095',
  'inpn',
  'FR9300095',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300095'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Gorges du Gardon',
  'outdoor',
  'réserve naturelle',
  43.940868,
  4.412135,
  'France',
  NULL,
  'GARD',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 491 ha.',
  'http://inpn.mnhn.fr/espace/protege/FR9300037',
  'inpn',
  'FR9300037',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300037'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Aulon',
  'outdoor',
  'réserve naturelle',
  42.858166,
  0.244079,
  'France',
  NULL,
  'HAUTES-PYRENEES',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 1.2 km².',
  'http://inpn.mnhn.fr/espace/protege/FR9300093',
  'inpn',
  'FR9300093',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300093'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Massif du Pibeste-Aoulhet',
  'outdoor',
  'réserve naturelle',
  43.057428,
  -0.140353,
  'France',
  NULL,
  'HAUTES-PYRENEES',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 5.1 km².',
  'http://inpn.mnhn.fr/espace/protege/FR9300101',
  'inpn',
  'FR9300101',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300101'
);

INSERT INTO pet_friendly_places (
  name, category, subcategory,
  latitude, longitude,
  country, region, department,
  description, website,
  source, source_id,
  accepts_dogs, accepts_cats, dogs_on_leash_only,
  outdoor_seating, verified
)
SELECT
  'Massif du Montious',
  'outdoor',
  'réserve naturelle',
  42.86627,
  0.440027,
  'France',
  NULL,
  'HAUTES-PYRENEES',
  'Réserve naturelle. Chiens autorisés en laisse. Vérifier règlement local. Surface : 739 ha.',
  'https://inpn.mnhn.fr/espace/protege/FR9300191',
  'inpn',
  'FR9300191',
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM pet_friendly_places WHERE
    source = 'inpn' AND source_id = 'FR9300191'
);

COMMIT;

-- Total enregistrements traités : 99