DROP POLICY IF EXISTS "Admins can insert pet_friendly_places" ON public.pet_friendly_places;

CREATE POLICY "Admins can insert pet_friendly_places"
ON public.pet_friendly_places
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);