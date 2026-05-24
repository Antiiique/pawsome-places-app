-- Hide contact info on lost_pets from anonymous users
REVOKE SELECT (contact_email, contact_phone) ON public.lost_pets FROM anon;

-- Hide internal admin fields on place_submissions from anonymous users
REVOKE SELECT (admin_note, reviewed_by, reviewed_at) ON public.place_submissions FROM anon;