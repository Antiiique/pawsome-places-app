
-- ============================================================
-- 1. TABLE PROFILS UTILISATEURS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 1b. TABLE RÔLES UTILISATEURS (séparée pour la sécurité)
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger : création auto du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TABLE SOUMISSIONS DE LIEUX
-- ============================================================
CREATE TABLE IF NOT EXISTS public.place_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'France',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT,
  website TEXT,
  description TEXT,
  accepts_dogs BOOLEAN DEFAULT TRUE,
  accepts_cats BOOLEAN DEFAULT FALSE,
  dogs_on_leash_only BOOLEAN DEFAULT FALSE,
  outdoor_seating BOOLEAN DEFAULT FALSE,
  water_bowl_provided BOOLEAN DEFAULT FALSE,
  opening_hours TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABLE PHOTOS DES SOUMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.submission_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.place_submissions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TABLE SIGNALEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.place_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID REFERENCES public.pet_friendly_places(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  comment TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation trigger for place_reports.reason
CREATE OR REPLACE FUNCTION public.validate_report_reason()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reason NOT IN ('not_pet_friendly', 'closed', 'wrong_info', 'no_longer_exists', 'other') THEN
    RAISE EXCEPTION 'Invalid reason: %', NEW.reason;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_report_reason
  BEFORE INSERT OR UPDATE ON public.place_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_report_reason();

-- Validation trigger for place_submissions.status
CREATE OR REPLACE FUNCTION public.validate_submission_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_submission_status
  BEFORE INSERT OR UPDATE ON public.place_submissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_submission_status();

-- Validation trigger for place_reports.status
CREATE OR REPLACE FUNCTION public.validate_report_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'reviewed', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_report_status
  BEFORE INSERT OR UPDATE ON public.place_reports
  FOR EACH ROW EXECUTE FUNCTION public.validate_report_status();

-- ============================================================
-- 5. TABLE NOTIFICATIONS ADMIN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation trigger for admin_notifications.type
CREATE OR REPLACE FUNCTION public.validate_notification_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type NOT IN ('new_submission', 'place_report') THEN
    RAISE EXCEPTION 'Invalid notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_notification_type
  BEFORE INSERT OR UPDATE ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_notification_type();

-- ============================================================
-- 6. TRIGGER : notification admin à chaque soumission
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, related_id)
  VALUES (
    'new_submission',
    'Nouveau lieu à valider',
    'Un utilisateur a soumis le lieu : ' || NEW.name || ' (' || NEW.category || ')',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_place_submission ON public.place_submissions;
CREATE TRIGGER on_place_submission
  AFTER INSERT ON public.place_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_submission();

-- ============================================================
-- 7. TRIGGER : notification admin à chaque signalement
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_report()
RETURNS TRIGGER AS $$
DECLARE
  place_name TEXT;
BEGIN
  SELECT name INTO place_name FROM public.pet_friendly_places WHERE id = NEW.place_id;
  INSERT INTO public.admin_notifications (type, title, message, related_id)
  VALUES (
    'place_report',
    'Lieu signalé par la communauté',
    'Le lieu "' || COALESCE(place_name, 'inconnu') || '" a été signalé : ' || NEW.reason,
    NEW.place_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_place_report ON public.place_reports;
CREATE TRIGGER on_place_report
  AFTER INSERT ON public.place_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_report();

-- ============================================================
-- 8. COLONNES report_count et is_flagged
-- ============================================================
ALTER TABLE public.pet_friendly_places
  ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.update_report_count()
RETURNS TRIGGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.place_reports
  WHERE place_id = NEW.place_id AND status = 'pending';

  UPDATE public.pet_friendly_places
  SET report_count = cnt,
      is_flagged = (cnt >= 3)
  WHERE id = NEW.place_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_report_count ON public.place_reports;
CREATE TRIGGER on_report_count
  AFTER INSERT ON public.place_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_report_count();

-- ============================================================
-- 9. RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- USER_ROLES
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "Lecture profil public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Modifier son propre profil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PLACE_SUBMISSIONS
CREATE POLICY "Voir soumissions approuvées ou les siennes" ON public.place_submissions
  FOR SELECT USING (status = 'approved' OR submitted_by = auth.uid());
CREATE POLICY "Utilisateur connecté peut soumettre" ON public.place_submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND submitted_by = auth.uid());
CREATE POLICY "Admin peut tout gérer soumissions" ON public.place_submissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SUBMISSION_PHOTOS
CREATE POLICY "Lecture photos publique" ON public.submission_photos FOR SELECT USING (true);
CREATE POLICY "Upload si connecté" ON public.submission_photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

-- PLACE_REPORTS
CREATE POLICY "Signaler si connecté" ON public.place_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND reported_by = auth.uid());
CREATE POLICY "Voir ses propres signalements" ON public.place_reports
  FOR SELECT USING (reported_by = auth.uid());
CREATE POLICY "Admin voit tout signalements" ON public.place_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ADMIN_NOTIFICATIONS
CREATE POLICY "Admin seulement notifications" ON public.admin_notifications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 10. STORAGE BUCKET pour les photos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('place-photos', 'place-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload photos si connecté" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'place-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Lecture photos publique storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'place-photos');
