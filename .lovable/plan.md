## 1. Bug: l'adresse modifiée dans l'admin ne s'affiche pas après enregistrement

**Cause probable :** `saveEdit` (AdminPage.tsx ~L1191) met bien à jour la base et l'état local `places`, mais :
- La fiche affichée sur la carte (PlaceDetailPanel + popup) lit `place.address` depuis un cache local de `MapSection` chargé via le RPC `get_nearby_pet_places`. Tant que la carte n'est pas rechargée (zoom/déplacement), l'ancienne valeur reste affichée.
- Le panneau admin lui-même se met à jour ; le problème est visible côté carte / fiche publique.

**Correctif :**
- Après `saveEdit`, émettre un évènement global `place-updated` (avec l'id et les nouveaux champs).
- Dans `MapSection`, écouter cet évènement : mettre à jour le `places` local et `selectedPlace` si l'id correspond, sans recharger toute la carte.
- Refaire un `select` ciblé sur la base après update pour garantir la cohérence (sécurité).

## 2. Chargement plus rapide des photos et commentaires Google

**Constat actuel :** à chaque clic sur un marqueur, on appelle `fetchGooglePlaceDetails` (si `google_place_id`) ou un `nearbySearch` + `getDetails` (sinon). Aucun cache. Si le `google_place_id` est absent, on paie 2 appels réseau.

**Optimisations à appliquer :**
- **Cache en mémoire** (Map en module-scope dans `MapSection.tsx`) indexé par `google_place_id` ou `lat|lng|name` : si le résultat existe, l'utiliser immédiatement (0 ms).
- **Persistance localStorage** des résultats (clé `petfriendly_gplace_<id>`) avec TTL de 24 h pour rendre les ouvertures suivantes instantanées (même après refresh).
- **Préchargement au survol** du marqueur (`mouseenter` / `touchstart`) : déclenche `fetchGooglePlaceDetails` en arrière-plan ; au clic, le résultat est souvent déjà prêt.
- **Persister `google_place_id` en base** dès qu'on le découvre via `nearbySearch` (le code le fait déjà pour les stations-carburant, à étendre à toutes les catégories) → la 2e ouverture sera 2× plus rapide pour tout le monde.

## 3. Adresses complètes (numéro + rue + ville + code postal)

**Constat :** `extractPlaceResult` ne demande pas l'adresse Google. Le panneau affiche `place.address` qui vient de la base (souvent juste rue + numéro).

**Correctif :**
- Ajouter `formatted_address` et `address_components` aux champs demandés à `getDetails` (Google Places).
- Dans `extractPlaceResult` : construire une adresse complète propre : `numéro rue, code postal ville, pays`.
- Exposer ces champs (`formattedAddress`, `city`, `postcode`, `country`) dans le type `GooglePlaceResult` et `UniversalPlace`.
- Dans `PlaceDetailPanel` et `MarkerPopup` : afficher `googleData.formattedAddress || place.address` pour garantir une adresse complète sur **tous les types de lieux**.
- **Backfill silencieux :** quand on récupère une adresse Google plus complète que celle stockée et que le lieu n'a pas été édité manuellement par un admin, on met à jour `pet_friendly_places` (`address`, `city`, `postcode`, `country`) pour fiabiliser la base au fil des consultations.

## Fichiers impactés

- `src/components/MapSection.tsx` — cache + préchargement + nouveaux champs Google + écoute `place-updated`
- `src/components/PlaceDetailPanel.tsx` — affichage `formattedAddress`
- `src/components/MarkerPopup.tsx` — affichage `formattedAddress`
- `src/pages/AdminPage.tsx` — dispatch `place-updated` après `saveEdit`
- (Optionnel) petite migration : aucune nouvelle colonne nécessaire, les champs `address`, `city`, `postcode`, `country` existent déjà.

## Points à confirmer

1. OK pour mettre à jour automatiquement `address` / `city` / `postcode` en base à partir des données Google (backfill silencieux) ?
2. OK pour cacher les détails Google 24 h en localStorage (préférence rapidité vs fraîcheur des avis) ?
