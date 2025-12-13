-- Migration: create notifications table
-- Run this in your Supabase/Postgres database

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profile(user_id) ON DELETE CASCADE,
  type text NOT NULL, -- e.g., 'case_created', 'case_submitted', 'case_approved', 'case_rejected', etc.
  title text NOT NULL,
  message text,
  data jsonb, -- flexible field for storing additional data (case_id, etc.)
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);
