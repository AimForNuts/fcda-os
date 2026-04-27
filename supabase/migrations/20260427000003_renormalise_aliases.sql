-- Re-normalise existing alias values to strip invisible Unicode control
-- characters (e.g. WhatsApp bidi isolates U+2068/U+2069) that were stored
-- before the normaliseAlias function was updated.
-- PostgreSQL ARE syntax: \x{hhhh} matches a Unicode code point.
UPDATE public.player_aliases
SET alias = regexp_replace(
  alias,
  '[\x{200b}-\x{200f}\x{2028}-\x{202f}\x{2060}-\x{206f}\x{feff}]',
  '',
  'g'
)
WHERE alias ~ '[\x{200b}-\x{200f}\x{2028}-\x{202f}\x{2060}-\x{206f}\x{feff}]';

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
