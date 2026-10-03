-- Storage Scan schema (target project: Med Track / ltryvlcrnjdfjyqcufgq)

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order BIGINT NOT NULL DEFAULT 0,
  container_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, number)
);

CREATE TABLE containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  row_id UUID REFERENCES rows(id) ON DELETE SET NULL,
  number INT NOT NULL,
  contents TEXT NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (location_id, number)
);

CREATE INDEX rows_location_id_number_idx ON rows (location_id, number);
CREATE INDEX containers_location_id_number_idx ON containers (location_id, number);
CREATE INDEX containers_location_id_row_id_idx ON containers (location_id, row_id);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_all" ON locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "rows_all" ON rows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "containers_all" ON containers FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_location_container_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE locations
    SET container_count = container_count + 1, updated_at = now()
    WHERE id = NEW.location_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE locations
    SET container_count = container_count - 1, updated_at = now()
    WHERE id = OLD.location_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER containers_count_insert
  AFTER INSERT ON containers
  FOR EACH ROW EXECUTE FUNCTION update_location_container_count();

CREATE TRIGGER containers_count_delete
  AFTER DELETE ON containers
  FOR EACH ROW EXECUTE FUNCTION update_location_container_count();

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "photos_all" ON storage.objects
  FOR ALL USING (bucket_id = 'photos') WITH CHECK (bucket_id = 'photos');
