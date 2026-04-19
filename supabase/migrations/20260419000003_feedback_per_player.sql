-- supabase/migrations/20260419000003_feedback_per_player.sql

ALTER TABLE public.rating_submissions
  ADD COLUMN feedback text;
