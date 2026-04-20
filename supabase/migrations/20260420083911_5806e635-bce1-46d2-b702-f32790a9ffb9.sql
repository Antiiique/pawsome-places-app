-- 1. Table pets
CREATE TABLE public.pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'dog',
  breed TEXT,
  birth_date DATE,
  sex TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users voient leurs animaux" ON public.pets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users créent leurs animaux" ON public.pets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users modifient leurs animaux" ON public.pets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users suppriment leurs animaux" ON public.pets
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Restructuration pet_photos
DROP TABLE IF EXISTS public.pet_photos;

CREATE TABLE public.pet_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users gèrent leurs pet_photos" ON public.pet_photos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Table review_pets
CREATE TABLE public.review_pets (
  review_id UUID REFERENCES public.place_reviews(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, pet_id)
);

ALTER TABLE public.review_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique review_pets" ON public.review_pets
  FOR SELECT USING (true);

CREATE POLICY "Users gèrent leurs review_pets" ON public.review_pets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.place_reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.place_reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );

-- 4. Buckets Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-avatars', 'pet-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload pet-avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pet-avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Lecture publique pet-avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-avatars');

CREATE POLICY "Delete pet-avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pet-avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Le bucket pet-photos existe déjà, on ajoute juste les policies si manquantes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Upload pet-photos' AND tablename = 'objects') THEN
    CREATE POLICY "Upload pet-photos" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lecture publique pet-photos' AND tablename = 'objects') THEN
    CREATE POLICY "Lecture publique pet-photos" ON storage.objects
      FOR SELECT USING (bucket_id = 'pet-photos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Delete pet-photos' AND tablename = 'objects') THEN
    CREATE POLICY "Delete pet-photos" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'pet-photos' AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;