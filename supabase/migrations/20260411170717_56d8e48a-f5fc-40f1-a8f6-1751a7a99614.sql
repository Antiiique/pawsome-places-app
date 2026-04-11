
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Add geography column
ALTER TABLE public.pet_friendly_places
  ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Populate from existing lat/lng
UPDATE public.pet_friendly_places
  SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  WHERE location IS NULL;

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_pet_friendly_places_location
  ON public.pet_friendly_places USING GIST (location);

-- Auto-sync trigger
CREATE OR REPLACE FUNCTION public.sync_location_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.pet_friendly_places
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_location_column();
