-- Trigger: notification immédiate quand l'utilisateur soumet
CREATE OR REPLACE FUNCTION public.notify_user_on_submission_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submitted_by IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.submitted_by,
    'submission_approved',
    '📍 Lieu soumis avec succès !',
    'Merci pour ta contribution ! Ton lieu "' || NEW.name || '" est en cours d''examen par notre équipe. Tu recevras une notification dès qu''il sera validé.',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_place_submission_created ON public.place_submissions;
CREATE TRIGGER on_place_submission_created
  AFTER INSERT ON public.place_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_submission_created();

-- Mise à jour du trigger de review avec commentaire admin
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
      'Bonne nouvelle ! Ton lieu "' || NEW.name || '" a été approuvé et est maintenant visible sur la carte. 🐾' ||
      CASE WHEN NEW.admin_note IS NOT NULL AND NEW.admin_note != ''
        THEN ' Message de l''équipe : ' || NEW.admin_note
        ELSE ' Merci pour ta contribution !'
      END,
      NEW.id
    );
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;