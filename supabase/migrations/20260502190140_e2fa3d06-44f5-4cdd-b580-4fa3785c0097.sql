DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read review photos') THEN
    CREATE POLICY "Public read review photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'review-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Auth users can upload review photos') THEN
    CREATE POLICY "Auth users can upload review photos"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'review-photos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;