DROP POLICY IF EXISTS "pets_select" ON pets;
CREATE POLICY "pets_select" ON pets FOR SELECT USING (true);
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_photos_select" ON pet_photos;
CREATE POLICY "pet_photos_select" ON pet_photos FOR SELECT USING (true);
ALTER TABLE pet_photos ENABLE ROW LEVEL SECURITY;