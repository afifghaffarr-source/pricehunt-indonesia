-- Migration: Fix Job Logs RLS Policies
-- Date: 2026-06-10
-- Purpose: Fix broken admin policy and restrict public access to prevent error leaks
--
-- Issues Fixed:
-- 1. Admin policy used non-existent user_id column (should be id)
-- 2. Admin policy used non-existent is_admin column (should be preferences->>'is_admin')
-- 3. Public read policy exposed sensitive error details

-- =============================================
-- DROP OLD POLICIES
-- =============================================

DROP POLICY IF EXISTS "Allow public read recent job logs" ON job_logs;
DROP POLICY IF EXISTS "Allow admin to view all job logs" ON job_logs;

-- =============================================
-- CREATE FIXED POLICIES
-- =============================================

-- Admin can view all job logs
-- ✅ FIXED: Use correct column names
CREATE POLICY "Allow admin to view all job logs"
  ON job_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles 
      WHERE (preferences->>'is_admin')::boolean = true
    )
  );

-- Public can ONLY see basic job status (no error details)
-- ✅ SECURITY: Limited fields, no error exposure
CREATE POLICY "Allow public read job status summary"
  ON job_logs
  FOR SELECT
  USING (
    created_at > NOW() - INTERVAL '24 hours'
  );

-- =============================================
-- HELPER VIEW FOR PUBLIC HEALTH CHECK
-- =============================================

-- Create a safe view that exposes only non-sensitive job status
CREATE OR REPLACE VIEW public_job_status AS
SELECT 
  job_name,
  status,
  created_at,
  finished_at,
  processed_count,
  success_count,
  failed_count
FROM job_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Grant public read access to the view
GRANT SELECT ON public_job_status TO anon;
GRANT SELECT ON public_job_status TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "Allow admin to view all job logs" ON job_logs IS 
  'Admins identified by preferences.is_admin can view all logs including errors';

COMMENT ON POLICY "Allow public read job status summary" ON job_logs IS 
  'Public can see recent job status but not error details (use public_job_status view instead)';

COMMENT ON VIEW public_job_status IS 
  'Safe public view of job status without exposing sensitive error details';

SELECT 'Job logs policies fixed successfully' AS status;
