DROP POLICY "Admins ou système peuvent insérer" ON public.user_notifications;

CREATE POLICY "Admins ou système peuvent insérer"
  ON public.user_notifications FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );