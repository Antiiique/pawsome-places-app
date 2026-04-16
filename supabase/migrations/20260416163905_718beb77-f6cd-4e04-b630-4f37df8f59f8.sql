
-- Allow admins to update pet_friendly_places
CREATE POLICY "Admins can update places"
ON public.pet_friendly_places
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete pet_friendly_places
CREATE POLICY "Admins can delete places"
ON public.pet_friendly_places
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
