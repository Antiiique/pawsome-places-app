-- Notifie les admins quand un nouvel utilisateur crée un compte

-- 1. Ajouter 'new_user' aux types valides
CREATE OR REPLACE FUNCTION public.validate_user_notification_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN (
    'submission_approved', 'submission_rejected',
    'report_reviewed',     'report_dismissed',
    'place_updated',       'new_review',
    'mention',             'new_stray',
    'lost_pet',            'new_place',
    'new_message',         'zone_alert',
    'new_user'
  ) THEN
    RAISE EXCEPTION 'Invalid user notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Fonction trigger
CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user_id    UUID;
  v_user_name  TEXT;
  v_admin_id   UUID;
BEGIN
  v_user_id   := NEW.id;
  v_user_name := COALESCE(NEW.display_name, NEW.email, 'Nouvel utilisateur');

  FOR v_admin_id IN SELECT id FROM public.profiles WHERE is_admin = TRUE LOOP
    INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
    VALUES (
      v_admin_id,
      'new_user',
      '👤 Nouvel utilisateur',
      v_user_name || ' vient de rejoindre l''application.',
      v_user_id
    );
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 3. Trigger sur profiles
DROP TRIGGER IF EXISTS trg_notify_admins_new_user ON public.profiles;
CREATE TRIGGER trg_notify_admins_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_user();
