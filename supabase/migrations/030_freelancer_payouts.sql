-- ============================================================
-- PAYING THE FREELANCER
--
-- 029 made funding real: a client's money genuinely moves, through Razorpay,
-- and a webhook is what proves it. The other half was still a fiction.
--
-- WHAT WAS WRONG
--
-- approve_milestone marked a milestone 'paid' and wrote a 'release'
-- transaction, and user_financials counted those releases as total_earned. So
-- a freelancer was shown money they had earned as money they had been paid,
-- when in truth nothing had left the platform. The two are different events
-- and conflating them is how a marketplace ends up unable to answer "where is
-- my money".
--
--   RELEASE   the client approved; the amount is owed to the freelancer and
--             is no longer refundable to the client. This is a decision.
--   PAYOUT    the money actually reached the freelancer's bank or UPI id.
--             This is a bank transfer, and it happens later.
--
-- So approve_milestone still releases, but it now also opens a payout that is
-- honestly 'pending' until somebody sends the money and records the reference.
--
-- DELIBERATELY PROVIDER-AGNOSTIC
--
-- A payout carries a provider and a reference and nothing else about how it
-- was sent. Today the provider is 'manual': a human transfers the money and
-- records the UTR. When an automated rail is added, it records its own
-- provider name and payout id through the same two functions and nothing
-- above this layer changes. The workflow is complete either way, which is the
-- point -- it does not wait on anything outside this database to be useful.
--
-- Run AFTER 029_razorpay_funding.sql.
-- ============================================================

begin;

-- ---------- 0. Asking about the service role without raising ----------
--
-- 010 has require_service_role(), which raises when the caller is not the
-- service role. That is right for a function only the platform may call, but
-- the payout functions below accept either an admin or the service role, and
-- a guard that throws cannot be one half of an `or`. Same claim, as a
-- predicate.

create or replace function public.is_service_role() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  ) = 'service_role'
$$;

revoke all on function public.is_service_role() from anon, authenticated, public;

-- ---------- 1. Where a freelancer wants to be paid ----------
--
-- A SEPARATE TABLE, not columns on profiles. profiles is selected openly all
-- over the app -- the public profile page at /u/[id] reads it -- and one
-- stray select * would put bank account numbers in a server response. Keeping
-- them out of that table means that mistake cannot be made.

do $$ begin
  create type payout_method as enum ('upi', 'bank');
exception when duplicate_object then null; end $$;

create table if not exists public.payout_accounts (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  method         payout_method not null,

  -- UPI
  upi_vpa        text,

  -- Bank
  account_name   text,
  account_number text,
  ifsc           text,

  -- Set by whoever sends the first successful payout: a transfer that lands
  -- is the only real proof the details are right.
  verified       boolean not null default false,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Whichever method is chosen, its own fields have to be present. Without
  -- this a half-filled row looks payable and fails at the bank.
  constraint payout_account_complete check (
    (method = 'upi'  and upi_vpa is not null and length(trim(upi_vpa)) > 0)
    or
    (method = 'bank' and account_name   is not null and length(trim(account_name))   > 0
                     and account_number is not null and length(trim(account_number)) > 0
                     and ifsc           is not null and length(trim(ifsc))           > 0)
  )
);

alter table public.payout_accounts enable row level security;

drop policy if exists "payout_accounts_own_select" on public.payout_accounts;
create policy "payout_accounts_own_select" on public.payout_accounts
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "payout_accounts_own_insert" on public.payout_accounts;
create policy "payout_accounts_own_insert" on public.payout_accounts
  for insert with check (user_id = auth.uid());
drop policy if exists "payout_accounts_own_update" on public.payout_accounts;
create policy "payout_accounts_own_update" on public.payout_accounts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "payout_accounts_own_delete" on public.payout_accounts;
create policy "payout_accounts_own_delete" on public.payout_accounts
  for delete using (user_id = auth.uid());

-- ---------- 2. The payout itself ----------

