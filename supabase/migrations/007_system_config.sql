-- =========================================================
-- RewardNova — Migration 007: Persistent System Config for Vercel
-- Ensures providers, campaigns, and dynamic settings persist
-- across serverless instances and page refreshes.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Grant service_role full access (used by server actions)
DO $$ BEGIN
  CREATE POLICY "Service role full access on system_config"
    ON public.system_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
