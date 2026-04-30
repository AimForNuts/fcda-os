-- Re-normalise existing alias values to strip invisible Unicode control
-- characters (e.g. WhatsApp bidi isolates U+2068/U+2069) that were stored
-- before the normaliseAlias function was updated.
-- PostgreSQL ARE regex uses \uHHHH (4 hex digits) for Unicode code points.
UPDATE public.player_aliases
SET alias = regexp_replace(
  alias,
  '[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]',
  '',
  'g'
)
WHERE alias ~ '[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]';

-- Remove duplicates that now share the same (player_id, alias) after re-normalisation,
-- keeping the earliest row.
DELETE FROM public.player_aliases
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY player_id, alias
        ORDER BY created_at ASC
      ) AS rn
    FROM public.player_aliases
  ) ranked
  WHERE rn > 1
);
