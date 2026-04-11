
-- Create pet_friendly_places table
CREATE TABLE public.pet_friendly_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  subcategory TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT,
  website TEXT,
  opening_hours TEXT,
  accepts_dogs BOOLEAN NOT NULL DEFAULT true,
  accepts_cats BOOLEAN NOT NULL DEFAULT false,
  dogs_on_leash_only BOOLEAN NOT NULL DEFAULT false,
  outdoor_seating BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC,
  description TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  source TEXT DEFAULT 'manual',
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_friendly_places ENABLE ROW LEVEL SECURITY;

-- Everyone can read places
CREATE POLICY "Anyone can view pet friendly places"
  ON public.pet_friendly_places FOR SELECT
  USING (true);

-- Authenticated users can insert (propose) places
CREATE POLICY "Authenticated users can propose places"
  ON public.pet_friendly_places FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for geo queries
CREATE INDEX idx_pet_places_geo ON public.pet_friendly_places (latitude, longitude);
CREATE INDEX idx_pet_places_category ON public.pet_friendly_places (category);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pet_places_updated_at
  BEFORE UPDATE ON public.pet_friendly_places
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC function to get nearby places
CREATE OR REPLACE FUNCTION public.get_nearby_pet_places(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 20,
  cat_filter TEXT DEFAULT NULL,
  dogs_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  subcategory TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  website TEXT,
  opening_hours TEXT,
  accepts_dogs BOOLEAN,
  accepts_cats BOOLEAN,
  dogs_on_leash_only BOOLEAN,
  outdoor_seating BOOLEAN,
  rating NUMERIC,
  description TEXT,
  photo_url TEXT,
  verified BOOLEAN,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id, p.name, p.category, p.subcategory,
    p.address, p.city, p.country,
    p.latitude, p.longitude,
    p.phone, p.website, p.opening_hours,
    p.accepts_dogs, p.accepts_cats,
    p.dogs_on_leash_only, p.outdoor_seating,
    p.rating, p.description, p.photo_url, p.verified,
    (6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(user_lon)) +
      sin(radians(user_lat)) * sin(radians(p.latitude))
    )) AS distance_km
  FROM public.pet_friendly_places p
  WHERE
    (cat_filter IS NULL OR p.category = cat_filter)
    AND (NOT dogs_only OR p.accepts_dogs = true)
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(user_lon)) +
      sin(radians(user_lat)) * sin(radians(p.latitude))
    )) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 200;
$$;
