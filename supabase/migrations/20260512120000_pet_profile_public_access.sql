-- Allow all users (including anonymous) to read pets and pet_photos
-- Needed for public pet profile feature

CREATE POLICY "Lecture publique pets" ON public.pets
  FOR SELECT USING (true);

CREATE POLICY "Lecture publique pet_photos" ON public.pet_photos
  FOR SELECT USING (true);

-- Comments on pet photos
CREATE TABLE public.pet_photo_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID REFERENCES public.pet_photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pet_photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique pet_photo_comments" ON public.pet_photo_comments
  FOR SELECT USING (true);

CREATE POLICY "Users créent commentaires photo" ON public.pet_photo_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users suppriment leurs commentaires photo" ON public.pet_photo_comments
  FOR DELETE USING (auth.uid() = user_id);
