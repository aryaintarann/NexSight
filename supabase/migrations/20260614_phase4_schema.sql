-- NexSight Phase 4 Schema Migration
-- Apply in Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- ─────────────────────────────────────────────────────
-- MONITORS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monitors (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users NOT NULL,
  url           TEXT NOT NULL,
  schedule      TEXT NOT NULL DEFAULT '0 0 * * *',
  active        BOOLEAN DEFAULT true,
  alert_on_drop INT,
  alert_below   INT,
  notify_email  TEXT NOT NULL,
  last_score    INT,
  last_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.monitors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'monitors' AND policyname = 'Users manage own monitors'
  ) THEN
    CREATE POLICY "Users manage own monitors"
      ON public.monitors FOR ALL
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON public.monitors(user_id);

-- ─────────────────────────────────────────────────────
-- MONITOR_RUNS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monitor_runs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_id   UUID REFERENCES public.monitors ON DELETE CASCADE NOT NULL,
  scan_id      UUID REFERENCES public.scans ON DELETE SET NULL,
  score        INT,
  prev_score   INT,
  alerted      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.monitor_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'monitor_runs' AND policyname = 'Users see own monitor runs'
  ) THEN
    CREATE POLICY "Users see own monitor runs"
      ON public.monitor_runs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.monitors
          WHERE public.monitors.id = public.monitor_runs.monitor_id
          AND (SELECT auth.uid()) = public.monitors.user_id
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_monitor_runs_monitor_id ON public.monitor_runs(monitor_id);
CREATE INDEX IF NOT EXISTS idx_monitor_runs_scan_id ON public.monitor_runs(scan_id);