do $$ begin
  create type payout_status as enum ('pending', 'processing', 'paid', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.payouts (
  id             uuid primary key default gen_random_uuid(),

  -- One payout per milestone. This unique constraint is the thing that makes
  -- paying twice impossible, rather than a check somewhere in application
  -- code that a retry can race past.
  milestone_id   uuid not null unique references public.milestones(id) on delete restrict,
  contract_id    uuid not null references public.contracts(id) on delete restrict,
  project_id     uuid not null references public.projects(id) on delete restrict,
  payee_id       uuid not null references public.profiles(id) on delete restrict,

  amount         integer not null check (amount > 0),
  status         payout_status not null default 'pending',

  -- 'manual' until an automated rail exists. Named rather than assumed, so
  -- the history stays readable once there is more than one.
  provider       text not null default 'manual',

  -- The UTR for a bank transfer, or the provider's own payout id.
  reference      text,

  -- Where the money actually went, captured when it is sent rather than when
  -- it is queued: a freelancer may change their account in between, and the
  -- record has to say where it really landed, not where it might have.
  sent_to        jsonb,

  failure_reason text,

  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  failed_at      timestamptz,

  -- A paid payout must say how it was paid; a failed one must say why.
  constraint payout_paid_has_reference check (
    status <> 'paid' or (reference is not null and length(trim(reference)) > 0)
  ),
  constraint payout_failed_has_reason check (
    status <> 'failed' or (failure_reason is not null and length(trim(failure_reason)) > 0)
  )
);

create index if not exists payouts_payee_idx  on public.payouts (payee_id, created_at desc);
create index if not exists payouts_status_idx on public.payouts (status, created_at);

alter table public.payouts enable row level security;

-- The freelancer sees their own; an admin sees all. The client is not given
-- sight of this on purpose: their involvement ended at approval, and when the
-- platform pays its freelancer is not their business.
drop policy if exists "payouts_payee_select" on public.payouts;
create policy "payouts_payee_select" on public.payouts
  for select using (payee_id = auth.uid() or public.is_admin());

-- No insert, update or delete policy at all. Every write goes through the
-- functions below, so the rules about who may pay what live in one place.

-- ---------- 3. A freelancer sets their payout account ----------

create or replace function public.set_payout_account(
  p_method         payout_method,
  p_upi_vpa        text default null,
  p_account_name   text default null,
  p_account_number text default null,
  p_ifsc           text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := public.require_auth();

  insert into payout_accounts as pa (
    user_id, method, upi_vpa, account_name, account_number, ifsc, verified
  ) values (
    v_uid, p_method,
    nullif(trim(coalesce(p_upi_vpa, '')), ''),
    nullif(trim(coalesce(p_account_name, '')), ''),
    nullif(trim(coalesce(p_account_number, '')), ''),
    upper(nullif(trim(coalesce(p_ifsc, '')), '')),
    false
  )
  on conflict (user_id) do update set
    method         = excluded.method,
    upi_vpa        = excluded.upi_vpa,
    account_name   = excluded.account_name,
    account_number = excluded.account_number,
    ifsc           = excluded.ifsc,
    -- Changing where the money goes clears the verification. A past
    -- successful transfer says nothing about a new account number.
    verified       = false,
    updated_at     = now();
end $$;

revoke all on function public.set_payout_account(payout_method, text, text, text, text) from public;
grant execute on function public.set_payout_account(payout_method, text, text, text, text) to authenticated;

-- ---------- 4. Approving a milestone now opens a payout ----------
--
-- Same approval rules as before. The differences are the payout row and the
-- wording of the notification, which no longer tells a freelancer money has
-- arrived when it has not.

create or replace function public.approve_milestone(p_milestone_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype;
  v_remaining integer; v_title text; v_has_account boolean;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);

  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;

  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.client_id is distinct from v_uid then
    raise exception 'Only the client can approve milestones';
  end if;
  if v_m.status <> 'submitted' then raise exception 'Milestone is not awaiting review'; end if;
  if not v_m.escrow_funded then raise exception 'Milestone escrow was never funded'; end if;

  update milestones set status = 'paid', approved_at = now() where id = p_milestone_id;

  -- The release still happens here: approval is irrevocable and the amount is
  -- now owed to the freelancer rather than refundable to the client.
  insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status)
  values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.freelancer_id, 'release', v_m.amount, 'completed');

  -- And the payout opens, owing money, until somebody actually sends it.
  -- on conflict does nothing because the unique milestone_id is what
  -- guarantees a milestone can only ever be paid out once.
  insert into payouts (milestone_id, contract_id, project_id, payee_id, amount)
  values (v_m.id, v_c.id, v_m.project_id, v_c.freelancer_id, v_m.amount)
  on conflict (milestone_id) do nothing;

  select exists (select 1 from payout_accounts where user_id = v_c.freelancer_id)
    into v_has_account;

  if v_has_account then
    perform public.notify(v_c.freelancer_id, 'milestone_paid',
      '₹' || v_m.amount || ' released for "' || v_m.title || '"',
      'The payout is on its way to your account.', '/contracts/' || v_c.id);
  else
    -- Nowhere to send it. Saying so now is far better than a freelancer
    -- waiting on money that has no destination.
    perform public.notify(v_c.freelancer_id, 'payout_account_missing',
      '₹' || v_m.amount || ' released for "' || v_m.title || '"',
      'Add your payout details so we can send it.', '/settings/payouts');
  end if;

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

