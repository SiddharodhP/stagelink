-- ============================================================
-- MILESTONES MOVE AFTER THE AWARD
--
-- Until now the client had to invent the entire milestone breakdown before
-- posting, months before meeting whoever would do the work. That is the
-- wrong moment: nobody can stage a shoot they have not discussed, and the
-- person who knows how to stage it has not been chosen yet.
--
-- New order:
--   1. client posts a project with a stated budget, no milestones
--   2. freelancers bid
--   3. client accepts a bid -> contract opens, and so does a chat thread
--   4. they discuss scope in that thread
--   5. client drafts the milestones on the contract
--   6. client sends the plan; the freelancer confirms or declines
--   7. funding and delivery proceed exactly as before
--
-- WHY NO NEW CONTRACT STATUS
--
-- The obvious move is a 'planning' value on contract_status. PostgreSQL
-- will not let a value added by ALTER TYPE ... ADD VALUE be used in the
-- same transaction that adds it, so that would mean splitting this into
-- two migrations that must be run in order and cannot be rolled back
-- together.
--
-- plan_sent_at carries the same information with no enum change:
--   pending_acceptance + plan_sent_at null      -> discussing and drafting
--   pending_acceptance + plan_sent_at set       -> freelancer's turn
--   active                                      -> agreed, work under way
--
-- The freelancer still confirms before anything starts. That was the
-- original promise of the product and it is on the homepage in as many
-- words; moving when milestones are written should not quietly remove the
-- agreement step.
--
-- Run AFTER 017_project_comments.sql.
-- ============================================================

begin;

-- ---------- 1. New state ----------

alter table public.contracts
  add column if not exists plan_sent_at timestamptz;

/**
 * What the client advertised when posting.
 *
 * budget_total stays what it always was — the sum of agreed milestones,
 * maintained by trigger — which is now 0 until a plan exists. These are
 * genuinely different numbers: what was advertised, and what was agreed
 * after talking. Freelancers bid against the first.
 */
alter table public.projects
  add column if not exists budget_stated integer not null default 0
    check (budget_stated >= 0);

-- Projects posted under the old flow advertised their milestone sum.
update public.projects
   set budget_stated = budget_total
 where budget_stated = 0 and budget_total > 0;

-- ---------- 2. Who may edit milestones, and when ----------

/**
 * Milestones are editable in two windows: while the project is still a
 * draft or open for bids (the old rule), and after a bid is accepted but
 * before the plan has been sent to the freelancer (the new one).
 *
 * Once the plan is sent the structure is frozen. A client who could still
 * rewrite it afterwards would make the freelancer's confirmation
 * meaningless — they would be agreeing to something that can change under
 * them.
 */
create or replace function public.can_edit_milestones(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from projects p
     where p.id = p_project_id
       and p.client_id = auth.uid()
       and (
         p.status in ('draft', 'open')
         or (
           p.status = 'awarded'
           and exists (
             select 1 from contracts c
              where c.project_id = p.id
                and c.status = 'pending_acceptance'
                and c.plan_sent_at is null
           )
         )
       )
  )
$$;

drop policy if exists "milestones_write" on public.milestones;
create policy "milestones_write" on public.milestones for insert
  with check (public.can_edit_milestones(project_id));

drop policy if exists "milestones_update" on public.milestones;
create policy "milestones_update" on public.milestones for update
  using (public.can_edit_milestones(project_id));

drop policy if exists "milestones_delete" on public.milestones;
create policy "milestones_delete" on public.milestones for delete
  using (public.can_edit_milestones(project_id));

-- The row-level triggers enforced the same old window; widen them to match.
create or replace function public.validate_milestone_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status
      or new.escrow_funded is distinct from old.escrow_funded
      or new.submitted_at is distinct from old.submitted_at
      or new.approved_at is distinct from old.approved_at) and not public.in_rpc() then
    raise exception 'Milestone lifecycle fields can only be changed by the platform';
  end if;

  if (new.title, new.description, new.deliverables, new.amount, new.due_date, new.seq)
     is distinct from (old.title, old.description, old.deliverables, old.amount, old.due_date, old.seq)
     and not public.in_rpc()
     and not public.can_edit_milestones(old.project_id) then
    raise exception 'The plan is locked once it has been sent to the freelancer';
  end if;
  return new;
end $$;

create or replace function public.validate_milestone_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.in_rpc() and not public.can_edit_milestones(old.project_id) then
    raise exception 'The plan is locked once it has been sent to the freelancer';
  end if;
  return old;
end $$;

-- ---------- 3. Accepting a bid opens the conversation ----------

