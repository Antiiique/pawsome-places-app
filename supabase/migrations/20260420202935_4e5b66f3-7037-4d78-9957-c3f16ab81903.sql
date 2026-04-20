CREATE OR REPLACE FUNCTION public.admin_place_stats()
  RETURNS TABLE(category text, total bigint)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT category, COUNT(*) as total
  FROM pet_friendly_places
  WHERE category IS NOT NULL
  GROUP BY category
  ORDER BY total DESC;
$$;

-- Grant execute permission to authenticated users (admins will be checked in application logic)
GRANT EXECUTE ON FUNCTION public.admin_place_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_place_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.admin_place_stats() TO service_role;

COMMENT ON FUNCTION public.admin_place_stats() IS 'Returns statistics of pet-friendly places grouped by category. Requires admin role check in application layer.';

-- Create index for better performance if not exists
CREATE INDEX IF NOT EXISTS idx_pet_friendly_places_category ON pet_friendly_places(category);