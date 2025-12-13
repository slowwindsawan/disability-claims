-- Migration: create case_documents table for tracking files associated with cases
-- Run this in your Supabase/Postgres database (psql or Supabase SQL editor)

-- Create case_documents table to track all files uploaded for a case
CREATE TABLE IF NOT EXISTS public.case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  document_type text, -- e.g., 'medical_report', 'pay_slip', 'identity', 'general'
  uploaded_by uuid REFERENCES public.user_profile(user_id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON public.case_documents (case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_uploaded_by ON public.case_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_case_documents_uploaded_at ON public.case_documents (uploaded_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.case_documents IS 'Tracks all documents/files uploaded for each case with metadata and storage paths';
COMMENT ON COLUMN public.case_documents.file_path IS 'Path in Supabase Storage: cases/{case_id}/documents/{filename}';
COMMENT ON COLUMN public.case_documents.document_type IS 'Category of document for filtering: medical_report, pay_slip, identity, general, etc.';
