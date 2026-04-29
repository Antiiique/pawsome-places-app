ALTER TABLE public.stray_reports
  ADD COLUMN IF NOT EXISTS color     text,
  ADD COLUMN IF NOT EXISTS breed     text,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS behavior  text;