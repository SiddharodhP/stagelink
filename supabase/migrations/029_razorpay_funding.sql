-- ============================================================
-- RAZORPAY: FUNDING A MILESTONE WITH REAL MONEY
--
-- Until now fund_milestone flipped a boolean and wrote a transaction with
-- the reference 'SIMULATED'. The column was always meant for this: migration
-- 001 commented it "provider ref once a PSP is integrated".
--
-- WHY THE BROWSER CANNOT BE TRUSTED TO SAY A MILESTONE IS FUNDED
--
-- Razorpay Checkout hands the browser a payment id and a signature on
-- success. A browser can be made to say anything, so that callback is a hint
-- that something probably worked -- not proof. The only thing that proves a
-- payment is a webhook from Razorpay, signature-verified with a secret the
-- browser never sees.
--
-- So fund_milestone is split in two:
--
--   razorpay_begin_funding   the client starts a payment; records the order
--                            id against the milestone and nothing else
--   razorpay_confirm_funding the webhook confirms it; flips escrow_funded,
--                            writes the transaction with the real payment id
--
-- The second is service-role only. An authenticated user calling it would be
-- marking their own milestone paid without paying.
--
-- Run AFTER 028_back_to_rupees.sql.
-- ============================================================

begin;

-- ---------- 1. Where a payment is recorded ----------

alter table public.milestones
  add column if not exists razorpay_order_id   text,
  add column if not exists razorpay_payment_id text,
  add column if not exists funded_at           timestamptz;

-- One order per milestone, so a retry cannot create a second live order and
-- a double payment cannot be recorded against the same stage.
create unique index if not exists milestones_razorpay_order_idx
  on public.milestones (razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists milestones_razorpay_payment_idx
  on public.milestones (razorpay_payment_id)
  where razorpay_payment_id is not null;

-- ---------- 2. Webhooks arrive more than once ----------
--
-- Razorpay retries until it gets a 2xx, and will happily deliver the same
-- event twice even after one. Every handler records the event id here first
-- and does nothing if it is already present.

create table if not exists public.payment_events (
  id          text primary key,
  provider    text not null default 'razorpay',
  event       text not null,
  payload     jsonb,
  received_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;
-- No policy at all: nothing reaches this table except the service role,
-- which bypasses RLS. Reading it is an admin job through the dashboard.

-- ---------- 3. The client starts a payment ----------

create or replace function public.razorpay_begin_funding(
  p_milestone_id uuid,
  p_order_id text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype; v_prior integer;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);

  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;

  select * into v_c from contracts
   where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.client_id is distinct from v_uid then
    raise exception 'Only the client can fund milestones';
  end if;
  if v_m.status <> 'pending' then raise exception 'Milestone is not pending'; end if;
  if v_m.escrow_funded then raise exception 'Milestone is already funded'; end if;

  -- Same ordering rule the simulated version enforced: a later stage cannot
  -- be funded while an earlier one is unsettled.
  select count(*) into v_prior from milestones
   where project_id = v_m.project_id and seq < v_m.seq
     and status not in ('paid','cancelled');
  if v_prior > 0 then
    raise exception 'Fund milestones in order - earlier milestones are not settled yet';
  end if;

  update milestones set razorpay_order_id = p_order_id where id = p_milestone_id;
end $$;

revoke all on function public.razorpay_begin_funding(uuid, text) from public;
grant execute on function public.razorpay_begin_funding(uuid, text) to authenticated;

-- ---------- 4. The webhook confirms it ----------
--
-- Mirrors what fund_milestone did, with the provider's payment id in place
-- of 'SIMULATED'. Idempotent on two counts: the unique index on
-- razorpay_payment_id, and the escrow_funded check.

create or replace function public.razorpay_confirm_funding(
  p_order_id text,
  p_payment_id text,
  p_amount integer
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_m milestones%rowtype; v_c contracts%rowtype;
begin
  perform public.require_service_role();
  perform set_config('app.in_rpc','1',true);

  select * into v_m from milestones where razorpay_order_id = p_order_id;
  if v_m.id is null then
    raise exception 'No milestone holds Razorpay order %', p_order_id;
  end if;

  -- Already handled. Saying so is not an error: a retried webhook is
  -- normal, and raising here would make Razorpay retry forever.
  if v_m.escrow_funded then return v_m.id; end if;

  if p_amount is distinct from v_m.amount then
    raise exception 'Razorpay paid % but milestone % is %',
      p_amount, v_m.id, v_m.amount;
  end if;

  select * into v_c from contracts
   where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then
    raise exception 'No active contract for milestone %', v_m.id;
  end if;

  insert into transactions (
    project_id, contract_id, milestone_id, payer_id, payee_id,
    type, amount, status, reference
  ) values (
    v_m.project_id, v_c.id, v_m.id, v_c.client_id, null,
    'escrow_fund', v_m.amount, 'completed', p_payment_id
  );

  update milestones
     set escrow_funded = true,
         status = 'in_progress',
         razorpay_payment_id = p_payment_id,
         funded_at = now()
   where id = v_m.id;

  perform public.notify(v_c.freelancer_id, 'milestone_funded',
    'Milestone "' || v_m.title || '" is funded - work can begin',
    '₹' || v_m.amount || ' is held in escrow.', '/contracts/' || v_c.id);

  return v_m.id;
end $$;

revoke all on function public.razorpay_confirm_funding(text, text, integer)
  from anon, authenticated, public;
grant execute on function public.razorpay_confirm_funding(text, text, integer)
  to service_role;

commit;

-- ------------------------------------------------------------
-- STILL SIMULATED: RELEASING TO THE FREELANCER
--
-- approve_milestone writes a 'release' transaction and marks the milestone
-- paid, but no money leaves the platform. Paying the freelancer needs
-- Razorpay Route: a Linked Account per freelancer, and a Transfer created
-- with on_hold = true at funding time, flipped to on_hold = false on
-- approval. That is its own migration, and it needs Route enabled on the
-- Razorpay account first.
-- ------------------------------------------------------------
