-- 1. Corriger la policy admin sur place_submissions
DROP POLICY IF EXISTS "Admin peut tout gérer soumissions" ON public.place_submissions;
CREATE POLICY "Admin peut tout gérer soumissions"
  ON public.place_submissions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- 2. Corriger la policy INSERT sur user_notifications
DROP POLICY IF EXISTS "Admins ou système peuvent insérer" ON public.user_notifications;
CREATE POLICY "Admins ou système peuvent insérer"
  ON public.user_notifications FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- 3. Recréer la fonction trigger proprement
CREATE OR REPLACE FUNCTION public.notify_user_on_submission_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.submitted_by IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.submitted_by,
      'submission_approved',
      '✅ Lieu validé !',
      'Bonne nouvelle ! Ton lieu "' || NEW.name || '" a été approuvé et est maintenant visible sur la carte. 🐾' ||
      CASE WHEN NEW.admin_note IS NOT NULL AND NEW.admin_note != ''
        THEN ' Message de l''équipe : ' || NEW.admin_note
        ELSE ' Merci pour ta contribution !'
      END,
      NEW.id
    );
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.submitted_by,
      'submission_rejected',
      '❌ Lieu non retenu',
      'Ton lieu "' || NEW.name || '" n''a pas pu être validé.' ||
      CASE WHEN NEW.admin_note IS NOT NULL AND NEW.admin_note != ''
        THEN ' Motif : ' || NEW.admin_note
        ELSE ' N''hésite pas à le resoumettre avec plus d''informations.'
      END,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Recréer le trigger
DROP TRIGGER IF EXISTS on_submission_review ON public.place_submissions;
CREATE TRIGGER on_submission_review
  AFTER UPDATE ON public.place_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_submission_review();