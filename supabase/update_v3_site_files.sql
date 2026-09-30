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

-- Storage bucket: project-files (for site plans and photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('project-files', 'project-files', false, 52428800) -- 50MB limit
  ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

-- Ensure existing bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'project-files';

-- Drop any previous insecure or existing policies
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects;

-- INSERT: Only project owner can upload files
CREATE POLICY "Users can upload their project files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id::text = (storage.foldername(name))[2]
        AND projects.user_id = auth.uid()
      )
    )
  );

-- SELECT: Only project owner can view/list files
CREATE POLICY "Users can view their project files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id::text = (storage.foldername(name))[2]
        AND projects.user_id = auth.uid()
      )
    )
  );

-- UPDATE: Only project owner can update files
CREATE POLICY "Users can update their project files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id::text = (storage.foldername(name))[2]
        AND projects.user_id = auth.uid()
      )
    )
  );

-- DELETE: Only project owner can delete files
CREATE POLICY "Users can delete their project files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id::text = (storage.foldername(name))[2]
        AND projects.user_id = auth.uid()
      )
    )
  );
