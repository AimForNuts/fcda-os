ALTER TABLE public.feedback
  ADD COLUMN game_id uuid NOT NULL REFERENCES public.games(id);

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_game_submitted_by_unique UNIQUE (game_id, submitted_by);
