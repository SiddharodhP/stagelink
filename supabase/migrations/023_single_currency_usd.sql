-- ============================================================
-- BACK TO ONE CURRENCY, AND THAT CURRENCY IS USD
--
-- Migrations 020-022 made currency a per-project property: a column on
-- projects, a preference on profiles, a stamp on every transaction, a rate
-- table, and lifetime totals kept as per-currency maps. It worked, but it
-- put a currency decision in front of the client on every post and made
-- every total a breakdown rather than a number.
--
-- The platform is single-currency again, the way it was before 020, with
-- USD in the place INR used to hold. One currency means an amount needs no
-- label to be unambiguous, totals are addition again, and there is nothing
-- to keep in sync.
--
-- AMOUNTS ARE RE-LABELLED, NOT CONVERTED
--
-- Rows written before 020 are genuinely rupee amounts, and the digits are
-- left exactly as they are: a 4000 stays 4000 and now reads $4,000 rather
-- than Rs 4,000. On this database that is test data, so the digits matter
-- more than the denomination.
--
-- If those figures are ever meant as real money, they need dividing by the
-- rate that applied when they were written -- and this migration is the
-- wrong place for it, because it cannot know which rows were which. The
-- note at the bottom has the statement for it.
--
-- Run AFTER 022_per_currency_totals.sql.
-- ============================================================

begin;

-- ---------- 1. The two columns that predate 020 ----------

-- invoices.currency (migration 004) and recurring_invoices.currency
-- (migration 009) are the only currency columns that survive, because
-- an invoice is a document that states its own denomination. Their
-- default moves from AUD to USD and existing rows follow.

alter table public.invoices           alter column currency set default 'USD';
alter table public.recurring_invoices alter column currency set default 'USD';

update public.invoices           set currency = 'USD' where currency <> 'USD';
update public.recurring_invoices set currency = 'USD' where currency <> 'USD';

-- ---------- 2. Stop inheriting a currency that no longer exists ----------

-- Both triggers read projects.currency, which is dropped below. Dropping
-- the column would leave them raising "column does not exist" on the next
-- insert, so they go first.

drop trigger if exists invoices_inherit_currency  on public.invoices;
drop trigger if exists recurring_inherit_currency on public.recurring_invoices;
drop function if exists public.invoice_currency_from_project();

drop trigger if exists transactions_stamp_currency on public.transactions;
drop function if exists public.stamp_transaction_currency();

-- ---------- 3. Totals are a number again ----------

-- 021 rewrote this in plpgsql and 022 rewrote it again to build JSONB maps.
-- CREATE OR REPLACE cannot take it back to `language sql`, so it is dropped
-- and recreated -- which also drops its privileges, hence the revoke below.

drop function if exists public.refresh_financials(uuid);

create function public.refresh_financials(p_user uuid) returns void
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

-- Platform-internal, exactly as migration 010 left it. Supabase grants
-- EXECUTE to anon and authenticated by name, so revoking from PUBLIC alone
-- would be a no-op here.
revoke all on function public.refresh_financials(uuid) from anon, authenticated, public;

-- Recompute for everyone, now that the maps are going away.
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.refresh_financials(r.id);
  end loop;
end $$;

-- ---------- 4. Drop what 020-022 added ----------

alter table public.profiles
  drop constraint if exists profiles_currency_iso;
alter table public.profiles
  drop column if exists preferred_currency,
  drop column if exists earnings_by_currency,
  drop column if exists spending_by_currency;

alter table public.projects
  drop constraint if exists projects_currency_iso;
alter table public.projects
  drop column if exists currency;

alter table public.transactions
  drop column if exists currency,
  drop column if exists amount_usd;

-- Nothing has read this since 022, and nothing refreshes it.
drop function if exists public.upsert_exchange_rates(jsonb);
drop table if exists public.exchange_rates;

commit;

-- ============================================================
-- VERIFY
--
--   -- all four must return zero rows:
--   select column_name, table_name from information_schema.columns
--    where table_schema = 'public'
--      and (column_name in ('preferred_currency', 'earnings_by_currency',
--                           'spending_by_currency', 'amount_usd')
--           or (column_name = 'currency'
--               and table_name in ('projects', 'transactions')));
--
--   select to_regclass('public.exchange_rates');   -- null
--
--   select distinct currency from public.invoices;  -- USD
--
--   -- totals are plain numbers again:
--   select full_name, total_earned, total_spent from public.profiles
--    where total_earned > 0 or total_spent > 0;
--
-- IF THE EXISTING AMOUNTS WERE REAL RUPEES, not test data, convert them
-- before anyone sees a 4000 presented as $4,000. Roughly 88 INR to 1 USD
-- at the time these rows were written:
--
--   update public.transactions set amount = round(amount / 88.0, 2);
--   update public.milestones     set amount = round(amount / 88.0, 2);
--   update public.projects       set budget_stated = round(budget_stated / 88.0, 2),
--                                    budget_total  = round(budget_total  / 88.0, 2);
--   update public.bids           set amount = round(amount / 88.0, 2);
--   -- then rebuild the profile totals:
--   do $$ declare r record; begin
--     for r in select id from public.profiles loop
--       perform public.refresh_financials(r.id);
--     end loop; end $$;
-- ============================================================