create or replace function public.accept_bid(p_bid_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_bid bids%rowtype; v_project projects%rowtype;
  v_contract_id uuid; r record; v_conv_id uuid;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);

  select * into v_bid from bids where id = p_bid_id;
  if v_bid.id is null then raise exception 'Bid not found'; end if;
  select * into v_project from projects where id = v_bid.project_id;
  if v_project.id is null then raise exception 'Project not found'; end if;
  if v_project.client_id is distinct from v_uid then
    raise exception 'Only the project owner can accept bids';
  end if;
  if v_project.status <> 'open' then raise exception 'Project is not open'; end if;
  if v_bid.status not in ('submitted','shortlisted') then
    raise exception 'This bid cannot be accepted';
  end if;

  update bids set status = 'accepted' where id = p_bid_id;
  insert into contracts (project_id, bid_id, client_id, freelancer_id, agreed_amount)
  values (v_project.id, v_bid.id, v_project.client_id, v_bid.freelancer_id, v_bid.amount)
  returning id into v_contract_id;
  update projects set status = 'awarded' where id = v_project.id;

  for r in select * from bids
            where project_id = v_project.id and id <> p_bid_id
              and status in ('submitted','shortlisted') loop
    update bids set status = 'rejected' where id = r.id;
    perform public.notify(r.freelancer_id, 'bid_rejected',
      'Your bid on "' || v_project.title || '" was not selected', null, '/freelancer/bids');
  end loop;

  -- The plan is meant to come out of a conversation, so open one rather
  -- than expecting either side to go and start it.
  select id into v_conv_id from conversations
   where project_id = v_project.id
     and ((participant_1 = v_project.client_id and participant_2 = v_bid.freelancer_id)
       or (participant_1 = v_bid.freelancer_id and participant_2 = v_project.client_id))
   limit 1;

  if v_conv_id is null then
    insert into conversations (participant_1, participant_2, project_id)
    values (v_project.client_id, v_bid.freelancer_id, v_project.id)
    returning id into v_conv_id;
  end if;

  perform public.notify(v_bid.freelancer_id, 'bid_accepted',
    'You were selected for "' || v_project.title || '"!',
    'Discuss the work with the client — they will send a milestone plan for you to confirm.',
    '/contracts/' || v_contract_id);

  return v_contract_id;
end $$;

-- ---------- 4. Client sends the plan ----------

create or replace function public.submit_milestone_plan(p_contract_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_c contracts%rowtype; v_count integer;
  v_total integer; v_title text;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);

  select * into v_c from contracts where id = p_contract_id;
  if v_c.id is null then raise exception 'Contract not found'; end if;
  if v_c.client_id is distinct from v_uid then
    raise exception 'Only the client can send the plan';
  end if;
  if v_c.status <> 'pending_acceptance' then
    raise exception 'This contract is not being planned';
  end if;
  if v_c.plan_sent_at is not null then
    raise exception 'The plan has already been sent';
  end if;

  select count(*), coalesce(sum(amount), 0) into v_count, v_total
    from milestones
   where project_id = v_c.project_id and status <> 'cancelled';

  if v_count = 0 then
    raise exception 'Add at least one milestone before sending the plan';
  end if;

  update contracts
     set plan_sent_at = now(), agreed_amount = v_total
   where id = p_contract_id;

  select title into v_title from projects where id = v_c.project_id;

  perform public.notify(
    v_c.freelancer_id, 'plan_received',
    'Milestone plan for "' || coalesce(v_title, 'your project') || '"',
    v_count || ' milestones · ₹' || v_total || ' total — confirm to start.',
    '/contracts/' || p_contract_id
  );
end $$;

-- ---------- 5. Confirming requires a plan to confirm ----------

create or replace function public.respond_contract(p_contract_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_contract contracts%rowtype; v_title text;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);

  select * into v_contract from contracts where id = p_contract_id;
  if v_contract.id is null then raise exception 'Contract not found'; end if;
  if v_contract.freelancer_id is distinct from v_uid then
    raise exception 'Not your contract';
  end if;
  if v_contract.status <> 'pending_acceptance' then
    raise exception 'Contract is not awaiting acceptance';
  end if;
  -- Nothing to agree to until the client has sent one.
  if v_contract.plan_sent_at is null then
    raise exception 'The client has not sent the milestone plan yet';
  end if;

  select title into v_title from projects where id = v_contract.project_id;

  if p_accept then
    update contracts set status = 'active', started_at = now() where id = p_contract_id;
    update projects set status = 'in_progress' where id = v_contract.project_id;
    perform public.notify(v_contract.client_id, 'contract_accepted',
      'Milestones confirmed for "' || v_title || '"',
      'Fund the first milestone to kick off the work.', '/contracts/' || p_contract_id);
  else
    -- Declining returns it to drafting rather than killing the contract:
    -- the usual reason is that the plan needs changing, not that the whole
    -- engagement is off. The client can revise and send again.
    update contracts set plan_sent_at = null where id = p_contract_id;
    perform public.notify(v_contract.client_id, 'plan_rejected',
      'The freelancer asked for changes to "' || v_title || '"',
      'Revise the milestones and send the plan again.', '/contracts/' || p_contract_id);
  end if;
end $$;

-- ---------- 6. Grants ----------

grant execute on function public.submit_milestone_plan(uuid) to authenticated;
revoke all on function public.submit_milestone_plan(uuid) from anon;
grant execute on function public.can_edit_milestones(uuid) to authenticated;

commit;

-- ============================================================
-- VERIFY
--   select id, status, plan_sent_at, agreed_amount from public.contracts;
--   select title, status, budget_stated, budget_total from public.projects;
--
--   -- anonymous callers must be rejected:
--   select public.submit_milestone_plan('00000000-0000-0000-0000-000000000000');
-- ============================================================
