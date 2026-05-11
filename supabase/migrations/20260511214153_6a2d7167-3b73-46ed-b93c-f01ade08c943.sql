-- 1. Types valides
CREATE OR REPLACE FUNCTION public.validate_user_notification_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN (
    'submission_approved', 'submission_rejected',
    'report_reviewed',     'report_dismissed',
    'place_updated',       'new_review',
    'mention',             'new_stray',
    'lost_pet',            'new_place',
    'new_message',         'zone_alert'
  ) THEN
    RAISE EXCEPTION 'Invalid user notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. notify_admins_new_review
DROP TRIGGER IF EXISTS trg_notify_admins_new_review ON public.place_reviews;

CREATE OR REPLACE FUNCTION public.notify_admins_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_place_name TEXT;
  v_place_id   UUID;
  v_admin_id   UUID;
BEGIN
  BEGIN
    v_place_id := NEW.place_id;
    SELECT name INTO v_place_name
    FROM public.pet_friendly_places
    WHERE id = v_place_id;
    FOR v_admin_id IN
      SELECT id FROM public.profiles WHERE is_admin = TRUE
    LOOP
      INSERT INTO public.user_notifications
        (user_id, type, title, message, related_id)
      VALUES (
        v_admin_id,
        'new_review',
        '💬 Nouvel avis communauté',
        'Avis posté sur "' || COALESCE(v_place_name, 'un lieu') || '".',
        v_place_id
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_new_review
  AFTER INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_review();

-- 3. notify_users_near_place_on_review
CREATE OR REPLACE FUNCTION public.notify_users_near_place_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  place_lat   FLOAT;
  place_lng   FLOAT;
  place_name  TEXT;
BEGIN
  BEGIN
    SELECT latitude, longitude, name
    INTO place_lat, place_lng, place_name
    FROM public.pet_friendly_places
    WHERE id = NEW.place_id;
    IF place_lat IS NULL OR place_lng IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    SELECT
      p.id,
      'new_review'::text,
      '💬 Nouvel avis à proximité',
      'Un avis a été posté sur "' || COALESCE(place_name, 'un lieu') || '" près de chez vous.',
      NEW.place_id::uuid
    FROM public.profiles p
    LEFT JOIN public.notification_preferences np ON np.user_id = p.id
    WHERE
      p.id != NEW.user_id
      AND p.location_lat IS NOT NULL
      AND p.location_lng IS NOT NULL
      AND COALESCE(np.notif_new_review_on_my_place, true) = true
      AND (
        2 * 6371 * ASIN(SQRT(
          POWER(SIN(RADIANS((p.location_lat - place_lat) / 2)), 2) +
          COS(RADIANS(place_lat)) * COS(RADIANS(p.location_lat)) *
          POWER(SIN(RADIANS((p.location_lng - place_lng) / 2)), 2)
        ))
      ) <= COALESCE(np.alert_radius_km, p.alert_radius_km, 10);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_users_near_place_on_review ON public.place_reviews;
CREATE TRIGGER trg_notify_users_near_place_on_review
  AFTER INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_users_near_place_on_review();