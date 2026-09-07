-- ============================================================
-- FIX: projects could not be published after 018
--
-- Migration 018 moved milestone planning to after the award but left two
-- things behind that still assumed milestones exist at posting time.
--
-- 1. validate_project_update() refused every draft -> open transition
--    with "Add at least one milestone before publishing". Nothing could be
--    published at all.
--
-- 2. sync_budget_total() sets projects.budget_total to the sum of
--    milestones, which is now 0 until a plan is agreed. budget_total is
--    read in fifteen places — project cards, the browse filters, sorting,
--    the detail page, JobPosting JSON-LD — so every project advertised
--    a budget of zero and the budget filters matched nothing.
--
-- The second one is fixed at the trigger rather than at the fifteen call
-- sites: budget_total now falls back to what the client advertised while
-- no milestones exist, and becomes the agreed plan total once they do.
-- That keeps every existing read correct without touching any of them.
--
-- Run AFTER 018_milestones_after_award.sql.
-- ============================================================

begin;

-- ---------- 1. Publishing needs a budget, not milestones ----------

create or replace function public.validate_project_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not public.in_rpc() then
    if old.status = 'draft' and new.status = 'open' then
      -- Milestones are agreed with the freelancer after the award now, so
      -- the thing a project must have to go live is a budget for people to
      -- bid against.
      if coalesce(new.budget_stated, 0) <= 0 then
        raise exception 'Add a budget before publishing';
      end if;
      new.published_at := now();
    elsif old.status in ('draft','open') and new.status = 'cancelled' then
      if exists (
        select 1 from contracts
         where project_id = old.id and status in ('pending_acceptance','active')
      ) then
        raise exception 'Cancel the contract first';
      end if;
    else
      raise exception 'Project status % → % is managed by the platform', old.status, new.status;
    end if;
  end if;
  return new;
end $$;

-- ---------- 2. budget_total falls back to the stated budget ----------

create or replace function public.sync_budget_total() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pid uuid; v_sum integer;
begin
  v_pid := coalesce(new.project_id, old.project_id);

  select sum(amount) into v_sum
    from milestones
   where project_id = v_pid and status <> 'cancelled';

  -- No agreed plan yet: keep showing what the client advertised, so cards,
  -- filters and structured data all stay meaningful before the award.
  update projects
     set budget_total = coalesce(nullif(v_sum, 0), budget_stated, 0)
   where id = v_pid;

  return null;
end $$;

/**
 * The same rule for a project with no milestone rows at all.
 *
 * sync_budget_total only fires from the milestones table, so a project
 * created before any milestone exists would never get its budget_total
 * set. This carries budget_stated across at insert and whenever it
 * changes, and stops as soon as a real plan exists so it can never
 * overwrite an agreed total.
 */
create or replace function public.sync_budget_floor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from milestones
     where project_id = new.id and status <> 'cancelled'
  ) then
    new.budget_total := coalesce(new.budget_stated, 0);
  end if;
  return new;
end $$;

drop trigger if exists projects_budget_floor on public.projects;
create trigger projects_budget_floor
  before insert or update of budget_stated, budget_total on public.projects
  for each row execute function public.sync_budget_floor();

-- Repair anything already posted under the broken behaviour.
update public.projects
   set budget_total = budget_stated
 where budget_stated > 0
   and not exists (
     select 1 from milestones m
      where m.project_id = projects.id and m.status <> 'cancelled'
   );

commit;

-- ============================================================
-- VERIFY
--   select title, status, budget_stated, budget_total from public.projects;
--   -- budget_total must equal budget_stated wherever no plan exists yet
-- ============================================================
