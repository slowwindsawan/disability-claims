-- Add agreement_signed column to cases table
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS agreement_signed BOOLEAN DEFAULT FALSE;

-- Create index for faster agreement lookups
CREATE INDEX IF NOT EXISTS idx_cases_agreement_signed ON public.cases (agreement_signed);

COMMENT ON COLUMN public.cases.agreement_signed IS 'Whether the user has signed the agreement/power of attorney document';
