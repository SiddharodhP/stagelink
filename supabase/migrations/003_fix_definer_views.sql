-- ============================================================
-- SECURITY FIX — remove SECURITY DEFINER views (Supabase Advisor: CRITICAL)
--
-- Problem: `user_ratings` and `user_financials` were plain Postgres views.
-- Views execute with the permissions of their CREATOR, not the querying
-- user, so they bypass Row Level Security on the tables underneath.
--
-- `user_financials` aggregates `transactions` — a table deliberately locked
-- down so a user can only see rows where they are payer or payee. Querying
-- the table anonymously correctly returns []. Querying the view anonymously
-- returned a row for EVERY user. Once real payments exist, that would leak
-- every user's earnings and spending to anyone holding the public anon key.
--
-- Fix: drop both views and denormalise the aggregates onto `profiles`,
-- maintained by triggers. Now the numbers are governed by the ordinary
-- profiles RLS policy (public read), so the exposure is explicit and
-- intentional rather than an accidental RLS bypass — and reading a profile
-- no longer costs two extra aggregate scans.
--
-- Run AFTER 002_fix_auth_null_guards.sql.
-- ============================================================

begin;

-- ---------- 1. Denormalised reputation + financial columns ----------
alter table public.profiles
  add column if not exists avg_rating numeric(2,1) not null default 0,
  add column if not exists total_reviews integer not null default 0,
  add column if not exists total_earned bigint not null default 0,
  add column if not exists total_spent bigint not null default 0;

-- ---------- 2. Fix the profile guard ----------
-- The original raised 'Nice try' whenever new.role = 'admin', even when the
-- role was unchanged. That blocked trigger-driven aggregate updates on admin
-- profiles. Only genuine escalation should be rejected.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.is_verified is distinct from old.is_verified
       or new.is_suspended is distinct from old.is_suspended then
      raise exception 'Verification and suspension are managed by the platform';
    end if;
    if old.role is not null and new.role is distinct from old.role then
      raise exception 'Account type cannot be changed after onboarding';
    end if;
    if new.role = 'admin' and old.role is distinct from 'admin' then
      raise exception 'Nice try';
    end if;
  end if;
  return new;
end $$;

-- ---------- 3. Aggregate maintainers ----------
create or replace function public.refresh_reputation(p_user uuid) returns void
language sql security definer set search_path = public as $$
  update profiles p set
    avg_rating = coalesce((select round(avg(rating)::numeric, 1) from reviews where reviewee_id = p_user), 0),
    total_reviews = coalesce((select count(*) from reviews where reviewee_id = p_user), 0)
  where p.id = p_user;
$$;

create or replace function public.refresh_financials(p_user uuid) returns void
language sql security definer set search_path = public as $$
  update profiles p set
    total_earned = coalesce((select sum(amount) from transactions
                             where payee_id = p_user and type = 'release' and status = 'completed'), 0),
    total_spent = greatest(0,
      coalesce((select sum(amount) from transactions
                where payer_id = p_user and type = 'escrow_fund' and status = 'completed'), 0)
      - coalesce((select sum(amount) from transactions
                  where payee_id = p_user and type = 'refund' and status = 'completed'), 0))
  where p.id = p_user;
$$;

-- ---------- 4. Triggers ----------
create or replace function public.on_review_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_reputation(coalesce(new.reviewee_id, old.reviewee_id));
  return null;
end $$;

drop trigger if exists reviews_refresh_reputation on public.reviews;
create trigger reviews_refresh_reputation
  after insert or update or delete on public.reviews
  for each row execute function public.on_review_change();

create or replace function public.on_transaction_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.payer_id, old.payer_id) is not null then
    perform public.refresh_financials(coalesce(new.payer_id, old.payer_id));
  end if;
  if coalesce(new.payee_id, old.payee_id) is not null then
    perform public.refresh_financials(coalesce(new.payee_id, old.payee_id));
  end if;
  return null;
end $$;

drop trigger if exists transactions_refresh_financials on public.transactions;
create trigger transactions_refresh_financials
  after insert or update or delete on public.transactions
  for each row execute function public.on_transaction_change();

-- ---------- 5. Backfill existing data ----------
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.refresh_reputation(r.id);
    perform public.refresh_financials(r.id);
  end loop;
end $$;

-- ---------- 6. Drop the leaky views ----------
drop view if exists public.user_ratings;
drop view if exists public.user_financials;

commit;

-- ============================================================
-- VERIFY
--   -- should now return 0 rows (views are gone):
--   select table_name from information_schema.views
--   where table_schema = 'public' and table_name in ('user_ratings','user_financials');
--
--   -- aggregates now live on profiles:
--   select full_name, role, avg_rating, total_reviews, total_earned, total_spent
--   from public.profiles;
-- ============================================================
