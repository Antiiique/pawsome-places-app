-- Notifie les utilisateurs dont la localisation est proche d'un lieu
-- lorsqu'un autre utilisateur y publie un avis.
-- Rayon utilisé : notification_preferences.alert_radius_km
--   → fallback : profiles.alert_radius_km → 10 km par défaut
-- Préférence contrôlée par : notification_preferences.notif_new_review_on_my_place
--   (NULL = activé par défaut)

CREATE OR REPLACE FUNCTION public.notify_users_near_place_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  place_lat    FLOAT;
  place_lng    FLOAT;
  place_name   TEXT;
  v_place_id   UUID;
BEGIN
  BEGIN
    v_place_id := NEW.place_id;

    -- Coordonnées et nom du lieu commenté
    SELECT latitude, longitude, name
    INTO place_lat, place_lng, place_name
    FROM public.pet_friendly_places
    WHERE id = v_place_id;

    -- Pas de coordonnées → rien à faire
    IF place_lat IS NULL OR place_lng IS NULL THEN
      RETURN NEW;
    END IF;

    -- Insérer une notif pour chaque user proche ayant la préférence activée
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    SELECT
      p.id,
      'new_review'::text,
      '💬 Nouvel avis à proximité',
      'Un avis a été posté sur "' || COALESCE(place_name, 'un lieu') || '" près de chez vous.',
      v_place_id
    FROM public.profiles p
    LEFT JOIN public.notification_preferences np ON np.user_id = p.id
    WHERE
      -- Ne pas notifier le rédacteur de l'avis
      p.id != NEW.user_id
      -- L'utilisateur doit avoir partagé sa localisation
      AND p.location_lat  IS NOT NULL
      AND p.location_lng  IS NOT NULL
      -- Préférence activée (NULL = activé par défaut)
      AND COALESCE(np.notif_new_review_on_my_place, true) = true
      -- Distance haversine ≤ rayon configuré
      AND (
        2 * 6371 * ASIN(SQRT(
          POWER(SIN(RADIANS((p.location_lat - place_lat) / 2)), 2) +
          COS(RADIANS(place_lat)) * COS(RADIANS(p.location_lat)) *
          POWER(SIN(RADIANS((p.location_lng - place_lng) / 2)), 2)
        ))
      ) <= COALESCE(np.alert_radius_km, p.alert_radius_km, 10);

  EXCEPTION WHEN OTHERS THEN
    NULL; -- ne jamais bloquer la sauvegarde d'un avis
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_users_near_place_on_review ON public.place_reviews;
CREATE TRIGGER trg_notify_users_near_place_on_review
  AFTER INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_users_near_place_on_review();
