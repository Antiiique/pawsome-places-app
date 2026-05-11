CREATE OR REPLACE FUNCTION public.validate_user_notification_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN (
    'submission_approved','submission_rejected',
    'report_reviewed','report_dismissed',
    'place_updated','new_review',
    'mention','new_stray','lost_pet','new_place',
    'new_message','zone_alert'
  ) THEN
    RAISE EXCEPTION 'Invalid user notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_place_id   UUID;
  v_place_name TEXT;
  v_admin_id   UUID;
BEGIN
  v_place_id := NEW.place_id;
  SELECT name INTO v_place_name
  FROM public.pet_friendly_places WHERE id = v_place_id;
  FOR v_admin_id IN SELECT id FROM public.profiles WHERE is_admin = TRUE LOOP
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (v_admin_id, 'new_review', '💬 Nouvel avis communauté',
      'Avis posté sur "' || COALESCE(v_place_name, 'un lieu') || '".',
      v_place_id);
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_users_near_place_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_place_id  UUID;
  place_lat   FLOAT;
  place_lng   FLOAT;
  place_name  TEXT;
BEGIN
  v_place_id := NEW.place_id;
  SELECT latitude, longitude, name INTO place_lat, place_lng, place_name
  FROM public.pet_friendly_places WHERE id = v_place_id;
  IF place_lat IS NOT NULL AND place_lng IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    SELECT p.id, 'new_review'::text,
      '💬 Nouvel avis à proximité',
      'Un avis a été posté sur "' || COALESCE(place_name, 'un lieu') || '" près de chez vous.',
      v_place_id
    FROM public.profiles p
    LEFT JOIN public.notification_preferences np ON np.user_id = p.id
    WHERE p.id != NEW.user_id
      AND p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL
      AND COALESCE(np.notif_new_review_on_my_place, true) = true
      AND (2 * 6371 * ASIN(SQRT(
        POWER(SIN(RADIANS((p.location_lat - place_lat) / 2)), 2) +
        COS(RADIANS(place_lat)) * COS(RADIANS(p.location_lat)) *
        POWER(SIN(RADIANS((p.location_lng - place_lng) / 2)), 2)
      ))) <= COALESCE(np.alert_radius_km, p.alert_radius_km, 10);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;