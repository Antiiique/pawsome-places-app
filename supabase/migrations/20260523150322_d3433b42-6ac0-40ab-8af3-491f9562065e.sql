
-- 1) Restrict sensitive columns on profiles from anon and cross-user reads
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_url, city, bio, points, created_at, is_admin, streak_current, streak_max) ON public.profiles TO anon;

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, avatar_url, city, bio, points, created_at, is_admin, streak_current, streak_max, age, postal_code, location_lat, location_lng, alert_radius_km, last_seen_at, streak_last_date, streak_shield_available, streak_shield_used_at, email, is_banned) ON public.profiles TO authenticated;

-- 2) Prevent privilege escalation via UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Modifier son propre profil" ON public.profiles;
CREATE POLICY "Modifier son propre profil" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_admin  = (SELECT p.is_admin  FROM public.profiles p WHERE p.id = auth.uid())
  AND is_banned = (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.uid())
);

-- 3) Storage DELETE policy for users' own place-photos
DROP POLICY IF EXISTS "Users delete own place photos" ON storage.objects;
CREATE POLICY "Users delete own place photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'place-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own place photos" ON storage.objects;
CREATE POLICY "Users update own place photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'place-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Tighten realtime topic policy: drop wildcard public:% access
DROP POLICY IF EXISTS "Users subscribe to own topic" ON realtime.messages;
CREATE POLICY "Users subscribe to own topic" ON realtime.messages
FOR SELECT TO authenticated
USING (
  realtime.topic() = (auth.uid())::text
  OR extension = 'postgres_changes'
);

-- 5) Fix function search_path
ALTER FUNCTION public.handle_user_action(uuid)   SET search_path = public;
ALTER FUNCTION public.notify_zone_lost_pet()     SET search_path = public;
