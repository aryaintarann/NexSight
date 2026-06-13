-- ─────────────────────────────────────────────────────
-- REALTIME SETUP
-- ─────────────────────────────────────────────────────
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- ─────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name   TEXT,
  company     TEXT,
  plan        TEXT DEFAULT 'free',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();


-- ─────────────────────────────────────────────────────
-- SCANS
-- ─────────────────────────────────────────────────────
CREATE TABLE public.scans (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users NOT NULL,
  url             TEXT NOT NULL,
  status          TEXT DEFAULT 'queued',
  seo_score       INT CHECK (seo_score BETWEEN 0 AND 100),
  geo_score       INT CHECK (geo_score BETWEEN 0 AND 100),
  ai_score        INT CHECK (ai_score BETWEEN 0 AND 100),
  sec_score       INT CHECK (sec_score BETWEEN 0 AND 100),
  overall_score   INT CHECK (overall_score BETWEEN 0 AND 100),
  result          JSONB,
  scan_duration   INT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scans;

CREATE POLICY "Users see only own scans"
  ON public.scans FOR ALL
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_status ON public.scans(status);
CREATE INDEX idx_scans_created_at ON public.scans(created_at DESC);


-- ─────────────────────────────────────────────────────
-- SCAN_ISSUES
-- ─────────────────────────────────────────────────────
CREATE TABLE public.scan_issues (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id         UUID REFERENCES public.scans ON DELETE CASCADE NOT NULL,
  module          TEXT NOT NULL,
  severity        TEXT NOT NULL,
  code            TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  recommendation  TEXT,
  affected_url    TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.scan_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see issues of own scans"
  ON public.scan_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE public.scans.id = public.scan_issues.scan_id
      AND (SELECT auth.uid()) = public.scans.user_id
    )
  );

CREATE POLICY "Service can insert scan issues"
  ON public.scan_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE public.scans.id = scan_id
    )
  );

CREATE INDEX idx_scan_issues_scan_id ON public.scan_issues(scan_id);
CREATE INDEX idx_scan_issues_severity ON public.scan_issues(severity);


-- ─────────────────────────────────────────────────────
-- API_KEYS
-- ─────────────────────────────────────────────────────
CREATE TABLE public.api_keys (
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

CREATE POLICY "Users manage own API keys"
  ON public.api_keys FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
