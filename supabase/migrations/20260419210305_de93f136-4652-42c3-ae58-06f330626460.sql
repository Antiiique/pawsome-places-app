-- 1. Corriger la policy admin sur place_reports
DROP POLICY IF EXISTS "Admin voit tout signalements" ON public.place_reports;
CREATE POLICY "Admin voit tout signalements"
  ON public.place_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- 2. Ajouter les colonnes reviewed_at et reviewed_by
ALTER TABLE public.place_reports
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Trigger de notification au reporter
CREATE OR REPLACE FUNCTION public.notify_user_on_report_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reported_by IS NULL THEN RETURN NEW; END IF;
  IF NEW.status = 'reviewed' AND OLD.status = 'pending' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.reported_by, 'report_reviewed', '✅ Signalement traité',
      'Merci ! Ton signalement a été examiné par notre équipe et pris en compte. 🐾',
      NEW.id
    );
  ELSIF NEW.status = 'dismissed' AND OLD.status = 'pending' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.reported_by, 'report_dismissed', '🚫 Signalement non retenu',
      'Ton signalement a été examiné mais notre équipe n''a pas pu le valider.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_review ON public.place_reports;
CREATE TRIGGER on_report_review
  AFTER UPDATE ON public.place_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_report_review();