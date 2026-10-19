-- ============================================================
-- NO BIDDING WITHOUT SOMEWHERE TO BE PAID
--
-- A freelancer can currently win work, deliver it, have the client approve
-- it, and only then be asked where to send the money. Right now there is
-- Rs 5,050 owed across two approved milestones with no account on file, and
-- the only prompt was a notification that is easy to miss.
--
-- WHY HERE AND NOT AT SIGNUP
--
-- Asking for bank details during onboarding is the highest-friction thing a
-- marketplace can do: it lands before anyone has earned a rupee, from a site
-- they have just met, and the onboarding flow is deliberately skippable
-- because a half-finished profile beats an abandoned one.
--
-- It is also unnecessary. Nobody can be owed a payout without first bidding
-- and winning, so a gate on bidding covers *everyone who could ever be a
-- payee* -- the same coverage signup would give -- while asking at the one
-- moment the freelancer is motivated, because they want this job.
--
-- Enforced in the database rather than only in the form. A check that lives
-- in a React component is a suggestion; anyone posting to PostgREST directly
-- skips it, and the UI message is a courtesy, not the rule.
--
-- Run AFTER 032_admin_bootstrap.sql.
-- ============================================================

begin;

create or replace function public.validate_bid_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_project projects%rowtype; v_role marketplace_role;
begin
  select * into v_project from projects where id = new.project_id;
  if v_project.id is null then raise exception 'Project not found'; end if;
  if v_project.status <> 'open' then raise exception 'Project is not open for bids'; end if;
  if v_project.client_id = new.freelancer_id then
    raise exception 'You cannot bid on your own project';
  end if;

  select role into v_role from profiles where id = new.freelancer_id;
  if v_role is distinct from 'freelancer' then raise exception 'Only freelancers can bid'; end if;

  -- The new rule. Worded for the person who hits it: it says what to do, not
  -- merely what went wrong.
  if not exists (select 1 from payout_accounts where user_id = new.freelancer_id) then
    raise exception 'Add your payout details before bidding so we can pay you when the work is approved';
  end if;

  return new;
end $$;

commit;

-- ------------------------------------------------------------
-- EXISTING FREELANCERS
--
-- This applies to new bids only. Anyone who has already bid, or who is owed
-- money now, is unaffected -- they keep their contracts and their payouts
-- stay in the queue. They will be asked the next time they bid, and the
-- dashboard banner asks sooner than that.
--
-- Nothing is backfilled, because there is nothing to backfill: payout
-- details are not something the platform can invent on someone's behalf.
-- ------------------------------------------------------------
