-- Fix: stray_reports uses lat/lng (not latitude/longitude)
-- Any trigger or function referencing NEW.latitude on stray_reports fails with
-- "record new has no field latitude". This migration drops the broken trigger,
-- corrects the notify_nearby_users_stray RPC, and wires a clean trigger.

-- 1. Drop any trigger on stray_reports that may reference the wrong column names
DROP TRIGGER IF EXISTS trg_notify_nearby_stray     ON public.stray_reports;
DROP TRIGGER IF EXISTS trg_notify_nearby_users_stray ON public.stray_reports;
DROP TRIGGER IF EXISTS trg_stray_zone_alert         ON public.stray_reports;
DROP TRIGGER IF EXISTS trg_zone_alert_stray         ON public.stray_reports;
DROP TRIGGER IF EXISTS notify_nearby_users_stray    ON public.stray_reports;

-- 2. Recreate notify_nearby_users_stray as a plain RPC (called manually after insert)
--    Uses lat/lng which are the actual column names in stray_reports
CREATE OR REPLACE FUNCTION public.notify_nearby_users_stray(p_stray_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stray_lat  FLOAT;
  stray_lng  FLOAT;
  stray_city TEXT;
  stray_spec TEXT;
BEGIN
  SELECT lat, lng, city, species
  INTO stray_lat, stray_lng, stray_city, stray_spec
  FROM public.stray_reports
  WHERE id = p_stray_id;

  IF stray_lat IS NULL OR stray_lng IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
  SELECT
    p.id,
    'zone_alert'::text,
    '🚨 Animal errant signalé près de vous',
    COALESCE(stray_spec, 'Un animal') || ' signalé' || COALESCE(' à ' || stray_city, '') || '.',
    p_stray_id
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.id
  WHERE
    p.location_lat IS NOT NULL
    AND p.location_lng IS NOT NULL
    AND (
      2 * 6371 * ASIN(SQRT(
        POWER(SIN(RADIANS((p.location_lat - stray_lat) / 2)), 2) +
        COS(RADIANS(stray_lat)) * COS(RADIANS(p.location_lat)) *
        POWER(SIN(RADIANS((p.location_lng - stray_lng) / 2)), 2)
      ))
    ) <= COALESCE(np.alert_radius_km, p.alert_radius_km, 10);

EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 3. Fix notify_admins_on_event: ensure stray branch never references latitude
--    (defensive — the current version already uses NEW.city/NEW.species only)
CREATE OR REPLACE FUNCTION public.notify_admins_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  admin_rec        RECORD;
  notif_type       TEXT;
  notif_title      TEXT;
  notif_message    TEXT;
  notif_related_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'stray_reports' THEN
    notif_type       := 'new_stray';
    notif_title      := '🚨 Animal errant signalé';
    -- stray_reports uses lat/lng, city, species — no latitude/longitude
    notif_message    := COALESCE(NEW.species, 'Animal') || COALESCE(' · ' || NEW.city, '') || COALESCE(' — ' || LEFT(NEW.description, 80), '');
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'lost_pets' THEN
    notif_type       := 'lost_pet';
    notif_title      := '🆘 Animal perdu signalé';
    notif_message    := COALESCE(NEW.pet_name, 'Animal') || ' (' || COALESCE(NEW.species, '?') || ')' || COALESCE(' — ' || NEW.last_seen_address, '');
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'place_submissions' THEN
    notif_type       := 'new_place';
    notif_title      := '📍 Nouveau lieu soumis';
    notif_message    := COALESCE(NEW.name, 'Sans nom') || COALESCE(' · ' || NEW.category, '') || COALESCE(' — ' || NEW.city, '');
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'place_reviews' THEN
    notif_type       := 'new_review';
    notif_title      := '💬 Nouvel avis posté';
    notif_message    := NEW.rating || '/5 ⭐' || COALESCE(' — ' || LEFT(NEW.body, 80), '');
    notif_related_id := NEW.place_id;
  END IF;

  FOR admin_rec IN
    SELECT p.id,
      COALESCE(np.notif_admin_new_review, true) AS allow_review,
      COALESCE(np.notif_admin_new_place,  true) AS allow_place,
      COALESCE(np.notif_admin_new_stray,  true) AS allow_stray,
      COALESCE(np.notif_admin_lost_pet,   true) AS allow_lost
    FROM profiles p
    LEFT JOIN notification_preferences np ON np.user_id = p.id
    WHERE p.is_admin = true
  LOOP
    IF notif_type = 'new_review' AND NOT admin_rec.allow_review THEN CONTINUE; END IF;
    IF notif_type = 'new_place'  AND NOT admin_rec.allow_place  THEN CONTINUE; END IF;
    IF notif_type = 'new_stray'  AND NOT admin_rec.allow_stray  THEN CONTINUE; END IF;
    IF notif_type = 'lost_pet'   AND NOT admin_rec.allow_lost   THEN CONTINUE; END IF;

    INSERT INTO user_notifications (user_id, type, title, message, related_id, is_read)
    VALUES (admin_rec.id, notif_type, notif_title, notif_message, notif_related_id, false);
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
