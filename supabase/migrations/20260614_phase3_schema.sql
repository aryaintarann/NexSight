-- NexSight Phase 3 Schema Migration
-- Apply this in your Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- ─────────────────────────────────────────────────────
-- API_KEYS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users NOT NULL,
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,
  key_prefix  TEXT NOT NULL,
  last_used   TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_keys' AND policyname = 'Users manage own API keys'
  ) THEN
    CREATE POLICY "Users manage own API keys"
      ON public.api_keys FOR ALL
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- WEBHOOKS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhooks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users NOT NULL,
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL,
  events      TEXT[] DEFAULT ARRAY['scan.done', 'scan.failed'],
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'webhooks' AND policyname = 'Users manage own webhooks'
  ) THEN
    CREATE POLICY "Users manage own webhooks"
      ON public.webhooks FOR ALL
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- SHARE TOKEN on SCANS
-- ─────────────────────────────────────────────────────
ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_scans_share_token ON public.scans(share_token);
