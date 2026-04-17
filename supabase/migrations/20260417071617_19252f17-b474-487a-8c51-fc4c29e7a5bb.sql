-- Buckets publics pour avatars et photos d'animaux
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-photos', 'pet-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Public read pet-photos" ON storage.objects;
CREATE POLICY "Public read pet-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-photos');

-- Upload : chaque user dans son propre dossier (préfixe = uid)
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users upload own pet photo" ON storage.objects;
CREATE POLICY "Users upload own pet photo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own pet photo" ON storage.objects;
CREATE POLICY "Users update own pet photo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own pet photo" ON storage.objects;
CREATE POLICY "Users delete own pet photo" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);