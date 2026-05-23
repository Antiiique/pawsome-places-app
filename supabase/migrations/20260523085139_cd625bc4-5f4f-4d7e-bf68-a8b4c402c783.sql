
-- 1. Profiles: revoke sensitive columns from anon role
REVOKE SELECT (email, location_lat, location_lng, alert_radius_km, last_seen_at, is_banned) ON public.profiles FROM anon;

-- 2. submission_photos: revoke internal metadata from anon
REVOKE SELECT (storage_path, uploaded_by) ON public.submission_photos FROM anon;

-- 3. Storage policies: enforce folder ownership
DROP POLICY IF EXISTS "Upload photos si connecté" ON storage.objects;
CREATE POLICY "Upload place-photos own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'place-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Auth users can upload review photos" ON storage.objects;
CREATE POLICY "Upload review-photos own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own review photos" ON storage.objects;
CREATE POLICY "Delete review-photos own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Realtime: restrict channel subscriptions to own user topic
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users subscribe to own topic" ON realtime.messages;
CREATE POLICY "Users subscribe to own topic" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = auth.uid()::text
    OR realtime.topic() LIKE 'public:%'
    OR extension = 'postgres_changes'
  );

-- 5. Fix mutable search_path on functions
ALTER FUNCTION public.haversine_km(double precision, double precision, double precision, double precision) SET search_path = public;
ALTER FUNCTION public.trg_action_on_stray() SET search_path = public;
ALTER FUNCTION public.trg_action_on_review() SET search_path = public;
ALTER FUNCTION public.trg_action_on_submission() SET search_path = public;
ALTER FUNCTION public.trg_action_on_lost_pet() SET search_path = public;
ALTER FUNCTION public.notify_zone_stray() SET search_path = public;
ALTER FUNCTION public.notify_users_in_zone() SET search_path = public;
ALTER FUNCTION public.award_points_on_approval() SET search_path = public;
ALTER FUNCTION public.notify_admins_on_event() SET search_path = public;
ALTER FUNCTION public.notify_nearby_users_stray(uuid) SET search_path = public;
ALTER FUNCTION public.notify_admins_profile_complete() SET search_path = public;
ALTER FUNCTION public.notify_nearby_users_new_place(uuid) SET search_path = public;
