-- Colonnes supplémentaires pour les profils utilisateurs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points integer DEFAULT 0 NOT NULL;

-- Table pour les photos d'animaux
CREATE TABLE IF NOT EXISTS pet_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  pet_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE pet_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique pet_photos" ON pet_photos;
CREATE POLICY "Lecture publique pet_photos" ON pet_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateur gère ses photos" ON pet_photos;
CREATE POLICY "Utilisateur gère ses photos" ON pet_photos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Points : +10 quand une soumission est approuvée
CREATE OR REPLACE FUNCTION give_points_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.submitted_by IS NOT NULL THEN
    UPDATE profiles SET points = COALESCE(points, 0) + 10 WHERE id = NEW.submitted_by;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_points_approval ON place_submissions;
CREATE TRIGGER trg_points_approval
  AFTER UPDATE ON place_submissions FOR EACH ROW EXECUTE FUNCTION give_points_on_approval();

-- Points : +5 quand un signalement est traité (pas ignoré)
CREATE OR REPLACE FUNCTION give_points_on_report_reviewed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'reviewed' AND OLD.status != 'reviewed' AND NEW.reported_by IS NOT NULL THEN
    UPDATE profiles SET points = COALESCE(points, 0) + 5 WHERE id = NEW.reported_by;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_points_report ON place_reports;
CREATE TRIGGER trg_points_report
  AFTER UPDATE ON place_reports FOR EACH ROW EXECUTE FUNCTION give_points_on_report_reviewed();

-- Admins peuvent modifier tous les profils
DROP POLICY IF EXISTS "Admins modifient les profils" ON profiles;
CREATE POLICY "Admins modifient les profils" ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));