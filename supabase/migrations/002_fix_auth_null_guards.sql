-- ============================================================
-- SECURITY FIX — null-safe authorization in marketplace RPCs
--
-- Problem: `auth.uid()` is NULL for anonymous callers. Comparisons like
--   `if v_contract.freelancer_id <> auth.uid() then raise ...`
-- evaluate to NULL (not TRUE) when the right side is NULL, so the guard
-- never fired and the function body continued to run. Because these are
-- SECURITY DEFINER functions they bypass RLS, so an anonymous caller with
-- the public anon key could drive contract/milestone/payment transitions.
--
-- Fix: reject NULL auth.uid() up front in every RPC, and use
-- `is distinct from` / explicit OR comparisons so a NULL can never
-- silently skip a check.
--
-- Run this AFTER 001_marketplace.sql.
-- ============================================================

begin;

-- Shared guard: every marketplace RPC must have an authenticated caller.
create or replace function public.require_auth() returns uuid
language plpgsql stable as $$
declare v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  return v_uid;
end $$;

-- ---------- accept_bid ----------
create or replace function public.accept_bid(p_bid_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_bid bids%rowtype; v_project projects%rowtype; v_contract_id uuid; r record;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_bid from bids where id = p_bid_id;
  if v_bid.id is null then raise exception 'Bid not found'; end if;
  select * into v_project from projects where id = v_bid.project_id;
  if v_project.id is null then raise exception 'Project not found'; end if;
  if v_project.client_id is distinct from v_uid then raise exception 'Only the project owner can accept bids'; end if;
  if v_project.status <> 'open' then raise exception 'Project is not open'; end if;
  if v_bid.status not in ('submitted','shortlisted') then raise exception 'This bid cannot be accepted'; end if;

  update bids set status = 'accepted' where id = p_bid_id;
  insert into contracts (project_id, bid_id, client_id, freelancer_id, agreed_amount)
  values (v_project.id, v_bid.id, v_project.client_id, v_bid.freelancer_id, v_bid.amount)
  returning id into v_contract_id;
  update projects set status = 'awarded' where id = v_project.id;

  for r in select * from bids where project_id = v_project.id and id <> p_bid_id and status in ('submitted','shortlisted') loop
    update bids set status = 'rejected' where id = r.id;
    perform public.notify(r.freelancer_id, 'bid_rejected',
      'Your bid on "' || v_project.title || '" was not selected', null, '/freelancer/bids');
  end loop;

  perform public.notify(v_bid.freelancer_id, 'bid_accepted',
    'You were selected for "' || v_project.title || '"!',
    'Review and confirm the milestone structure to start.', '/contracts/' || v_contract_id);
  return v_contract_id;
end $$;

-- ---------- respond_contract ----------
create or replace function public.respond_contract(p_contract_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_contract contracts%rowtype; v_title text;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_contract from contracts where id = p_contract_id;
  if v_contract.id is null then raise exception 'Contract not found'; end if;
  if v_contract.freelancer_id is distinct from v_uid then raise exception 'Not your contract'; end if;
  if v_contract.status <> 'pending_acceptance' then raise exception 'Contract is not awaiting acceptance'; end if;
  select title into v_title from projects where id = v_contract.project_id;

  if p_accept then
    update contracts set status = 'active', started_at = now() where id = p_contract_id;
    update projects set status = 'in_progress' where id = v_contract.project_id;
    perform public.notify(v_contract.client_id, 'contract_accepted',
      'Freelancer confirmed the milestones for "' || v_title || '"',
      'Fund the first milestone to kick off the work.', '/contracts/' || p_contract_id);
  else
    update contracts set status = 'declined' where id = p_contract_id;
    update bids set status = 'rejected' where id = v_contract.bid_id;
    update projects set status = 'open' where id = v_contract.project_id;
    perform public.notify(v_contract.client_id, 'contract_declined',
      'The freelancer declined "' || v_title || '"',
      'Your project is open again — review other bids.', '/projects/' || v_contract.project_id);
  end if;
end $$;

-- ---------- fund_milestone ----------
create or replace function public.fund_milestone(p_milestone_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype; v_prior integer;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.client_id is distinct from v_uid then raise exception 'Only the client can fund milestones'; end if;
  if v_m.status <> 'pending' then raise exception 'Milestone is not pending'; end if;
  select count(*) into v_prior from milestones
   where project_id = v_m.project_id and seq < v_m.seq and status not in ('paid','cancelled');
  if v_prior > 0 then raise exception 'Fund milestones in order — earlier milestones are not settled yet'; end if;

  insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status)
  values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, null, 'escrow_fund', v_m.amount, 'completed');
  update milestones set escrow_funded = true, status = 'in_progress' where id = p_milestone_id;

  perform public.notify(v_c.freelancer_id, 'milestone_funded',
    'Milestone "' || v_m.title || '" is funded — work can begin',
    '₹' || v_m.amount || ' is held in escrow.', '/contracts/' || v_c.id);
end $$;

-- ---------- submit_milestone ----------
create or replace function public.submit_milestone(p_milestone_id uuid, p_note text, p_attachment_url text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.freelancer_id is distinct from v_uid then raise exception 'Not your contract'; end if;
  if v_m.status not in ('in_progress','revision_requested') then raise exception 'Milestone is not in a submittable state'; end if;

  insert into milestone_submissions (milestone_id, contract_id, freelancer_id, note, attachment_url)
  values (v_m.id, v_c.id, v_uid, coalesce(p_note,''), p_attachment_url);
  update milestones set status = 'submitted', submitted_at = now(),
    auto_release_at = now() + interval '14 days' where id = p_milestone_id;

  perform public.notify(v_c.client_id, 'milestone_submitted',
    '"' || v_m.title || '" was submitted for review',
    'Approve to release ₹' || v_m.amount || ', or request a revision.', '/contracts/' || v_c.id);
end $$;

-- ---------- approve_milestone ----------
create or replace function public.approve_milestone(p_milestone_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype; v_remaining integer; v_title text;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.client_id is distinct from v_uid then raise exception 'Only the client can approve milestones'; end if;
  if v_m.status <> 'submitted' then raise exception 'Milestone is not awaiting review'; end if;
  if not v_m.escrow_funded then raise exception 'Milestone escrow was never funded'; end if;

  update milestones set status = 'paid', approved_at = now() where id = p_milestone_id;
  insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status)
  values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.freelancer_id, 'release', v_m.amount, 'completed');

  perform public.notify(v_c.freelancer_id, 'milestone_paid',
    '₹' || v_m.amount || ' released for "' || v_m.title || '"', null, '/contracts/' || v_c.id);

  select count(*) into v_remaining from milestones
   where project_id = v_m.project_id and status not in ('paid','cancelled');
  if v_remaining = 0 then
    update contracts set status = 'completed', completed_at = now() where id = v_c.id;
    update projects set status = 'completed' where id = v_m.project_id;
    select title into v_title from projects where id = v_m.project_id;
    perform public.notify(v_c.client_id, 'project_completed',
      '"' || v_title || '" is complete', 'Leave a review for your freelancer.', '/contracts/' || v_c.id);
    perform public.notify(v_c.freelancer_id, 'project_completed',
      '"' || v_title || '" is complete', 'Leave a review for your client.', '/contracts/' || v_c.id);
  end if;
end $$;

-- ---------- request_revision ----------
create or replace function public.request_revision(p_milestone_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.client_id is distinct from v_uid then raise exception 'Only the client can request revisions'; end if;
  if v_m.status <> 'submitted' then raise exception 'Milestone is not awaiting review'; end if;

  update milestones set status = 'revision_requested', revision_note = p_note, auto_release_at = null
  where id = p_milestone_id;
  perform public.notify(v_c.freelancer_id, 'revision_requested',
    'Revision requested on "' || v_m.title || '"', p_note, '/contracts/' || v_c.id);
end $$;

-- ---------- open_dispute ----------
create or replace function public.open_dispute(p_milestone_id uuid, p_reason text, p_details text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype; v_id uuid; v_other uuid; r record;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.client_id is distinct from v_uid and v_c.freelancer_id is distinct from v_uid then
    raise exception 'Not your contract';
  end if;
  if v_m.status not in ('in_progress','submitted','revision_requested') then raise exception 'This milestone cannot be disputed'; end if;

  update milestones set status = 'disputed', auto_release_at = null where id = p_milestone_id;
  insert into disputes (contract_id, milestone_id, raised_by, reason, details)
  values (v_c.id, v_m.id, v_uid, p_reason, p_details) returning id into v_id;

  v_other := case when v_uid = v_c.client_id then v_c.freelancer_id else v_c.client_id end;
  perform public.notify(v_other, 'dispute_opened',
    'A dispute was opened on "' || v_m.title || '"', p_reason, '/contracts/' || v_c.id);
  for r in select id from profiles where role = 'admin' loop
    perform public.notify(r.id, 'dispute_opened', 'New dispute requires review', p_reason, '/admin/disputes');
  end loop;
  return v_id;
end $$;

-- ---------- cancel_contract ----------
create or replace function public.cancel_contract(p_contract_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_c contracts%rowtype; v_m record; v_other uuid; v_title text;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_c from contracts where id = p_contract_id;
  if v_c.id is null then raise exception 'Contract not found'; end if;
  if v_c.client_id is distinct from v_uid and v_c.freelancer_id is distinct from v_uid then
    raise exception 'Not your contract';
  end if;
  if v_c.status not in ('pending_acceptance','active') then raise exception 'Contract is not live'; end if;

  for v_m in select * from milestones where project_id = v_c.project_id and status not in ('paid','cancelled') loop
    if v_m.escrow_funded and v_m.status in ('in_progress','submitted','revision_requested','disputed') then
      insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status, reference)
      values (v_c.project_id, v_c.id, v_m.id, v_c.client_id, v_c.client_id, 'refund', v_m.amount, 'completed', 'CANCELLATION');
    end if;
    update milestones set status = 'cancelled' where id = v_m.id;
  end loop;

  update contracts set status = 'cancelled' where id = p_contract_id;
  update projects set status = 'cancelled' where id = v_c.project_id;
  select title into v_title from projects where id = v_c.project_id;
  v_other := case when v_uid = v_c.client_id then v_c.freelancer_id else v_c.client_id end;
  perform public.notify(v_other, 'contract_cancelled',
    '"' || v_title || '" was cancelled', p_reason, '/contracts/' || p_contract_id);
end $$;

-- ---------- create_review ----------
create or replace function public.create_review(p_contract_id uuid, p_rating integer, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_c contracts%rowtype; v_reviewee uuid;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  select * into v_c from contracts where id = p_contract_id;
  if v_c.id is null then raise exception 'Contract not found'; end if;
  if v_c.client_id is distinct from v_uid and v_c.freelancer_id is distinct from v_uid then
    raise exception 'Not your contract';
  end if;
  if v_c.status not in ('completed','cancelled') then raise exception 'Reviews open once the contract ends'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Rating must be 1-5'; end if;
  v_reviewee := case when v_uid = v_c.client_id then v_c.freelancer_id else v_c.client_id end;

  insert into reviews (contract_id, reviewer_id, reviewee_id, rating, review_text)
  values (p_contract_id, v_uid, v_reviewee, p_rating, p_text);
  perform public.notify(v_reviewee, 'review_received',
    'You received a ' || p_rating || '-star review', p_text, '/u/' || v_reviewee);
end $$;

-- ---------- resolve_dispute (admin) ----------
create or replace function public.resolve_dispute(p_dispute_id uuid, p_outcome text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_d disputes%rowtype; v_m milestones%rowtype; v_c contracts%rowtype;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_d from disputes where id = p_dispute_id;
  if v_d.id is null then raise exception 'Dispute not found'; end if;
  if v_d.status = 'resolved' then raise exception 'Already resolved'; end if;
  select * into v_m from milestones where id = v_d.milestone_id;
  select * into v_c from contracts where id = v_d.contract_id;

  if p_outcome = 'release' then
    update milestones set status = 'paid', approved_at = now() where id = v_m.id;
    insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status, reference)
    values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.freelancer_id, 'release', v_m.amount, 'completed', 'DISPUTE');
  elsif p_outcome = 'refund' then
    update milestones set status = 'cancelled' where id = v_m.id;
    if v_m.escrow_funded then
      insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status, reference)
      values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.client_id, 'refund', v_m.amount, 'completed', 'DISPUTE');
    end if;
  else
    raise exception 'Outcome must be release or refund';
  end if;

  update disputes set status = 'resolved', resolution_note = p_note, resolved_by = v_uid, resolved_at = now()
  where id = p_dispute_id;
  perform public.notify(v_c.client_id, 'dispute_resolved', 'Dispute resolved: ' || p_outcome, p_note, '/contracts/' || v_c.id);
  perform public.notify(v_c.freelancer_id, 'dispute_resolved', 'Dispute resolved: ' || p_outcome, p_note, '/contracts/' || v_c.id);
end $$;

commit;
