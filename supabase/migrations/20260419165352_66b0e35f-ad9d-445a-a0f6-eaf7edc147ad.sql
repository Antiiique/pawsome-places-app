DROP POLICY IF EXISTS "Admins can delete places" ON public.pet_friendly_places;
DROP POLICY IF EXISTS "Admins can update places" ON public.pet_friendly_places;

CREATE POLICY "Admins can delete places"
ON public.pet_friendly_places
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update places"
ON public.pet_friendly_places
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);