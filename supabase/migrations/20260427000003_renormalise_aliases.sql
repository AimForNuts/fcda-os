-- Re-normalise existing alias values to strip invisible Unicode control
-- characters (e.g. WhatsApp bidi isolates U+2068/U+2069) that were stored
-- before the normaliseAlias function was updated.
-- PostgreSQL ARE regex uses \uHHHH (4 hex digits) for Unicode code points.

-- Delete rows that would become duplicates after stripping invisible chars,
-- keeping the earliest row per (player_id, normalised alias).
DELETE FROM public.player_aliases
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY player_id, regexp_replace(alias, '[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]', '', 'g')
        ORDER BY created_at ASC
      ) AS rn
    FROM public.player_aliases
  ) ranked
  WHERE rn > 1
);

-- Now strip the invisible characters from the surviving rows.
UPDATE public.player_aliases
SET alias = regexp_replace(
  alias,
  '[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]',
  '',
  'g'
)
WHERE alias ~ '[\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]';
