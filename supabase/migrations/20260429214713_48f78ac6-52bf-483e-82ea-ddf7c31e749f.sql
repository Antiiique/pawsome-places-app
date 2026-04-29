CREATE TABLE public.stray_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  species text,
  description text,
  photo_url text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  city text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.stray_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique" ON public.stray_reports
  FOR SELECT USING (true);

CREATE POLICY "Insertion connectés" ON public.stray_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Modifier ses signalements" ON public.stray_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Supprimer ses signalements" ON public.stray_reports
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins gèrent tout" ON public.stray_reports
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

INSERT INTO storage.buckets (id, name, public)
VALUES ('stray-photos', 'stray-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Stray photos publiques" ON storage.objects
  FOR SELECT USING (bucket_id = 'stray-photos');

CREATE POLICY "Upload stray photos si connecté" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stray-photos' AND auth.uid() IS NOT NULL AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Supprimer ses stray photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'stray-photos' AND auth.uid()::text = (storage.foldername(name))[1]);