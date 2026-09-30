-- ============================================================
-- SiteLedger - Consolidated Migration Script
-- Run this in Supabase SQL Editor to upgrade an existing database
-- to the complete current schema and hardened security policies.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Update projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_area NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS number_of_floors INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS floor_areas JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rate_per_sqft NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS extra_works JSONB;

-- 2. Update income table
ALTER TABLE income ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_payment_mode_check;

-- 3. Update expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_mobile TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS quantity TEXT;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_payment_mode_check;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- 4. Create site_plans table
CREATE TABLE IF NOT EXISTS site_plans (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  file_url      text NOT NULL,
  file_type     text NOT NULL,
  storage_path  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_plans_project ON site_plans(project_id);
ALTER TABLE site_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their site plans" ON site_plans;
CREATE POLICY "Users manage their site plans" ON site_plans FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 5. Create site_photos table
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

DROP POLICY IF EXISTS "Users manage their site photos" ON site_photos;
CREATE POLICY "Users manage their site photos" ON site_photos FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()))
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

-- 6. Harden Storage Buckets (Make private to prevent unauthenticated enumeration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bill-images',
  'bill-images',
  false,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];

UPDATE storage.buckets SET public = false WHERE id = 'bill-images';

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('project-files', 'project-files', false, 52428800)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

UPDATE storage.buckets SET public = false WHERE id = 'project-files';

-- 7. Secure Storage Policies for bill-images
DROP POLICY IF EXISTS "Authenticated users can upload bill images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own bill images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own bill images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for bill images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own bill images" ON storage.objects;

CREATE POLICY "Authenticated users can upload bill images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bill-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id::text = (storage.foldername(name))[2]
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authenticated users can view own bill images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bill-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id::text = (storage.foldername(name))[2]
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own bill images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bill-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id::text = (storage.foldername(name))[2]
        AND projects.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own bill images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bill-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.id::text = (storage.foldername(name))[2]
        AND projects.user_id = auth.uid()
      )
    )
  );

-- 8. Secure Storage Policies for project-files
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their project files" ON storage.objects;

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
