CREATE OR REPLACE FUNCTION public.notify_admins_new_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE place_name TEXT;
BEGIN
  SELECT name INTO place_name FROM public.pet_friendly_places WHERE id = NEW.place_id;
  INSERT INTO public.user_notifications (user_id, type, title, message, related_id)
  SELECT p.id, 'new_review',
    '💬 Nouvel avis communauté',
    'Un utilisateur a laissé un avis sur "' || COALESCE(place_name, 'un lieu') || '".',
    NEW.place_id
  FROM public.profiles p WHERE p.is_admin = TRUE;
  RETURN NEW;
END;
$$;