-- Migration: Create agents table for storing GPT agent prompts and configurations
-- This allows admin users to manage and update agent prompts dynamically

CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    prompt TEXT NOT NULL,
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
    output_schema JSONB,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_name ON public.agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON public.agents(is_active);

-- Add RLS policies
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Only admins can read agents
CREATE POLICY "Admins can view agents" ON public.agents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profile
            WHERE user_profile.user_id = auth.uid()
            AND (user_profile.is_admin = true OR user_profile.is_superadmin = true)
        )
    );

-- Only admins (not subadmins) can modify agents
CREATE POLICY "Admins can insert agents" ON public.agents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profile
            WHERE user_profile.user_id = auth.uid()
            AND (user_profile.is_admin = true OR user_profile.is_superadmin = true)
            AND user_profile.is_subadmin IS NOT TRUE
        )
    );

CREATE POLICY "Admins can update agents" ON public.agents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profile
            WHERE user_profile.user_id = auth.uid()
            AND (user_profile.is_admin = true OR user_profile.is_superadmin = true)
            AND user_profile.is_subadmin IS NOT TRUE
        )
    );

CREATE POLICY "Admins can delete agents" ON public.agents
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profile
            WHERE user_profile.user_id = auth.uid()
            AND (user_profile.is_admin = true OR user_profile.is_superadmin = true)
            AND user_profile.is_subadmin IS NOT TRUE
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at_trigger
    BEFORE UPDATE ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION update_agents_updated_at();
