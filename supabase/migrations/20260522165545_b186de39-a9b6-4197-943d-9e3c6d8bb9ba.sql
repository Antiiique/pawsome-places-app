CREATE OR REPLACE FUNCTION public.get_nearby_pet_places(
  user_lat double precision,
  user_lon double precision,
  radius_km double precision DEFAULT 5,
  cat_filter text DEFAULT NULL,
  dogs_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid, name text, category text, subcategory text,
  address text, city text, country text,
  latitude double precision, longitude double precision,
  phone text, website text, opening_hours text,
  accepts_dogs boolean, accepts_cats boolean,
  dogs_on_leash_only boolean, outdoor_seating boolean,
  rating numeric, description text, photo_url text,
  verified boolean, is_flagged boolean, google_place_id text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    p.id, p.name, p.category, p.subcategory, p.address, p.city, p.country,
    p.latitude, p.longitude, p.phone, p.website, p.opening_hours,
    p.accepts_dogs, p.accepts_cats, p.dogs_on_leash_only, p.outdoor_seating,
    p.rating, p.description, p.photo_url, p.verified, p.is_flagged, p.google_place_id,
    (extensions.ST_Distance(
      p.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(user_lon, user_lat), 4326)::extensions.geography
    ) / 1000.0) AS distance_km
  FROM public.pet_friendly_places p
  WHERE p.location IS NOT NULL
    AND extensions.ST_DWithin(
      p.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(user_lon, user_lat), 4326)::extensions.geography,
      radius_km * 1000
    )
    AND (cat_filter IS NULL OR p.category = cat_filter)
    AND (NOT dogs_only OR p.accepts_dogs = true)
    AND COALESCE(p.is_flagged, false) = false
  ORDER BY distance_km ASC
  LIMIT 2000;
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_pet_places(double precision, double precision, double precision, text, boolean) TO anon, authenticated;