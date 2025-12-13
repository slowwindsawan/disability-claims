-- Add signature tracking fields to cases table
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS boldsign_document_id TEXT,
ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS signature_completed_at TIMESTAMPTZ;

-- Create index for faster signature lookups
CREATE INDEX IF NOT EXISTS idx_cases_boldsign_document_id ON public.cases (boldsign_document_id);
CREATE INDEX IF NOT EXISTS idx_cases_signature_status ON public.cases (signature_status);

COMMENT ON COLUMN public.cases.boldsign_document_id IS 'BoldSign document ID for e-signature';
COMMENT ON COLUMN public.cases.signature_status IS 'Status of signature: pending, completed, declined';
COMMENT ON COLUMN public.cases.signature_completed_at IS 'Timestamp when signature was completed';
