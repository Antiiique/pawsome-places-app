ALTER TABLE lost_pets
  ALTER COLUMN last_seen_lat DROP NOT NULL,
  ALTER COLUMN last_seen_lng DROP NOT NULL;