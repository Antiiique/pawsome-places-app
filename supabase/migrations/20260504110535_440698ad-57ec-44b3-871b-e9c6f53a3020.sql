CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
      RAISE EXCEPTION 'Permission refusée : modification de is_admin non autorisée';
    END IF;
  END IF;

  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    ) THEN
      RAISE EXCEPTION 'Permission refusée : modification de is_banned non autorisée';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

CREATE OR REPLACE FUNCTION public.check_stray_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM stray_reports
      WHERE user_id = auth.uid()
      AND created_at > NOW() - INTERVAL '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Limite atteinte : max 5 signalements par heure';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_stray_rate_limit ON public.stray_reports;
CREATE TRIGGER trg_stray_rate_limit
  BEFORE INSERT ON public.stray_reports
  FOR EACH ROW EXECUTE FUNCTION public.check_stray_rate_limit();

CREATE OR REPLACE FUNCTION public.check_lost_pet_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM lost_pets
      WHERE user_id = auth.uid()
      AND created_at > NOW() - INTERVAL '24 hours') >= 3 THEN
    RAISE EXCEPTION 'Limite atteinte : max 3 annonces par jour';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_lost_pet_rate_limit ON public.lost_pets;
CREATE TRIGGER trg_lost_pet_rate_limit
  BEFORE INSERT ON public.lost_pets
  FOR EACH ROW EXECUTE FUNCTION public.check_lost_pet_rate_limit();