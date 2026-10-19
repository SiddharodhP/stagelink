-- ============================================================
-- WHAT HAPPENS TO THE MONEY WHEN A DISPUTE IS DECIDED
--
-- 030 split "released" from "paid": approving a milestone opens a payout
-- that stays pending until somebody actually sends the money. resolve_dispute
-- was written long before that and still does what approve_milestone used to
-- do -- marks the milestone paid, writes a release transaction, and stops.
--
-- So a dispute decided in the freelancer's favour left money owed with no
-- payout row. It would never appear in the payout queue, and nobody would
-- ever be told to send it. The freelancer wins the argument and is not paid.
--
-- THE OTHER HALF: REFUNDS
--
-- resolve_dispute('refund') writes a refund transaction and cancels the
-- milestone. Nothing goes back to the client. That was harmless while funding
-- was simulated; now that clients genuinely pay through Razorpay, a refund
-- that does not refund is money quietly kept.
--
-- Refunds are therefore given the same treatment payouts got in 030: a record
-- of money owed back, carrying a provider and a reference, honest about being
-- unsent until somebody sends it. Razorpay has a refunds API and it can be
-- called later through exactly these two functions -- nothing above this layer
-- has to change when it is.
--
-- Run AFTER 030_freelancer_payouts.sql.
-- ============================================================

begin;

-- ---------- 1. Money owed back to a client ----------
--
-- Deliberately shaped like payouts, down to the column names. The two are
-- the same idea pointing in opposite directions, and a reader who has
-- understood one should not have to learn a second vocabulary.

do $$ begin
  create type refund_status as enum ('pending', 'processing', 'paid', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.refunds (
  id             uuid primary key default gen_random_uuid(),

  -- One refund per milestone, enforced here rather than in application code
  -- so a retry cannot produce a second one.
  milestone_id   uuid not null unique references public.milestones(id) on delete restrict,
  contract_id    uuid not null references public.contracts(id) on delete restrict,
  project_id     uuid not null references public.projects(id) on delete restrict,

  -- The client gets their money back, so they are the payee here.
  payee_id       uuid not null references public.profiles(id) on delete restrict,

  amount         integer not null check (amount > 0),
  status         refund_status not null default 'pending',

  -- 'manual' until the Razorpay refunds API is wired in, at which point this
  -- says 'razorpay' and reference holds rfnd_xxx.
  provider       text not null default 'manual',
  reference      text,

  -- What was being refunded, so the record explains itself later.
  reason         text,

  failure_reason text,

  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  failed_at      timestamptz,

  constraint refund_paid_has_reference check (
    status <> 'paid' or (reference is not null and length(trim(reference)) > 0)
  ),
  constraint refund_failed_has_reason check (
    status <> 'failed' or (failure_reason is not null and length(trim(failure_reason)) > 0)
  )
);

create index if not exists refunds_payee_idx  on public.refunds (payee_id, created_at desc);
create index if not exists refunds_status_idx on public.refunds (status, created_at);

alter table public.refunds enable row level security;

drop policy if exists "refunds_payee_select" on public.refunds;
create policy "refunds_payee_select" on public.refunds
  for select using (payee_id = auth.uid() or public.is_admin());

-- No insert, update or delete policy. Writes go through the functions below.

-- ---------- 2. Deciding a dispute ----------
--
-- The rules about who may decide and what the outcomes mean are unchanged.
-- What changes is that both outcomes now leave a record of money that is owed
-- and has not moved, instead of only one of them doing so.

create or replace function public.resolve_dispute(
  p_dispute_id uuid,
  p_outcome text,
  p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_d disputes%rowtype; v_m milestones%rowtype; v_c contracts%rowtype;
  v_has_account boolean;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);
  if not public.is_admin() then raise exception 'Admins only'; end if;

  select * into v_d from disputes where id = p_dispute_id;
  if v_d.id is null then raise exception 'Dispute not found'; end if;
  if v_d.status = 'resolved' then raise exception 'Already resolved'; end if;

  select * into v_m from milestones where id = v_d.milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;
  select * into v_c from contracts where id = v_d.contract_id;
  if v_c.id is null then raise exception 'Contract not found'; end if;

  if p_outcome = 'release' then
    update milestones set status = 'paid', approved_at = now() where id = v_m.id;

    insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id,
                              type, amount, status, reference)
    values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.freelancer_id,
            'release', v_m.amount, 'completed', 'DISPUTE');

    -- The line that was missing. Without it the freelancer wins the dispute
    -- and the money never reaches the payout queue.
    insert into payouts (milestone_id, contract_id, project_id, payee_id, amount)
    values (v_m.id, v_c.id, v_m.project_id, v_c.freelancer_id, v_m.amount)
    on conflict (milestone_id) do nothing;

    select exists (select 1 from payout_accounts where user_id = v_c.freelancer_id)
      into v_has_account;
    if not v_has_account then
      perform public.notify(v_c.freelancer_id, 'payout_account_missing',
        'Add your payout details so we can send your money',
        'The dispute was decided in your favour.', '/settings/payouts');
    end if;

  elsif p_outcome = 'refund' then
    update milestones set status = 'cancelled' where id = v_m.id;

    -- Only money that actually arrived can be sent back. An unfunded
    -- milestone is cancelled and that is the whole of it.
    if v_m.escrow_funded then
      insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id,
                                type, amount, status, reference)
      values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.client_id,
              'refund', v_m.amount, 'completed', 'DISPUTE');

      insert into refunds (milestone_id, contract_id, project_id, payee_id, amount, reason)
      values (v_m.id, v_c.id, v_m.project_id, v_c.client_id, v_m.amount,
              'Dispute resolved in the client''s favour')
      on conflict (milestone_id) do nothing;
    end if;

  else
    raise exception 'Outcome must be release or refund';
  end if;

  update disputes set status = 'resolved', resolution_note = p_note,
         resolved_by = v_uid, resolved_at = now()
   where id = p_dispute_id;

  perform public.notify(v_c.client_id, 'dispute_resolved',
    'Dispute resolved: ' || p_outcome, p_note, '/contracts/' || v_c.id);
  perform public.notify(v_c.freelancer_id, 'dispute_resolved',
    'Dispute resolved: ' || p_outcome, p_note, '/contracts/' || v_c.id);
