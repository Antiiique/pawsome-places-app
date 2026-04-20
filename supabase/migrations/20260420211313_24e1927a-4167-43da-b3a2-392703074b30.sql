-- Étape 1 : supprimer les lieux dont le téléphone n'est pas un numéro français/monégasque valide
DELETE FROM pet_friendly_places
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone NOT SIMILAR TO '\+33%|0033%|0[1-9][0-9]%|\+377%';

-- Étape 2 : supprimer les lieux sans téléphone ni adresse/ville/rue
DELETE FROM pet_friendly_places
WHERE (phone IS NULL OR phone = '')
  AND (address IS NULL OR address = '')
  AND (city IS NULL OR city = '')
  AND (street IS NULL OR street = '');