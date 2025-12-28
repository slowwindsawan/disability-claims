-- Add document_summaries field to cases table
-- This will store an array of summaries for all documents collected for a case
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS document_summaries jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.cases.document_summaries IS 'Array of document summaries with metadata for all collected documents';
