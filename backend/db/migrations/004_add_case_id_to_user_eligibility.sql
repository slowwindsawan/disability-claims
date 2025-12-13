-- Migration: Add case_id column to user_eligibility table if it doesn't exist
-- This column links eligibility records to cases

-- Add case_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_eligibility' 
        AND column_name = 'case_id'
    ) THEN
        ALTER TABLE public.user_eligibility 
        ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added case_id column to user_eligibility table';
    ELSE
        RAISE NOTICE 'case_id column already exists in user_eligibility table';
    END IF;
END $$;

-- Create an index on case_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_eligibility_case_id ON public.user_eligibility(case_id);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_eligibility_user_id ON public.user_eligibility(user_id);