end $$;

-- ---------- 3. Sending a refund ----------
--
-- The mirror of record_payout_sent / record_payout_failed in 030.

create or replace function public.record_refund_sent(
  p_refund_id uuid,
  p_reference text,
  p_provider  text default 'manual'
) returns void
language plpgsql security definer set search_path = public as $$
declare v_r refunds%rowtype;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'Only the platform can send refunds';
  end if;
  perform set_config('app.in_rpc','1',true);

  if p_reference is null or length(trim(p_reference)) = 0 then
    raise exception 'A refund reference (UTR or provider refund id) is required';
  end if;

  select * into v_r from refunds where id = p_refund_id;
  if v_r.id is null then raise exception 'Refund not found'; end if;
  if v_r.status = 'paid' then return; end if;

  update refunds set
    status = 'paid', reference = trim(p_reference),
    provider = coalesce(nullif(trim(p_provider), ''), 'manual'),
    paid_at = now(), failure_reason = null, failed_at = null
  where id = p_refund_id;

  perform public.notify(v_r.payee_id, 'refund_sent',
    '₹' || v_r.amount || ' has been refunded to you',
    'Reference ' || trim(p_reference) || '.', '/contracts/' || v_r.contract_id);
end $$;

create or replace function public.record_refund_failed(
  p_refund_id uuid,
  p_reason    text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_r refunds%rowtype;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'Only the platform can send refunds';
  end if;
  perform set_config('app.in_rpc','1',true);

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A failure reason is required';
  end if;

  select * into v_r from refunds where id = p_refund_id;
  if v_r.id is null then raise exception 'Refund not found'; end if;
  if v_r.status = 'paid' then
    raise exception 'Refund % is already paid and cannot be marked failed', p_refund_id;
  end if;

  update refunds set
    status = 'failed', failure_reason = trim(p_reason), failed_at = now()
  where id = p_refund_id;
end $$;

revoke all on function public.record_refund_sent(uuid, text, text) from anon, public;
revoke all on function public.record_refund_failed(uuid, text) from anon, public;
grant execute on function public.record_refund_sent(uuid, text, text) to authenticated, service_role;
grant execute on function public.record_refund_failed(uuid, text) to authenticated, service_role;

-- ---------- 4. Promoting someone to admin ----------
--
-- Until now the only way to create an admin was to edit profiles.role in the
-- database by hand, which meant the first one could not be made through the
-- product at all. This does not solve that -- somebody still has to make the
-- first admin directly -- but it means it only ever has to happen once.
--
-- Demotion is allowed; demoting yourself is not, because an admin who removes
-- their own last privilege locks everyone out of the dispute queue.

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role marketplace_role
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_remaining integer;
begin
  v_uid := public.require_auth();
  if not public.is_admin() then raise exception 'Admins only'; end if;
  perform set_config('app.in_rpc','1',true);

  if p_user_id = v_uid and p_role <> 'admin' then
    raise exception 'You cannot remove your own admin role';
  end if;

  if p_role <> 'admin' then
    select count(*) into v_remaining from profiles
     where role = 'admin' and id <> p_user_id;
    if v_remaining = 0 then
      raise exception 'This is the last admin; promote someone else first';
    end if;
  end if;

  update profiles set role = p_role where id = p_user_id;
end $$;

revoke all on function public.set_user_role(uuid, marketplace_role) from anon, public;
grant execute on function public.set_user_role(uuid, marketplace_role) to authenticated;

commit;

-- ------------------------------------------------------------
-- MAKING THE FIRST ADMIN
--
-- set_user_role above requires an admin to call it, so the first one has to
-- be made directly. Run this once, with the id of the account that should
-- judge disputes:
--
--   update public.profiles set role = 'admin' where id = '<uuid>';
--
-- Worth thinking about before you do: whoever holds this can decide disputes
-- they are a party to. On a platform with one real user that is unavoidable;
-- on a platform with customers it is not something to leave as it is.
-- ------------------------------------------------------------
