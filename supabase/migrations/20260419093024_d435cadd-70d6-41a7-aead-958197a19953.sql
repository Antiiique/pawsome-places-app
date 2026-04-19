-- Add is_banned and created_at to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Block submissions from suspended accounts
DROP POLICY IF EXISTS "Banned users cannot submit" ON public.place_submissions;
CREATE POLICY "Banned users cannot submit"
ON public.place_submissions FOR INSERT TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_banned = true
  )
);

-- Block reports from suspended accounts
DROP POLICY IF EXISTS "Banned users cannot report" ON public.place_reports;
CREATE POLICY "Banned users cannot report"
ON public.place_reports FOR INSERT TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_banned = true
  )
);