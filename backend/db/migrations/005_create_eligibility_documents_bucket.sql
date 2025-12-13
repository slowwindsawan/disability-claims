-- Create the eligibility-documents bucket for storing eligibility check files
-- Run this in Supabase Dashboard > Storage

-- Create bucket (public = false for secure access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('eligibility-documents', 'eligibility-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies to allow authenticated users to upload and read their own files

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload eligibility documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'eligibility-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read their own eligibility documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'eligibility-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can read all files
CREATE POLICY "Admins can read all eligibility documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'eligibility-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_profile
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Service role can do anything (for backend operations)
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'eligibility-documents')
WITH CHECK (bucket_id = 'eligibility-documents');
