-- Migration: add payments and contact_details columns to user_profile
-- These columns store payment and contact information as JSONB objects.
-- Run this in Supabase SQL editor or via psql against your Supabase DB.

ALTER TABLE IF EXISTS public.user_profile
ADD COLUMN IF NOT EXISTS payments jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS contact_details jsonb DEFAULT '{}'::jsonb;

-- Add comment to document the structure
COMMENT ON COLUMN public.user_profile.payments IS 'Payment details: { bankName, branchNumber, accountNumber }';
COMMENT ON COLUMN public.user_profile.contact_details IS 'Contact details: { address, hmo, doctorName }';
