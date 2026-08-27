-- ============================================================
-- WORLDWIDE CITIES
--
-- Migration 011 seeded 53 Indian cities inline. That was fine as a
-- starting point and wrong as a design: a photographer in Dubai, London or
-- Lagos had nowhere to put their city, and the marketplace silently
-- excluded them.
--
-- This makes the city list global. The data comes from GeoNames
-- (cities15000, CC-BY 4.0) — 34,124 cities across 244 countries, every
-- settlement above 15,000 people. It is NOT seeded here: 34k rows is ~3MB
-- of INSERT statements, which is miserable to paste into a SQL editor and
-- impossible to re-run cleanly. It's loaded by scripts/seed-cities.mjs
-- instead, which upserts in batches with the service-role key.
--
-- This migration only prepares the schema and the two functions that make
-- the list usable at that size:
--   search_cities()      — typeahead, because a 34k <select> is unusable
--   get_or_create_city() — the long tail GeoNames doesn't cover
--
-- Safe to run whether or not 011's 53 rows are already present; the seed
-- script matches them on name + state rather than duplicating them.
--
-- Run AFTER 011_profiles_location_privacy_discovery.sql.
-- ============================================================

begin;

-- ---------- 1. Columns for a global dataset ----------

alter table public.cities
  add column if not exists country_code text,
  add column if not exists population integer,
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6),
  -- GeoNames' stable id. Nullable: rows created by get_or_create_city and
  -- the 53 from migration 011 have none.
  add column if not exists geoname_id integer;

create unique index if not exists cities_geoname_uniq
  on public.cities(geoname_id) where geoname_id is not null;

-- Dedupe key for everything else. A bare name is not unique worldwide —
-- there are dozens of Springfields — so identity is name + region + country.
create unique index if not exists cities_natural_uniq
  on public.cities(lower(name), lower(coalesce(state, '')), coalesce(country_code, 'IN'));

-- Typeahead hits this constantly; population orders the results so
-- "san" surfaces San Francisco before San Fernando de Apure.
create index if not exists cities_search_idx
  on public.cities(lower(name) text_pattern_ops, population desc nulls last);
create index if not exists cities_population_idx
  on public.cities(population desc nulls last);

-- Backfill the 011 rows so they participate in the same ordering.
update public.cities
   set country_code = coalesce(country_code, 'IN'),
       country = coalesce(country, 'India')
 where country_code is null;

-- ---------- 2. Typeahead ----------

/**
 * Prefix-first city search.
 *
 * Prefix matches rank above contains-matches, then by population, so
 * typing "lon" gives London before Colon and Villa London. Capped hard
 * because this is called on every keystroke.
 */
create or replace function public.search_cities(
  p_query text,
  p_limit integer default 12
) returns table (
  id integer,
  name text,
  state text,
  country text,
  country_code text,
  slug text,
  population integer
)
language sql stable set search_path = public as $$
  select c.id, c.name, c.state, c.country, c.country_code, c.slug, c.population
    from cities c
   where p_query is not null
     and length(trim(p_query)) >= 2
     and (
       lower(c.name) like lower(trim(p_query)) || '%'
       or lower(c.name) like '%' || lower(trim(p_query)) || '%'
     )
   order by
     (lower(c.name) like lower(trim(p_query)) || '%') desc,
     c.population desc nulls last,
     c.name
   limit least(coalesce(p_limit, 12), 25)
$$;

-- ---------- 3. The long tail ----------

/**
 * Returns the id of a city, creating it if GeoNames doesn't have it.
 *
 * Anything under 15,000 people is missing from the dataset, and plenty of
 * real work happens in those places. Without this, someone in a small town
 * has to pick a city they don't live in, which corrupts the directory more
 * than an extra row ever could.
 *
 * Requires a signed-in caller so the table can't be filled with junk by
 * anonymous traffic.
 */
create or replace function public.get_or_create_city(
  p_name text,
  p_state text default null,
  p_country text default 'India',
  p_country_code text default 'IN'
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_name text; v_state text; v_country text; v_cc text;
  v_slug text; v_base text; v_id integer; v_n integer := 1;
begin
  perform public.require_auth();

  v_name := nullif(trim(p_name), '');
  if v_name is null then raise exception 'City name is required'; end if;
  if length(v_name) > 80 then raise exception 'That city name is too long'; end if;

  v_state := nullif(trim(coalesce(p_state, '')), '');
  v_country := coalesce(nullif(trim(coalesce(p_country, '')), ''), 'India');
  v_cc := upper(coalesce(nullif(trim(coalesce(p_country_code, '')), ''), 'IN'));

  select c.id into v_id from cities c
   where lower(c.name) = lower(v_name)
     and lower(coalesce(c.state, '')) = lower(coalesce(v_state, ''))
     and coalesce(c.country_code, 'IN') = v_cc;
  if v_id is not null then return v_id; end if;

  -- Slug from name + region + country, with a numeric suffix if that still
  -- collides. Slugs are in URLs, so they must stay unique and stable.
  v_base := regexp_replace(
    lower(trim(v_name || '-' || coalesce(v_state, '') || '-' || v_cc)),
    '[^a-z0-9]+', '-', 'g'
  );
  v_base := trim(both '-' from regexp_replace(v_base, '-{2,}', '-', 'g'));
  v_slug := v_base;
  while exists (select 1 from cities where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into cities (name, state, country, country_code, slug, is_metro)
  values (v_name, v_state, v_country, v_cc, v_slug, false)
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.get_or_create_city(text, text, text, text)
  from anon, authenticated, public;
grant execute on function public.get_or_create_city(text, text, text, text)
  to authenticated;

-- search_cities is read-only over public data; anonymous visitors browsing
-- the directory need it before they sign in.
grant execute on function public.search_cities(text, integer) to anon, authenticated;

commit;

-- ============================================================
-- NEXT: load the data.
--   node scripts/seed-cities.mjs
-- Needs SUPABASE_SERVICE_ROLE_KEY in .env.local. Idempotent — re-running
-- updates existing rows rather than duplicating them.
--
-- VERIFY
--   select count(*) from public.cities;                    -- ~34,000
--   select count(distinct country_code) from public.cities; -- ~244
--   select * from public.search_cities('bengal');
--   select * from public.search_cities('lond');
-- ============================================================
