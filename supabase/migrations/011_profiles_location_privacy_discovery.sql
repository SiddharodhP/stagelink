-- ============================================================
-- PROFILE LOCATION, COMPLETENESS, AND BILLING PRIVACY
--
-- Groundwork for the freelancer directory. Three things:
--
-- 1. STRUCTURED LOCATION. profiles.location is free text, so "Bangalore",
--    "bangalore" and "Bengaluru" are three different places and cannot be
--    filtered on. Photo and video work is local, so the directory is
--    useless without a real city field.
--
-- 2. COMPLETENESS SCORE. A directory of empty profiles is worse than no
--    directory. Scoring lets us rank complete profiles first and nudge
--    people to finish theirs.
--
-- 3. BILLING PRIVACY — the urgent one. profiles_read_all is
--    `using (true)`, so every column is world-readable. Verified with the
--    public anon key: billing_email, phone, tax_id and billing_address all
--    come back for every user. They are NULL today only because nothing
--    collects them yet — and the onboarding flow this migration supports is
--    exactly what starts collecting them. Fixing it after would mean
--    leaking real phone numbers first.
--
--    RLS is row-level and cannot help here; the rows are legitimately
--    public. Column-level privileges are the right tool. Definer functions
--    (create_invoice, issue_recurring_invoice) run as the owner and keep
--    full access, so invoicing is unaffected.
--
-- Run AFTER 010_fix_platform_function_grants.sql.
-- ============================================================

begin;

-- ---------- 1. Cities ----------

create table if not exists public.cities (
  id serial primary key,
  name text not null,
  state text not null,
  country text not null default 'India',
  slug text not null unique,
  is_metro boolean not null default false
);

create index if not exists cities_name_idx on public.cities(lower(name));

insert into public.cities (name, state, slug, is_metro) values
  ('Mumbai','Maharashtra','mumbai',true),
  ('Delhi','Delhi','delhi',true),
  ('Bengaluru','Karnataka','bengaluru',true),
  ('Hyderabad','Telangana','hyderabad',true),
  ('Chennai','Tamil Nadu','chennai',true),
  ('Kolkata','West Bengal','kolkata',true),
  ('Pune','Maharashtra','pune',true),
  ('Ahmedabad','Gujarat','ahmedabad',true),
  ('Gurugram','Haryana','gurugram',true),
  ('Noida','Uttar Pradesh','noida',true),
  ('Jaipur','Rajasthan','jaipur',false),
  ('Lucknow','Uttar Pradesh','lucknow',false),
  ('Chandigarh','Chandigarh','chandigarh',false),
  ('Kochi','Kerala','kochi',false),
  ('Thiruvananthapuram','Kerala','thiruvananthapuram',false),
  ('Goa','Goa','goa',false),
  ('Indore','Madhya Pradesh','indore',false),
  ('Bhopal','Madhya Pradesh','bhopal',false),
  ('Nagpur','Maharashtra','nagpur',false),
  ('Nashik','Maharashtra','nashik',false),
  ('Surat','Gujarat','surat',false),
  ('Vadodara','Gujarat','vadodara',false),
  ('Coimbatore','Tamil Nadu','coimbatore',false),
  ('Madurai','Tamil Nadu','madurai',false),
  ('Visakhapatnam','Andhra Pradesh','visakhapatnam',false),
  ('Vijayawada','Andhra Pradesh','vijayawada',false),
  ('Mysuru','Karnataka','mysuru',false),
  ('Mangaluru','Karnataka','mangaluru',false),
  ('Hubballi','Karnataka','hubballi',false),
  ('Belagavi','Karnataka','belagavi',false),
  ('Bidar','Karnataka','bidar',false),
  ('Kalaburagi','Karnataka','kalaburagi',false),
  ('Bhubaneswar','Odisha','bhubaneswar',false),
  ('Guwahati','Assam','guwahati',false),
  ('Patna','Bihar','patna',false),
  ('Ranchi','Jharkhand','ranchi',false),
  ('Raipur','Chhattisgarh','raipur',false),
  ('Dehradun','Uttarakhand','dehradun',false),
  ('Rishikesh','Uttarakhand','rishikesh',false),
  ('Shimla','Himachal Pradesh','shimla',false),
  ('Amritsar','Punjab','amritsar',false),
  ('Ludhiana','Punjab','ludhiana',false),
  ('Agra','Uttar Pradesh','agra',false),
  ('Varanasi','Uttar Pradesh','varanasi',false),
  ('Kanpur','Uttar Pradesh','kanpur',false),
  ('Udaipur','Rajasthan','udaipur',false),
  ('Jodhpur','Rajasthan','jodhpur',false),
  ('Puducherry','Puducherry','puducherry',false),
  ('Srinagar','Jammu and Kashmir','srinagar',false),
  ('Navi Mumbai','Maharashtra','navi-mumbai',false),
  ('Thane','Maharashtra','thane',false),
  ('Faridabad','Haryana','faridabad',false),
  ('Ghaziabad','Uttar Pradesh','ghaziabad',false)
on conflict (slug) do nothing;

alter table public.cities enable row level security;
create policy "cities_read_all" on public.cities for select using (true);

-- ---------- 2. Structured location on profiles ----------

alter table public.profiles
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text not null default 'India',
  -- Freelancers who work anywhere shouldn't be hidden by a city filter.
  add column if not exists works_remotely boolean not null default false,
  -- How far they'll travel for a shoot; photo/video is a travel business.
  add column if not exists travel_radius_km integer
    check (travel_radius_km is null or travel_radius_km between 0 and 5000);

-- Best-effort backfill: match the free-text location against a known city.
update public.profiles p
   set city = c.name, state = c.state
  from public.cities c
 where p.city is null
   and p.location is not null
   and (
     lower(trim(p.location)) = lower(c.name)
     or lower(p.location) like lower(c.name) || ',%'
     or lower(p.location) like '%' || lower(c.name) || '%'
   );

