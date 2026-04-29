-- supabase/migrations/20260430000001_rating_processed_status.sql
-- Add `processed` status to rating_submissions constraint

ALTER TABLE public.rating_submissions
  DROP CONSTRAINT IF EXISTS rating_submissions_status_check;

ALTER TABLE public.rating_submissions
  ADD CONSTRAINT rating_submissions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'processed'));
