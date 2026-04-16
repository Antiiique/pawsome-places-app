
-- Drop the overly broad SELECT policy and replace with a more specific one
DROP POLICY IF EXISTS "Lecture photos publique storage" ON storage.objects;

-- Allow public read access but only for the place-photos bucket with a path check
CREATE POLICY "Read place photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'place-photos' AND (storage.filename(name) IS NOT NULL));
