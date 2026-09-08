-- ============================================================
-- PER-CURRENCY TOTALS, NO EXCHANGE RATES
--
-- Migration 021 normalised every payment to USD so lifetime totals could
-- be summed across currencies and converted for display. That worked, but
-- it bought a dependency: the rate table had to be refreshed daily or the
-- numbers quietly went stale, and every figure it produced was an
-- approximation.
--
-- Lifetime totals are now kept per currency instead:
--
--   {"INR": 15000, "AUD": 1200}   ->   "₹15,000 · A$1,200"
--
-- Exact, needs no rate feed, and nothing to keep up to date. A total
-- spanning two currencies genuinely is two numbers; showing it as one was
-- always a convenience rather than a truth.
--
-- WHAT IS KEPT
--
-- transactions.currency stays — it is what makes any of this possible.
-- transactions.amount_usd stays too: the values already recorded are a
-- real historical record, and dropping a column to tidy up loses data that
-- cannot be recomputed at the rate that applied at the time.
--
-- The exchange_rates table is left in place but nothing reads it any more.
--
-- Run AFTER 021_currency_aware_totals.sql.
-- ============================================================

begin;

-- ---------- 1. Totals become maps ----------

alter table public.profiles
  add column if not exists earnings_by_currency jsonb not null default '{}'::jsonb,
  add column if not exists spending_by_currency jsonb not null default '{}'::jsonb;

-- Migration 013 replaced the table-wide SELECT with an explicit list, so
-- new columns are unreadable until granted.
grant select (earnings_by_currency, spending_by_currency)
  on public.profiles to anon, authenticated;

-- ---------- 2. Build them per currency ----------

create or replace function public.refresh_financials(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles p set
    -- Exact, per currency. This is what the UI shows.
    earnings_by_currency = coalesce((
      select jsonb_object_agg(currency, total)
        from (
          select currency, sum(amount) as total
            from transactions
           where payee_id = p_user and type = 'release' and status = 'completed'
           group by currency
          having sum(amount) > 0
        ) x
    ), '{}'::jsonb),

    spending_by_currency = coalesce((
      select jsonb_object_agg(currency, total)
        from (
          select currency,
                 sum(case when type = 'escrow_fund' and payer_id = p_user then amount else 0 end)
                 - sum(case when type = 'refund' and payee_id = p_user then amount else 0 end)
                 as total
            from transactions
           where status = 'completed'
             and (payer_id = p_user or payee_id = p_user)
             and type in ('escrow_fund', 'refund')
           group by currency
          having sum(case when type = 'escrow_fund' and payer_id = p_user then amount else 0 end)
               - sum(case when type = 'refund' and payee_id = p_user then amount else 0 end) > 0
        ) y
    ), '{}'::jsonb),

    -- Kept so a single-currency user still has a plain number to sort and
    -- filter on. Meaningless across currencies, which is why nothing
    -- displays it any more.
    total_earned = coalesce((select sum(amount) from transactions
                             where payee_id = p_user and type = 'release' and status = 'completed'), 0),
    total_spent = greatest(0,
      coalesce((select sum(amount) from transactions
                where payer_id = p_user and type = 'escrow_fund' and status = 'completed'), 0)
      - coalesce((select sum(amount) from transactions
                  where payee_id = p_user and type = 'refund' and status = 'completed'), 0))
  where p.id = p_user;
end $$;

-- ---------- 3. Rebuild everyone ----------

do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.refresh_financials(r.id);
  end loop;
end $$;

-- ---------- 4. Stop maintaining the USD mirror ----------

-- repair_transaction_usd existed to backfill amount_usd once rates landed.
-- Nothing reads that column now, so the repair job goes with the refresh.
drop function if exists public.repair_transaction_usd();

alter table public.profiles
  drop column if exists total_earned_usd,
  drop column if exists total_spent_usd;

commit;

-- ============================================================
-- VERIFY
--   select full_name, earnings_by_currency, spending_by_currency
--     from public.profiles
--    where earnings_by_currency <> '{}' or spending_by_currency <> '{}';
-- ============================================================
