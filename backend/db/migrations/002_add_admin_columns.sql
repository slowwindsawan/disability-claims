-- Migration: add admin flags to user_profile
-- Adds boolean flags for admin roles used by the backend require_admin guard.
-- Run this in Supabase SQL editor or via psql against your Supabase DB.

ALTER TABLE IF EXISTS public.user_profile
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_superadmin boolean DEFAULT false;

-- Optionally set existing users as admin (uncomment and customize):
-- UPDATE public.user_profile SET is_admin = true WHERE email = 'admin@example.com';
