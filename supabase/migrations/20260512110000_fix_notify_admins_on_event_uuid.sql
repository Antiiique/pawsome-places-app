-- Fix: notify_admins_on_event utilisait notif_related_id TEXT au lieu de UUID
-- Cela causait "column related_id is of type uuid but expression is of type text"
-- sur chaque INSERT dans place_reviews (avis communauté)

CREATE OR REPLACE FUNCTION public.notify_admins_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  admin_rec        RECORD;
  notif_type       TEXT;
  notif_title      TEXT;
  notif_message    TEXT;
  notif_related_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'stray_reports' THEN
    notif_type       := 'new_stray';
    notif_title      := '🚨 Animal errant signalé';
    notif_message    := COALESCE(NEW.species,'Animal') || COALESCE(' · '||NEW.city,'') || COALESCE(' — '||LEFT(NEW.description,80),'');
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'lost_pets' THEN
    notif_type       := 'lost_pet';
    notif_title      := '🆘 Animal perdu signalé';
    notif_message    := COALESCE(NEW.pet_name,'Animal')||' ('||COALESCE(NEW.species,'?')||')'||COALESCE(' — '||NEW.last_seen_address,'');
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'place_submissions' THEN
    notif_type       := 'new_place';
    notif_title      := '📍 Nouveau lieu soumis';
    notif_message    := COALESCE(NEW.name,'Sans nom')||COALESCE(' · '||NEW.category,'')||COALESCE(' — '||NEW.city,'');
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'place_reviews' THEN
    notif_type       := 'new_review';
    notif_title      := '💬 Nouvel avis posté';
    notif_message    := NEW.rating||'/5 ⭐'||COALESCE(' — '||LEFT(NEW.body,80),'');
    notif_related_id := NEW.place_id;
  END IF;

  FOR admin_rec IN
    SELECT p.id,
      COALESCE(np.notif_admin_new_review, true) AS allow_review,
      COALESCE(np.notif_admin_new_place,  true) AS allow_place,
      COALESCE(np.notif_admin_new_stray,  true) AS allow_stray,
      COALESCE(np.notif_admin_lost_pet,   true) AS allow_lost
    FROM profiles p
    LEFT JOIN notification_preferences np ON np.user_id = p.id
    WHERE p.is_admin = true
  LOOP
    IF notif_type = 'new_review' AND NOT admin_rec.allow_review THEN CONTINUE; END IF;
    IF notif_type = 'new_place'  AND NOT admin_rec.allow_place  THEN CONTINUE; END IF;
    IF notif_type = 'new_stray'  AND NOT admin_rec.allow_stray  THEN CONTINUE; END IF;
    IF notif_type = 'lost_pet'   AND NOT admin_rec.allow_lost   THEN CONTINUE; END IF;

    INSERT INTO user_notifications (user_id, type, title, message, related_id, is_read)
    VALUES (admin_rec.id, notif_type, notif_title, notif_message, notif_related_id, false);
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
