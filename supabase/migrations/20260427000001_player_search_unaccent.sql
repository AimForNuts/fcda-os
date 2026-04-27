create extension if not exists unaccent;

create or replace function search_players(q text)
returns table (
  id          uuid,
  sheet_name  text,
  shirt_number integer,
  avatar_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select id, sheet_name, shirt_number, avatar_path
  from players
  where unaccent(sheet_name) ilike '%' || unaccent(q) || '%'
  order by sheet_name
  limit 20;
$$;
