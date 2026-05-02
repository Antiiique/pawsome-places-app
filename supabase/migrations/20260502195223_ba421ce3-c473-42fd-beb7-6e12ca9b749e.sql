-- 1. lost_pets table
CREATE TABLE public.lost_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pet_name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'dog',
  breed TEXT,
  color TEXT,
  size_class TEXT,
  description TEXT,
  last_seen_lat DOUBLE PRECISION NOT NULL,
  last_seen_lng DOUBLE PRECISION NOT NULL,
  last_seen_address TEXT,
  last_seen_city TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contact_phone TEXT,
  reward NUMERIC,
  status TEXT NOT NULL DEFAULT 'lost',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lost_pets_user ON public.lost_pets(user_id);
CREATE INDEX idx_lost_pets_status ON public.lost_pets(status);

CREATE TRIGGER lost_pets_set_updated_at
  BEFORE UPDATE ON public.lost_pets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lost_pets_select_public"
  ON public.lost_pets FOR SELECT USING (true);

CREATE POLICY "lost_pets_insert_own"
  ON public.lost_pets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lost_pets_update_own"
  ON public.lost_pets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "lost_pets_delete_own"
  ON public.lost_pets FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- 2. lost_pet_photos table
CREATE TABLE public.lost_pet_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_pet_id UUID NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lost_pet_photos_lost_pet ON public.lost_pet_photos(lost_pet_id);

ALTER TABLE public.lost_pet_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lost_pet_photos_select_public"
  ON public.lost_pet_photos FOR SELECT USING (true);

CREATE POLICY "lost_pet_photos_insert_auth"
  ON public.lost_pet_photos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lost_pets
      WHERE id = lost_pet_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "lost_pet_photos_delete_own"
  ON public.lost_pet_photos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lost_pets
      WHERE id = lost_pet_id AND user_id = auth.uid()
    )
  );

-- 3. Review actions
CREATE OR REPLACE FUNCTION public.mark_review_helpful(review_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE place_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = review_id AND is_hidden = FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.flag_review(review_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE place_reviews
    SET is_reported = TRUE
    WHERE id = review_id
      AND user_id != auth.uid()
      AND is_hidden = FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_review_helpful(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flag_review(UUID) TO authenticated;