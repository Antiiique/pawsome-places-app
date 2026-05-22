-- ─────────────────────────────────────────────
-- 1. Table push_subscriptions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  keys        JSONB NOT NULL,  -- { p256dh, auth }
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 2. Trigger : animal perdu → notifs zone
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_zone_lost_pet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r         RECORD;
  dist_km   FLOAT;
BEGIN
  -- Skip if GPS coords not provided
  IF NEW.last_seen_lat IS NULL OR NEW.last_seen_lng IS NULL THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT
      p.id                                     AS user_id,
      p.location_lat,
      p.location_lng,
      COALESCE(p.alert_radius_km, 10)::FLOAT   AS radius_km
    FROM profiles p
    JOIN notification_preferences np ON np.user_id = p.id
    WHERE
      p.location_lat  IS NOT NULL
      AND p.location_lng IS NOT NULL
      AND np.notif_lost_pet_zone = TRUE
      AND p.id <> NEW.user_id  -- ne pas notifier le déclarant
  LOOP
    -- Distance Haversine en km
    dist_km := 6371.0 * 2.0 * ASIN(SQRT(
      POWER(SIN((RADIANS(r.location_lat) - RADIANS(NEW.last_seen_lat)) / 2.0), 2) +
      COS(RADIANS(NEW.last_seen_lat)) * COS(RADIANS(r.location_lat)) *
      POWER(SIN((RADIANS(r.location_lng) - RADIANS(NEW.last_seen_lng)) / 2.0), 2)
    ));

    IF dist_km <= r.radius_km THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_id)
      VALUES (
        r.user_id,
        'lost_pet',
        '🆘 Animal perdu près de vous',
        COALESCE(NEW.pet_name, 'Un animal')
          || ' (' || COALESCE(NEW.species, 'animal') || ')'
          || ' signalé à ' || ROUND(dist_km::NUMERIC, 1) || ' km',
        NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lost_pet_insert ON lost_pets;
CREATE TRIGGER on_lost_pet_insert
  AFTER INSERT ON lost_pets
  FOR EACH ROW EXECUTE FUNCTION notify_zone_lost_pet();

-- ─────────────────────────────────────────────
-- 3. Trigger : animal errant → notifs zone
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_zone_stray()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r         RECORD;
  dist_km   FLOAT;
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT
      p.id                                    AS user_id,
      p.location_lat,
      p.location_lng,
      COALESCE(p.alert_radius_km, 10)::FLOAT  AS radius_km
    FROM profiles p
    JOIN notification_preferences np ON np.user_id = p.id
    WHERE
      p.location_lat IS NOT NULL
      AND p.location_lng IS NOT NULL
      AND np.notif_new_stray_zone = TRUE
      AND p.id <> NEW.user_id
  LOOP
    dist_km := 6371.0 * 2.0 * ASIN(SQRT(
      POWER(SIN((RADIANS(r.location_lat) - RADIANS(NEW.lat)) / 2.0), 2) +
      COS(RADIANS(NEW.lat)) * COS(RADIANS(r.location_lat)) *
      POWER(SIN((RADIANS(r.location_lng) - RADIANS(NEW.lng)) / 2.0), 2)
    ));

    IF dist_km <= r.radius_km THEN
      INSERT INTO user_notifications (user_id, type, title, message, related_id)
      VALUES (
        r.user_id,
        'new_stray',
        '🚨 Animal errant près de vous',
        COALESCE(NEW.species, 'Animal') || ' signalé à '
          || ROUND(dist_km::NUMERIC, 1) || ' km'
          || COALESCE(' — ' || NEW.city, ''),
        NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_stray_insert ON stray_reports;
CREATE TRIGGER on_stray_insert
  AFTER INSERT ON stray_reports
  FOR EACH ROW EXECUTE FUNCTION notify_zone_stray();
