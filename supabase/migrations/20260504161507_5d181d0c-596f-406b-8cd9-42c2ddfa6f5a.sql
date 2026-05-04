
-- BLOC 2: Protection colonnes système place_reviews
CREATE OR REPLACE FUNCTION public.protect_review_system_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.bypass_review_guard', true) IS DISTINCT FROM 'true' THEN
    NEW.is_hidden     := OLD.is_hidden;
    NEW.helpful_count := OLD.helpful_count;
    NEW.is_reported   := OLD.is_reported;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_review_cols ON public.place_reviews;
CREATE TRIGGER trg_protect_review_cols
  BEFORE UPDATE ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_review_system_columns();

-- BLOC 3: RLS pets & pet_photos
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pets_select"      ON public.pets;
DROP POLICY IF EXISTS "pets_insert_own"  ON public.pets;
DROP POLICY IF EXISTS "pets_update_own"  ON public.pets;
DROP POLICY IF EXISTS "pets_delete_own"  ON public.pets;
DROP POLICY IF EXISTS "Users créent leurs animaux" ON public.pets;
DROP POLICY IF EXISTS "Users modifient leurs animaux" ON public.pets;
DROP POLICY IF EXISTS "Users suppriment leurs animaux" ON public.pets;
DROP POLICY IF EXISTS "Users voient leurs animaux" ON public.pets;

CREATE POLICY "pets_select"     ON public.pets FOR SELECT USING (true);
CREATE POLICY "pets_insert_own" ON public.pets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pets_update_own" ON public.pets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "pets_delete_own" ON public.pets FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_photos_select"     ON public.pet_photos;
DROP POLICY IF EXISTS "pet_photos_insert_own" ON public.pet_photos;
DROP POLICY IF EXISTS "pet_photos_delete_own" ON public.pet_photos;
DROP POLICY IF EXISTS "Users gèrent leurs pet_photos" ON public.pet_photos;

CREATE POLICY "pet_photos_select" ON public.pet_photos FOR SELECT USING (true);
CREATE POLICY "pet_photos_insert_own" ON public.pet_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_photos.pet_id AND pets.user_id = auth.uid())
);
CREATE POLICY "pet_photos_delete_own" ON public.pet_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_photos.pet_id AND pets.user_id = auth.uid())
);

-- BLOC 4: RLS conversations & messages
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conv_select" ON public.conversations;
DROP POLICY IF EXISTS "conv_insert" ON public.conversations;

CREATE POLICY "conv_select_own" ON public.conversations FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "conv_insert_own" ON public.conversations FOR INSERT
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select_own"  ON public.messages;
DROP POLICY IF EXISTS "msg_insert_own"  ON public.messages;
DROP POLICY IF EXISTS "msg_update_read" ON public.messages;
DROP POLICY IF EXISTS "msg_select" ON public.messages;
DROP POLICY IF EXISTS "msg_insert" ON public.messages;
DROP POLICY IF EXISTS "msg_update" ON public.messages;

CREATE POLICY "msg_select_own" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
  )
);

CREATE POLICY "msg_insert_own" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
  )
);

CREATE POLICY "msg_update_read" ON public.messages FOR UPDATE USING (
  sender_id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
  )
);

-- BLOC 5: Blocage utilisateurs bannis (RESTRICTIVE)
CREATE OR REPLACE FUNCTION public.is_user_banned()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT is_banned FROM profiles WHERE id = auth.uid()), false);
$$;

DROP POLICY IF EXISTS "no_banned_insert_reviews"   ON public.place_reviews;
DROP POLICY IF EXISTS "no_banned_insert_messages"  ON public.messages;
DROP POLICY IF EXISTS "no_banned_insert_lost_pets" ON public.lost_pets;
DROP POLICY IF EXISTS "no_banned_insert_strays"    ON public.stray_reports;

CREATE POLICY "no_banned_insert_reviews"   ON public.place_reviews  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_user_banned());
CREATE POLICY "no_banned_insert_messages"  ON public.messages       AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_user_banned());
CREATE POLICY "no_banned_insert_lost_pets" ON public.lost_pets      AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_user_banned());
CREATE POLICY "no_banned_insert_strays"    ON public.stray_reports  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_user_banned());
