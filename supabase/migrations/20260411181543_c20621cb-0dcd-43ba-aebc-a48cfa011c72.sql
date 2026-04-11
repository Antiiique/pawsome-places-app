
CREATE OR REPLACE FUNCTION public.sync_location_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
BEGIN
  NEW.location := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::extensions.geography;
  RETURN NEW;
END;
$function$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_sync_location ON public.pet_friendly_places;
CREATE TRIGGER trg_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.pet_friendly_places
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_location_column();
