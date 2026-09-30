-- ============================================================
-- SiteLedger - Supabase Storage Setup
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- Create the bill-images storage bucket (private for owner isolation)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bill-images',
  'bill-images',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];

-- Migration statement to ensure existing bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'bill-images';

-- Allow authenticated users to upload their own files
DROP POLICY IF EXISTS "Authenticated users can upload bill images" ON storage.objects;
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

-- Allow authenticated users to view own files (prevent anonymous enumeration)
DROP POLICY IF EXISTS "Public read access for bill images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own bill images" ON storage.objects;
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

-- Allow authenticated users to update their own files
DROP POLICY IF EXISTS "Users can update own bill images" ON storage.objects;
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

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Users can delete own bill images" ON storage.objects;
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
