-- ============================================================
-- CURRENCY-AWARE TOTALS
--
-- transactions.amount carried no currency, and refresh_financials summed
-- it straight into profiles.total_earned and total_spent. Those numbers
-- are shown publicly on profiles as a trust signal, so once two
-- currencies exist "₹4,000 + A$1,200 = 5,200" would appear on somebody's
-- profile as a fact. Adding rupees to dollars is not a rounding error, it
-- is a wrong number in the one place people look to decide whether to
-- trust a stranger with money.
--
-- FIX: NORMALISE AT WRITE TIME, NOT READ TIME
--
-- Each transaction now records its currency and its value in USD, using
-- the rate at the moment it happened. Totals sum the USD column.
--
-- Snapshotting the rate matters. Converting at read time would make
-- somebody's lifetime earnings drift every day as rates move — last
-- year's completed job would be worth something different this morning.
-- A payment is a historical fact and its recorded value should not move.
--
-- USD is the pivot only because the rate feed is USD-based. Nothing is
-- ever paid in USD; it is an internal unit for comparing across
-- currencies, converted to whatever the viewer reads in.
--
-- Run AFTER 020_multi_currency.sql.
-- ============================================================

begin;

-- ---------- 1. Transactions carry their currency ----------

alter table public.transactions
  add column if not exists currency text not null default 'AUD'
    check (currency ~ '^[A-Z]{3}$'),
  -- Null when no rate was available at insert. repair_transaction_usd()
  -- fills those in rather than letting them silently undercount a total.
  add column if not exists amount_usd numeric(20, 4);

-- Everything recorded before multi-currency was rupees.
update public.transactions set currency = 'INR' where created_at < now();

alter table public.profiles
  add column if not exists total_earned_usd numeric(20, 4) not null default 0,
  add column if not exists total_spent_usd numeric(20, 4) not null default 0;

grant select (total_earned_usd, total_spent_usd)
  on public.profiles to anon, authenticated;

-- ---------- 2. Stamp currency and USD value at insert ----------

create or replace function public.stamp_transaction_currency() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cur text; v_rate numeric;
begin
  select currency into v_cur from projects where id = new.project_id;
  if v_cur is not null then new.currency := v_cur; end if;

  if new.currency = 'USD' then
    new.amount_usd := new.amount;
  else
    select rate_per_usd into v_rate
      from exchange_rates where code = new.currency;
    -- Left null when the rate table has not been populated yet; the
    -- repair function below backfills it once rates arrive.
    new.amount_usd := case when v_rate > 0 then new.amount / v_rate else null end;
  end if;

  return new;
end $$;

drop trigger if exists transactions_stamp_currency on public.transactions;
create trigger transactions_stamp_currency
  before insert on public.transactions
  for each row execute function public.stamp_transaction_currency();

/**
 * Fills in amount_usd for rows written before a rate existed.
 *
 * Uses today's rate, which is not the rate that applied at the time — an
 * approximation, and the only option for rows that predate the rate
 * table. Run from the cron after rates refresh so the window where totals
 * undercount is at most a day.
 */
create or replace function public.repair_transaction_usd()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  perform public.require_service_role();

  update transactions t
     set amount_usd = case
       when t.currency = 'USD' then t.amount
       else t.amount / r.rate_per_usd
     end
    from exchange_rates r
   where t.amount_usd is null
     and r.code = t.currency
     and r.rate_per_usd > 0;

  get diagnostics v_count = row_count;

  -- Totals are derived from that column, so they have to be rebuilt.
  if v_count > 0 then
    perform public.refresh_financials(id) from profiles;
  end if;

  return v_count;
end $$;

revoke all on function public.repair_transaction_usd() from anon, authenticated, public;
grant execute on function public.repair_transaction_usd() to service_role;

-- ---------- 3. Totals sum the normalised column ----------

create or replace function public.refresh_financials(p_user uuid) returns void
language sql security definer set search_path = public as $$
  update profiles p set
    -- Kept in the project currency for anyone still reading them, but no
    -- longer displayed: they are only meaningful for a single-currency
    -- user, which is nobody once the marketplace is international.
    total_earned = coalesce((select sum(amount) from transactions
                             where payee_id = p_user and type = 'release' and status = 'completed'), 0),
    total_spent = greatest(0,
      coalesce((select sum(amount) from transactions
                where payer_id = p_user and type = 'escrow_fund' and status = 'completed'), 0)
      - coalesce((select sum(amount) from transactions
                  where payee_id = p_user and type = 'refund' and status = 'completed'), 0)),

    -- What the UI actually shows, converted to the viewer's currency.
    total_earned_usd = coalesce((select sum(amount_usd) from transactions
                                 where payee_id = p_user and type = 'release'
                                   and status = 'completed' and amount_usd is not null), 0),
    total_spent_usd = greatest(0,
      coalesce((select sum(amount_usd) from transactions
                where payer_id = p_user and type = 'escrow_fund'
                  and status = 'completed' and amount_usd is not null), 0)
      - coalesce((select sum(amount_usd) from transactions
                  where payee_id = p_user and type = 'refund'
                    and status = 'completed' and amount_usd is not null), 0))
  where p.id = p_user;
$$;

commit;

-- ============================================================
-- NEXT: populate rates, then repair. The cron does both:
--   curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/invoices
--
-- VERIFY
--   select currency, count(*), count(amount_usd) as priced
--     from public.transactions group by currency;
--   select full_name, total_earned, total_earned_usd from public.profiles
--    where total_earned > 0;
-- ============================================================
