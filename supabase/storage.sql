-- ============================================================
-- SiteLedger - Supabase Storage Setup
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- Create the bill-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bill-images',
  'bill-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];

-- Allow authenticated users to upload their own files
DROP POLICY IF EXISTS "Authenticated users can upload bill images" ON storage.objects;
CREATE POLICY "Authenticated users can upload bill images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bill-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own files
DROP POLICY IF EXISTS "Users can update own bill images" ON storage.objects;
CREATE POLICY "Users can update own bill images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bill-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Users can delete own bill images" ON storage.objects;
CREATE POLICY "Users can delete own bill images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bill-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read access for bill images (needed for owner portal)
DROP POLICY IF EXISTS "Public read access for bill images" ON storage.objects;
CREATE POLICY "Public read access for bill images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bill-images');
