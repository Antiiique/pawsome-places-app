ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS has_been_edited BOOLEAN DEFAULT FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Review photos public read" ON storage.objects;
CREATE POLICY "Review photos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

DROP POLICY IF EXISTS "Auth users can upload review photos" ON storage.objects;
CREATE POLICY "Auth users can upload review photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users delete own review photos" ON storage.objects;
CREATE POLICY "Users delete own review photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'review-photos' AND auth.uid() IS NOT NULL);