-- Fix: extend validate_user_notification_type to include all types used by the app
-- Fix: notify_admins_new_review uses local UUID variable to avoid SELECT/INSERT type mismatch

CREATE OR REPLACE FUNCTION public.validate_user_notification_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN (
    'submission_approved', 'submission_rejected',
    'report_reviewed',     'report_dismissed',
    'place_updated',       'new_review',
    'mention',             'new_stray',
    'lost_pet',            'new_place',
    'new_message',         'zone_alert'
  ) THEN
    RAISE EXCEPTION 'Invalid user notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_review ON public.place_reviews;

CREATE OR REPLACE FUNCTION public.notify_admins_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_place_name TEXT;
  v_place_id   UUID;
  v_admin_id   UUID;
BEGIN
  BEGIN
    v_place_id := NEW.place_id;

    SELECT name INTO v_place_name
    FROM public.pet_friendly_places
    WHERE id = v_place_id;

    FOR v_admin_id IN
      SELECT id FROM public.profiles WHERE is_admin = TRUE
    LOOP
      INSERT INTO public.user_notifications
        (user_id, type, title, message, related_id)
      VALUES (
        v_admin_id,
        'new_review',
        '💬 Nouvel avis communauté',
        'Avis posté sur "' || COALESCE(v_place_name, 'un lieu') || '".',
        v_place_id
      );
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_new_review
  AFTER INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_review();
