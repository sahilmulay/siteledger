-- ============================================================
-- Migration: Add site_plans and site_photos tables
-- ============================================================

-- site_plans: stores DWG, PDF, and image plan files per project
CREATE TABLE IF NOT EXISTS site_plans (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  file_url      text NOT NULL,
  file_type     text NOT NULL,        -- e.g. PDF, DWG, DXF, PNG, JPG
  storage_path  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_plans_project ON site_plans(project_id);

ALTER TABLE site_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their site plans"
  ON site_plans FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────

-- site_photos: stores progress photos per project
CREATE TABLE IF NOT EXISTS site_photos (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  photo_url     text NOT NULL,
  storage_path  text NOT NULL,
  taken_at      timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_photos_project ON site_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_site_photos_taken_at ON site_photos(project_id, taken_at DESC);

ALTER TABLE site_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their site photos"
  ON site_photos FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Storage bucket: project-files (for site plans and photos)
-- Run this in the Supabase Dashboard > Storage > New Bucket
-- OR via the API. The SQL below creates the bucket policy if
-- the bucket already exists (create "project-files" manually
-- as a private bucket in the dashboard first).

-- Allow authenticated users to upload/read their own project files
INSERT INTO storage.buckets (id, name, public)
  VALUES ('project-files', 'project-files', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow authenticated users to manage their files
CREATE POLICY "Authenticated users can upload project files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view project files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can delete their project files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');
