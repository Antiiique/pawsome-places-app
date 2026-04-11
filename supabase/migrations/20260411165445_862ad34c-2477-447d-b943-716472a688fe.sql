
-- Drop the permissive INSERT policy
DROP POLICY "Authenticated users can propose places" ON public.pet_friendly_places;

-- Create a more restrictive INSERT policy
CREATE POLICY "Authenticated users can propose unverified places"
  ON public.pet_friendly_places FOR INSERT
  TO authenticated
  WITH CHECK (verified = false AND source = 'user_submission');
