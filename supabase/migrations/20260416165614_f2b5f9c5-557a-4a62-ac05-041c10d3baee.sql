CREATE POLICY "Admins can insert pet_friendly_places"
ON public.pet_friendly_places
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));