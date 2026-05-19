-- Nuclear fix: drop EVERY trigger on stray_reports and lost_pets except the
-- known-safe rate-limit and updated_at triggers, then recreate clean notify triggers.
--
-- Root cause: trg_sync_location (or similar) was added in Supabase dashboard on
-- these tables. sync_location_column() references NEW.latitude / NEW.longitude,
-- which do not exist on stray_reports (uses lat/lng) or lost_pets (uses
-- last_seen_lat/last_seen_lng), causing "record 'new' has no field 'latitude'".

-- ── 1. Drop every non-system trigger on stray_reports except rate-limit ────────
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.stray_reports'::regclass
      AND NOT tgisinternal
      AND tgname NOT IN ('trg_stray_rate_limit')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.stray_reports', t.tgname);
  END LOOP;
END;
$$;

-- ── 2. Drop every non-system trigger on lost_pets except rate-limit / updated_at
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.lost_pets'::regclass
      AND NOT tgisinternal
      AND tgname NOT IN ('trg_lost_pet_rate_limit', 'lost_pets_set_updated_at')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.lost_pets', t.tgname);
  END LOOP;
END;
$$;

-- ── 3. Recreate notify_admins_on_event (no latitude references for stray/lost) ──
CREATE OR REPLACE FUNCTION public.notify_admins_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    -- stray_reports uses lat/lng, city, species — NOT latitude/longitude
    notif_message    := COALESCE(NEW.species, 'Animal')
                     || COALESCE(' · ' || NEW.city, '')
                     || COALESCE(' — ' || LEFT(NEW.description, 80), '');
    notif_related_id := NEW.id;

  ELSIF TG_TABLE_NAME = 'lost_pets' THEN
    notif_type       := 'lost_pet';
    notif_title      := '🆘 Animal perdu signalé';
    -- lost_pets uses last_seen_lat/last_seen_lng — NOT latitude/longitude
    notif_message    := COALESCE(NEW.pet_name, 'Animal')
                     || ' (' || COALESCE(NEW.species, '?') || ')'
                     || COALESCE(' — ' || NEW.last_seen_address, '');
    notif_related_id := NEW.id;

  ELSIF TG_TABLE_NAME = 'place_submissions' THEN
    notif_type       := 'new_place';
    notif_title      := '📍 Nouveau lieu soumis';
    notif_message    := COALESCE(NEW.name, 'Sans nom')
                     || COALESCE(' · ' || NEW.category, '')
                     || COALESCE(' — ' || NEW.city, '');
    notif_related_id := NEW.id;

  ELSIF TG_TABLE_NAME = 'place_reviews' THEN
    notif_type       := 'new_review';
    notif_title      := '💬 Nouvel avis posté';
    notif_message    := NEW.rating || '/5 ⭐'
                     || COALESCE(' — ' || LEFT(NEW.body, 80), '');
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

-- ── 4. Recreate notify_nearby_users_stray as plain RPC (never a trigger) ───────
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
  -- Uses lat/lng — the actual columns in stray_reports
  SELECT lat, lng, city, species
  INTO stray_lat, stray_lng, stray_city, stray_spec
  FROM public.stray_reports
  WHERE id = p_stray_id;

  IF stray_lat IS NULL OR stray_lng IS NULL THEN RETURN; END IF;

  INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
  SELECT
    p.id,
    'zone_alert'::text,
    '🚨 Animal errant signalé près de vous',
    COALESCE(stray_spec, 'Un animal') || ' signalé'
      || COALESCE(' à ' || stray_city, '') || '.',
    p_stray_id
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.id
  WHERE
    p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL
    AND (2 * 6371 * ASIN(SQRT(
      POWER(SIN(RADIANS((p.location_lat - stray_lat) / 2)), 2) +
      COS(RADIANS(stray_lat)) * COS(RADIANS(p.location_lat)) *
      POWER(SIN(RADIANS((p.location_lng - stray_lng) / 2)), 2)
    ))) <= COALESCE(np.alert_radius_km, p.alert_radius_km, 10);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- ── 5. Rewire clean AFTER INSERT triggers on both tables ─────────────────────
CREATE TRIGGER trg_notify_admins_stray
  AFTER INSERT ON public.stray_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_event();

CREATE TRIGGER trg_notify_admins_lost_pet
  AFTER INSERT ON public.lost_pets
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_event();
