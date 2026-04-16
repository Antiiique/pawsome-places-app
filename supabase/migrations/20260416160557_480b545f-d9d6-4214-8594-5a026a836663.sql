
DROP POLICY "Système peut insérer" ON public.user_notifications;

CREATE POLICY "Admins ou système peuvent insérer"
  ON public.user_notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
