-- Migration: add id_card column to user_profile
-- This column stores ID card validation data as JSONB object.
-- Run this in Supabase SQL editor or via psql against your Supabase DB.

ALTER TABLE IF EXISTS public.user_profile
ADD COLUMN IF NOT EXISTS id_card jsonb DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN public.user_profile.id_card IS 'ID card validation data: { id_type, full_name, dob, id_number, image_url, validated_at }';
