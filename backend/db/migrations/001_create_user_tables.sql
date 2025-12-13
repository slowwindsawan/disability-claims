-- Migration: create user_profile and user_eligibility tables
-- Run this in your Supabase/Postgres database (psql or Supabase SQL editor)

-- Enable pgcrypto for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- user_id references the Supabase auth.users(id) which is a UUID
  user_id uuid UNIQUE,
  full_name text,
  email text UNIQUE,
  phone text,
  identity_code text,
  email_otp text,
  otp_expires_at timestamptz,
  verified boolean DEFAULT false,
  eligibility_rating integer,
  eligibility_title text,
  eligibility_message text,
  eligibility_confidence integer,
  eligibility_raw jsonb,
  created_at timestamptz DEFAULT now(),
  -- Foreign key to Supabase auth users. When the auth user is deleted, cascade delete the profile.
  CONSTRAINT fk_user_profile_auth_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

  -- Cases table: a case represents a user's claim/case and groups eligibilities and documents.
  CREATE TABLE IF NOT EXISTS public.cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.user_profile(user_id) ON DELETE CASCADE,
    title text,
    description text,
    status text,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );

-- Audit/history table for eligibility results
CREATE TABLE IF NOT EXISTS public.user_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Reference the profile's user_id (UUID). When the profile is deleted, cascade delete eligibilities.
  user_id uuid REFERENCES public.user_profile(user_id) ON DELETE CASCADE,
  -- Each eligibility record may belong to a `case`.
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  uploaded_file text,
  eligibility_rating integer,
  eligibility_title text,
  eligibility_message text,
  eligibility_confidence integer,
  eligibility_raw jsonb,
  processed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_email ON public.user_profile (email);
CREATE INDEX IF NOT EXISTS idx_user_eligibility_user_id ON public.user_eligibility (user_id);
