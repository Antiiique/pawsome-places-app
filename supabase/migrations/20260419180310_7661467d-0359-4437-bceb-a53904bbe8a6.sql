CREATE OR REPLACE FUNCTION public.validate_user_notification_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN (
    'submission_approved','submission_rejected',
    'report_reviewed','report_dismissed',
    'place_updated','new_review'
  ) THEN
    RAISE EXCEPTION 'Invalid user notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  place_name TEXT;
BEGIN
  SELECT name INTO place_name FROM public.pet_friendly_places WHERE id = NEW.place_id;
  INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
  SELECT p.id, 'new_review',
    '💬 Nouvel avis communauté',
    'Un utilisateur a laissé un avis sur "' || COALESCE(place_name, 'un lieu') || '".',
    NEW.place_id
  FROM public.profiles p
  WHERE p.is_admin = TRUE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_review ON public.place_reviews;
CREATE TRIGGER trg_notify_admins_new_review
  AFTER INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_review();