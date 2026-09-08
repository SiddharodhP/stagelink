-- ============================================================
-- MULTI-CURRENCY
--
-- Every amount was implicitly rupees: there was no currency column on
-- projects, bids, milestones or contracts, and the two that did have one
-- (invoices, recurring_invoices) defaulted to INR. A photographer in
-- Sydney posting A$1,200 would have had it rendered as ₹1,200.
--
-- HOW MONEY BEHAVES NOW
--
-- Currency is a property of the PROJECT, chosen by the client when
-- posting, and everything downstream inherits it — bids, milestones,
-- escrow, invoices, payouts. Nothing converts on the way through.
--
-- That is the important part. Converting at settlement would mean the
-- value of a signed contract drifts with the exchange rate between
-- agreeing and getting paid, which is an FX position neither side asked
-- for. exchange_rates exists only so browsing can show "A$1,200 ≈
-- ₹66,000" as a hint. No converted figure is ever stored.
--
-- EXISTING DATA IS INR
--
-- The projects and invoices already in this database are genuinely
-- denominated in rupees, so they are backfilled to INR rather than picking
-- up the new default. Re-labelling ₹4,000 as A$4,000 would multiply it by
-- roughly seventy.
--
-- Run AFTER 019_fix_publish_without_milestones.sql.
-- ============================================================

begin;

-- ---------- 1. Currency lives on the project ----------

alter table public.projects
  add column if not exists currency text not null default 'AUD';

alter table public.profiles
  add column if not exists preferred_currency text not null default 'AUD';

-- Amounts posted before this migration are rupees. Say so explicitly.
update public.projects set currency = 'INR' where created_at < now();
update public.profiles set preferred_currency = 'INR' where created_at < now();

-- The two tables that already carried a currency keep their existing
-- values; their default is what needs correcting for anything new.
alter table public.invoices alter column currency set default 'AUD';
alter table public.recurring_invoices alter column currency set default 'AUD';

-- ISO 4217 is three letters. This will not catch a wrong code, but it
-- catches a malformed one before it reaches Intl and renders as garbage.
alter table public.projects
  add constraint projects_currency_iso check (currency ~ '^[A-Z]{3}$');
alter table public.profiles
  add constraint profiles_currency_iso check (preferred_currency ~ '^[A-Z]{3}$');

/**
 * Migration 013 replaced the table-wide SELECT on profiles with an explicit
 * column list, so a column added afterwards is unreadable until it is
 * granted. That is the safe direction to fail, but it does mean every new
 * profile column needs a line here.
 */
grant select (preferred_currency) on public.profiles to anon, authenticated;

-- ---------- 2. Rates, for display only ----------

create table if not exists public.exchange_rates (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  -- Units of this currency per 1 USD. USD itself is stored as 1 so the
  -- conversion maths needs no special case.
  rate_per_usd numeric(20, 10) not null check (rate_per_usd > 0),
  updated_at timestamptz not null default now()
);

alter table public.exchange_rates enable row level security;

-- World-readable: a signed-out visitor browsing projects needs these to
-- see an approximate price in their own currency.
create policy "exchange_rates_read" on public.exchange_rates
  for select using (true);

-- No write policies. Rates come from the platform, refreshed by the daily
-- cron with the service-role key — a user who could write here could make
-- any project appear to cost anything.

/**
 * Bulk upsert from the rate feed.
 *
 * service_role only, and guarded rather than relying on the grant alone —
 * migration 010 is a standing reminder that a REVOKE can silently fail.
 */
create or replace function public.upsert_exchange_rates(p_rates jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer := 0;
begin
  perform public.require_service_role();

  insert into exchange_rates (code, rate_per_usd, updated_at)
  select upper(key), (value #>> '{}')::numeric, now()
    from jsonb_each(p_rates)
   where upper(key) ~ '^[A-Z]{3}$'
     and (value #>> '{}')::numeric > 0
  on conflict (code) do update
     set rate_per_usd = excluded.rate_per_usd,
         updated_at = excluded.updated_at;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.upsert_exchange_rates(jsonb)
  from anon, authenticated, public;
grant execute on function public.upsert_exchange_rates(jsonb) to service_role;

-- ---------- 3. Invoices inherit the project's currency ----------

create or replace function public.invoice_currency_from_project() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cur text;
begin
  -- Only fill it in when the caller did not set one, so an explicit
  -- currency on an invoice is never overwritten.
  if new.currency is null or new.currency = 'AUD' then
    select currency into v_cur from projects where id = new.project_id;
    if v_cur is not null then new.currency := v_cur; end if;
  end if;
  return new;
end $$;

drop trigger if exists invoices_inherit_currency on public.invoices;
create trigger invoices_inherit_currency
  before insert on public.invoices
  for each row execute function public.invoice_currency_from_project();

drop trigger if exists recurring_inherit_currency on public.recurring_invoices;
create trigger recurring_inherit_currency
  before insert on public.recurring_invoices
  for each row execute function public.invoice_currency_from_project();

commit;

-- ============================================================
-- NEXT: load rates. The daily invoice cron does this, or run it once now:
--   curl -H "Authorization: Bearer $CRON_SECRET" \
--        http://localhost:3000/api/cron/invoices
--
-- VERIFY
--   select title, currency, budget_stated from public.projects;
--   select preferred_currency, count(*) from public.profiles
--    group by preferred_currency;
--   select count(*), max(updated_at) from public.exchange_rates;
-- ============================================================
