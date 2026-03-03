-- Add letters JSONB column to cases for storing BTL letter snapshots
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS letters jsonb DEFAULT '{}';