-- Common alternates people actually type.
update public.profiles set city = 'Bengaluru', state = 'Karnataka'
 where city is null and location ~* '(bangalore|bengaluru)';
update public.profiles set city = 'Mumbai', state = 'Maharashtra'
 where city is null and location ~* '(bombay|mumbai)';
update public.profiles set city = 'Chennai', state = 'Tamil Nadu'
 where city is null and location ~* '(madras|chennai)';
update public.profiles set city = 'Kolkata', state = 'West Bengal'
 where city is null and location ~* '(calcutta|kolkata)';
update public.profiles set city = 'Delhi', state = 'Delhi'
 where city is null and location ~* '(new delhi|delhi|ncr)';

-- ---------- 3. Completeness score ----------

alter table public.profiles
  add column if not exists completeness integer not null default 0
    check (completeness between 0 and 100);

/**
 * 0-100, weighted by what actually matters to someone browsing the
 * directory. Portfolio counts for the most on a freelancer because a
 * photographer with no work shown is unbookable.
 *
 * Takes the id rather than the row so it can be called from triggers on
 * both profiles and portfolio_items.
 */
create or replace function public.compute_profile_completeness(p_id uuid)
returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  p profiles%rowtype;
  v_portfolio integer;
  v integer := 0;
begin
  select * into p from profiles where id = p_id;
  if p.id is null then return 0; end if;

  if p.role = 'client' then
    if coalesce(p.full_name, '') <> '' then v := v + 20; end if;
    if coalesce(p.company_name, '') <> '' then v := v + 20; end if;
    if coalesce(p.avatar_url, '') <> '' then v := v + 20; end if;
    if coalesce(p.city, '') <> '' then v := v + 20; end if;
    if length(coalesce(p.bio, '')) >= 60 then v := v + 20; end if;
    return v;
  end if;

  select count(*) into v_portfolio from portfolio_items where freelancer_id = p_id;

  if coalesce(p.full_name, '') <> '' then v := v + 10; end if;
  if coalesce(p.avatar_url, '') <> '' then v := v + 15; end if;
  if coalesce(p.headline, '') <> '' then v := v + 10; end if;
  if length(coalesce(p.bio, '')) >= 80 then v := v + 15; end if;
  if coalesce(p.city, '') <> '' then v := v + 10; end if;
  if array_length(p.skills, 1) >= 3 then v := v + 15; end if;
  if coalesce(p.hourly_rate, 0) > 0 then v := v + 5; end if;
  if v_portfolio >= 1 then v := v + 15; end if;
  if v_portfolio >= 3 then v := v + 5; end if;

  return least(v, 100);
end $$;

create or replace function public.sync_profile_completeness() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set completeness = public.compute_profile_completeness(new.id)
   where id = new.id;
  return null;
end $$;

drop trigger if exists profiles_sync_completeness on public.profiles;
create trigger profiles_sync_completeness
  after insert or update of
    full_name, avatar_url, headline, bio, city, skills, hourly_rate, role
  on public.profiles
  for each row execute function public.sync_profile_completeness();

create or replace function public.sync_completeness_from_portfolio() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  v_id := coalesce(new.freelancer_id, old.freelancer_id);
  update profiles
     set completeness = public.compute_profile_completeness(v_id)
   where id = v_id;
  return null;
end $$;

drop trigger if exists portfolio_sync_completeness on public.portfolio_items;
create trigger portfolio_sync_completeness
  after insert or delete on public.portfolio_items
  for each row execute function public.sync_completeness_from_portfolio();

-- Backfill every existing profile.
update public.profiles
   set completeness = public.compute_profile_completeness(id);

-- ---------- 4. Directory indexes ----------

create index if not exists profiles_directory_idx
  on public.profiles(role, city)
  where role = 'freelancer' and is_suspended = false;
create index if not exists profiles_skills_gin on public.profiles using gin(skills);
create index if not exists profiles_rating_idx on public.profiles(avg_rating desc);
create index if not exists profiles_rate_idx on public.profiles(hourly_rate);

-- ---------- 5. Billing privacy ----------

-- Verified world-readable before this change, using only the anon key:
--   /rest/v1/profiles?select=billing_email,phone,tax_id,billing_address
-- returned a row per user. Revoke by column; RLS cannot express this.
revoke select (billing_address, billing_email, phone, tax_id, tax_id_label)
  on public.profiles from anon, authenticated;

-- UPDATE is deliberately NOT revoked — profiles_update_own still lets a
-- user write their own billing details. They just can't read anyone's,
-- including their own, without the definer function below.

/**
 * The owner's own billing block. The settings form needs to populate its
 * fields, and column-level SELECT is now revoked, so this is the one way
 * back in — scoped to auth.uid() and nobody else.
 */
create or replace function public.get_my_billing()
returns table (
  billing_address text,
  billing_email text,
  phone text,
  tax_id text,
  tax_id_label text
)
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := public.require_auth();
  return query
    select p.billing_address, p.billing_email, p.phone, p.tax_id, p.tax_id_label
      from profiles p
     where p.id = v_uid;
end $$;

revoke all on function public.get_my_billing() from public;
grant execute on function public.get_my_billing() to authenticated;

commit;

-- ============================================================
-- VERIFY
--   -- with the ANON key, this must now FAIL, not return rows:
--   select billing_email, phone from public.profiles limit 1;
--   -- while this must still work:
--   select full_name, city, completeness from public.profiles limit 5;
--
--   select name, state, slug from public.cities order by is_metro desc limit 10;
--   select full_name, city, completeness from public.profiles order by completeness desc;
-- ============================================================
