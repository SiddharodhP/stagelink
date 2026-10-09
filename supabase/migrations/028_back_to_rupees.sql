-- ============================================================
-- BACK TO RUPEES
--
-- Migration 023 moved the platform to USD. The payment provider is
-- Razorpay, which settles in INR to an Indian entity, so the prices people
-- see and the money that actually moves have to be the same currency.
--
-- AMOUNTS ARE RE-LABELLED, NOT CONVERTED
--
-- Exactly as 023 did in the other direction: a 4000 stays 4000 and now reads
-- Rs 4,000 rather than $4,000. On this database that is test data, so the
-- digits matter more than the denomination.
--
-- If any of these figures are ever meant as real money, they need multiplying
-- by the rate that applied when they were written -- and this migration is
-- the wrong place for it, because it cannot know which rows were which. The
-- note at the bottom has the statement for it.
--
-- THE RUPEE SIGNS IN NOTIFICATION TEXT ARE NOW CORRECT AGAIN
--
-- Six functions across migrations 001, 002, 006, 009, 010 and 018 build
-- notification text with a hard-coded Rs sign. Under 023 that was a bug --
-- a client on a $1,000 milestone was told "Rs 1000 is held in escrow". With
-- the platform back on rupees those strings are right, so they are left
-- exactly as they are rather than touched twice.
--
-- Run AFTER 027_skill_categories.sql.
-- ============================================================

begin;

-- ---------- 1. The two columns that carry a denomination ----------
--
-- An invoice is a document that states its own currency, so these are
-- stored rather than assumed. Everything else on the platform is a bare
-- integer, which is what lets a currency switch be this small.

alter table public.invoices           alter column currency set default 'INR';
alter table public.recurring_invoices alter column currency set default 'INR';

update public.invoices           set currency = 'INR' where currency <> 'INR';
update public.recurring_invoices set currency = 'INR' where currency <> 'INR';

-- ---------- 2. Invoice payment terms stay as they are ----------
--
-- 'Paid via Jayree escrow' and 'Net N -- payable via Jayree' name no
-- currency, so the rename in 026 is unaffected by this one.

commit;

-- ------------------------------------------------------------
-- IF THESE WERE EVER REAL DOLLARS
--
-- Run ONCE, with a rate you have chosen deliberately, and only if the
-- figures in the database were genuinely dollar amounts that should become
-- the equivalent in rupees. Re-running multiplies again.
--
--   begin;
--   update public.projects   set budget_total  = round(budget_total  * 88);
--   update public.projects   set budget_stated = round(budget_stated * 88)
--     where budget_stated is not null;
--   update public.bids       set amount        = round(amount * 88);
--   update public.contracts  set agreed_amount = round(agreed_amount * 88);
--   update public.milestones set amount        = round(amount * 88);
--   update public.transactions set amount      = round(amount * 88);
--   update public.invoices   set amount = round(amount * 88),
--                                tax_amount = round(tax_amount * 88),
--                                total_amount = round(total_amount * 88);
--   update public.profiles   set hourly_rate = round(hourly_rate * 88)
--     where hourly_rate is not null;
--   -- Lifetime totals are derived; recompute rather than scaling.
--   select public.refresh_financials(id) from public.profiles;
--   commit;
-- ------------------------------------------------------------
