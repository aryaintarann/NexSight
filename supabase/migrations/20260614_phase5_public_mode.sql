-- Phase 5: Make scans publicly accessible (no auth required)

-- Make user_id nullable so public scans (no logged-in user) can be inserted
ALTER TABLE public.scans ALTER COLUMN user_id DROP NOT NULL;

-- Replace user-scoped RLS policies with public access policies
DROP POLICY IF EXISTS "Users see only own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can insert own scans" ON public.scans;
DROP POLICY IF EXISTS "Users can update own scans" ON public.scans;

CREATE POLICY "Public scans readable by anyone"
  ON public.scans FOR SELECT USING (true);

CREATE POLICY "Service can insert scans"
  ON public.scans FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update scans"
  ON public.scans FOR UPDATE USING (true);

-- Replace scan_issues RLS policy
DROP POLICY IF EXISTS "Users see issues of own scans" ON public.scan_issues;
DROP POLICY IF EXISTS "Users can insert issues of own scans" ON public.scan_issues;

CREATE POLICY "Public scan issues readable by anyone"
  ON public.scan_issues FOR SELECT USING (true);

CREATE POLICY "Service can insert scan issues"
  ON public.scan_issues FOR INSERT WITH CHECK (true);