-- ---------- 5. Sending the money ----------
--
-- Whoever actually moves the money calls these. An admin doing a bank
-- transfer by hand, or a provider's webhook once there is one: the same two
-- endpoints, so the rest of the system never learns which it was.

create or replace function public.mark_payout_processing(p_payout_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_p payouts%rowtype;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'Only the platform can send payouts';
  end if;
  perform set_config('app.in_rpc','1',true);

  select * into v_p from payouts where id = p_payout_id;
  if v_p.id is null then raise exception 'Payout not found'; end if;
  if v_p.status not in ('pending', 'failed') then
    raise exception 'Payout is already %', v_p.status;
  end if;

  update payouts set status = 'processing', failure_reason = null, failed_at = null
   where id = p_payout_id;
end $$;

create or replace function public.record_payout_sent(
  p_payout_id uuid,
  p_reference text,
  p_provider  text default 'manual'
) returns void
language plpgsql security definer set search_path = public as $$
declare v_p payouts%rowtype; v_acct payout_accounts%rowtype;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'Only the platform can send payouts';
  end if;
  perform set_config('app.in_rpc','1',true);

  if p_reference is null or length(trim(p_reference)) = 0 then
    -- A payout with no reference cannot be traced back to a bank record, and
    -- an untraceable payment is the one you end up arguing about.
    raise exception 'A payout reference (UTR or provider payout id) is required';
  end if;

  select * into v_p from payouts where id = p_payout_id;
  if v_p.id is null then raise exception 'Payout not found'; end if;

  -- Already done. Not an error: a retried webhook is ordinary, and raising
  -- here would make a provider retry work that is finished.
  if v_p.status = 'paid' then return; end if;

  select * into v_acct from payout_accounts where user_id = v_p.payee_id;

  update payouts set
    status    = 'paid',
    reference = trim(p_reference),
    provider  = coalesce(nullif(trim(p_provider), ''), 'manual'),
    paid_at   = now(),
    failure_reason = null,
    failed_at = null,
    -- The account number is deliberately not copied here. This is a record of
    -- where money went, not a second place for bank details to live; the last
    -- four digits are enough to reconcile against a statement.
    sent_to = case when v_acct.user_id is null then null else jsonb_build_object(
      'method', v_acct.method::text,
      'upi_vpa', v_acct.upi_vpa,
      'account_name', v_acct.account_name,
      'account_last4', right(coalesce(v_acct.account_number, ''), 4),
      'ifsc', v_acct.ifsc
    ) end
  where id = p_payout_id;

  -- A transfer that landed is the only evidence the details were right.
  if v_acct.user_id is not null and not v_acct.verified then
    update payout_accounts set verified = true, updated_at = now()
     where user_id = v_p.payee_id;
  end if;

  perform public.notify(v_p.payee_id, 'payout_sent',
    '₹' || v_p.amount || ' is on its way to you',
    'Reference ' || trim(p_reference) || '.', '/settings/payouts');
end $$;

create or replace function public.record_payout_failed(
  p_payout_id uuid,
  p_reason    text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_p payouts%rowtype;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'Only the platform can send payouts';
  end if;
  perform set_config('app.in_rpc','1',true);

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A failure reason is required';
  end if;

  select * into v_p from payouts where id = p_payout_id;
  if v_p.id is null then raise exception 'Payout not found'; end if;
  if v_p.status = 'paid' then
    raise exception 'Payout % is already paid and cannot be marked failed', p_payout_id;
  end if;

  update payouts set
    status = 'failed', failure_reason = trim(p_reason), failed_at = now()
  where id = p_payout_id;

  perform public.notify(v_p.payee_id, 'payout_failed',
    'We could not send ₹' || v_p.amount,
    trim(p_reason) || ' Check your payout details.', '/settings/payouts');
end $$;

revoke all on function public.mark_payout_processing(uuid) from anon, public;
revoke all on function public.record_payout_sent(uuid, text, text) from anon, public;
revoke all on function public.record_payout_failed(uuid, text) from anon, public;

-- authenticated is granted because an admin is an authenticated user; the
-- is_admin() check inside each function is what actually gates them.
grant execute on function public.mark_payout_processing(uuid) to authenticated, service_role;
grant execute on function public.record_payout_sent(uuid, text, text) to authenticated, service_role;
grant execute on function public.record_payout_failed(uuid, text) to authenticated, service_role;

-- ---------- 6. Earned is not the same as paid ----------
--
-- total_earned keeps its meaning -- money released to you -- because that is
-- what it has always counted and it is a true number. The two new columns are
-- what was missing: how much has actually reached your bank, and how much is
-- still owed.

create or replace view public.user_financials as
select p.id as user_id,
       coalesce((select sum(t.amount) from public.transactions t
                 where t.payee_id = p.id and t.type = 'release' and t.status = 'completed'), 0) as total_earned,
       coalesce((select sum(t.amount) from public.transactions t
                 where t.payer_id = p.id and t.type in ('escrow_fund') and t.status = 'completed'), 0)
       - coalesce((select sum(t.amount) from public.transactions t
                 where t.payee_id = p.id and t.type = 'refund' and t.status = 'completed'), 0) as total_spent,
       coalesce((select sum(po.amount) from public.payouts po
                 where po.payee_id = p.id and po.status = 'paid'), 0) as total_paid_out,
       coalesce((select sum(po.amount) from public.payouts po
                 where po.payee_id = p.id and po.status <> 'paid'), 0) as pending_payout
from public.profiles p;

commit;

-- ------------------------------------------------------------
-- BACKFILL, IF THIS DATABASE ALREADY HAS APPROVED MILESTONES
--
-- Milestones approved before this migration have a release transaction and no
-- payout, so a freelancer's pending_payout would understate what they are
-- owed. This opens a pending payout for each. Run it ONCE, and only if those
-- milestones genuinely have not been paid out yet.
--
--   insert into public.payouts (milestone_id, contract_id, project_id, payee_id, amount)
--   select t.milestone_id, t.contract_id, t.project_id, t.payee_id, t.amount
--     from public.transactions t
--    where t.type = 'release' and t.status = 'completed'
--      and t.milestone_id is not null and t.payee_id is not null
--   on conflict (milestone_id) do nothing;
-- ------------------------------------------------------------
