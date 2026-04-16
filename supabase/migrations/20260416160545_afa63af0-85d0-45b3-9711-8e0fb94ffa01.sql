
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur voit ses propres notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Système peut insérer"
  ON public.user_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Utilisateur peut marquer comme lu"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger: validate notification type
CREATE OR REPLACE FUNCTION public.validate_user_notification_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type NOT IN ('submission_approved', 'submission_rejected', 'report_reviewed', 'report_dismissed') THEN
    RAISE EXCEPTION 'Invalid user notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_user_notification_type_trigger
  BEFORE INSERT OR UPDATE ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_notification_type();

-- Trigger: notify user on submission review
CREATE OR REPLACE FUNCTION public.notify_user_on_submission_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submitted_by IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.submitted_by,
      'submission_approved',
      '✅ Lieu validé !',
      'Votre lieu "' || NEW.name || '" a été approuvé et est maintenant visible sur la carte. Merci pour votre contribution !',
      NEW.id
    );
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.submitted_by,
      'submission_rejected',
      '❌ Lieu non retenu',
      'Votre soumission "' || NEW.name || '" n''a pas été retenue.' ||
      CASE WHEN NEW.admin_note IS NOT NULL AND NEW.admin_note != ''
        THEN ' Motif : ' || NEW.admin_note
        ELSE ' N''hésitez pas à le resoumettre avec plus d''informations.'
      END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_submission_review ON public.place_submissions;
CREATE TRIGGER on_submission_review
  AFTER UPDATE ON public.place_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_submission_review();

-- Trigger: notify user on report review
CREATE OR REPLACE FUNCTION public.notify_user_on_report_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reported_by IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'reviewed' AND OLD.status = 'pending' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.reported_by,
      'report_reviewed',
      '✅ Signalement pris en compte',
      'Votre signalement a été examiné et validé par notre équipe. Le lieu a été mis à jour. Merci pour votre aide !',
      NEW.place_id
    );
  ELSIF NEW.status = 'dismissed' AND OLD.status = 'pending' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.reported_by,
      'report_dismissed',
      '💬 Signalement examiné',
      'Votre signalement a été examiné par notre équipe. Après vérification, le lieu a été maintenu tel quel dans notre base de données.',
      NEW.place_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_report_review ON public.place_reports;
CREATE TRIGGER on_report_review
  AFTER UPDATE ON public.place_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_report_review();
