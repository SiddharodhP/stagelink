-- ============================================================
-- RECURRING INVOICES — retainers billed weekly / fortnightly / monthly
--
-- WHY THIS ISN'T JUST create_invoice ON A TIMER
--
-- A milestone invoice bills work the client already funded: escrow was
-- filled before the work started, so paying it only *releases* money the
-- platform is already holding. A retainer is the opposite — nothing is
-- pre-funded, and the client is being asked for new money each period.
-- Same document, completely different money movement, so recurring
-- invoices get their own settlement path rather than being forced through
-- approve_milestone().
--
-- The platform still mediates. Settling a retainer writes TWO ledger rows
-- (client -> platform, platform -> freelancer) exactly like funding and
-- releasing a milestone does, so the mediator role stays auditable and
-- profiles.total_earned / total_spent keep working unchanged.
--
-- CLIENT CONSENT IS REQUIRED. A schedule starts as 'pending_approval' and
-- bills nothing until the client accepts it. Without that, a freelancer
-- could unilaterally point recurring billing plus daily overdue email at
-- someone who never agreed to a retainer.
--
-- Run AFTER 008_invoice_recipient_email.sql.
-- ============================================================

begin;

-- ---------- 1. Types ----------

create type recurrence_cadence as enum ('weekly', 'fortnightly', 'monthly');
create type recurrence_status as enum
  ('pending_approval', 'active', 'paused', 'declined', 'ended');
create type invoice_kind as enum ('milestone', 'recurring');

-- ---------- 2. The schedule ----------

create table public.recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  description text,
  amount integer not null check (amount > 0),
  tax_percent numeric(5,2) not null default 0
    check (tax_percent >= 0 and tax_percent <= 100),
  currency text not null default 'INR',

  cadence recurrence_cadence not null,
  -- Days after issue that payment falls due; drives the overdue chase.
  payment_terms_days integer not null default 7
    check (payment_terms_days between 0 and 90),

  starts_on date not null,
  next_run_on date not null,
  ends_on date,
  max_occurrences integer check (max_occurrences is null or max_occurrences > 0),
  occurrences_created integer not null default 0,

  status recurrence_status not null default 'pending_approval',
  approved_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  last_run_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ends_on is null or ends_on >= starts_on)
);

create index recurring_freelancer_idx
  on public.recurring_invoices(freelancer_id, created_at desc);
create index recurring_client_idx
  on public.recurring_invoices(client_id, created_at desc);
create index recurring_contract_idx on public.recurring_invoices(contract_id);
-- The cron's hot path: schedules that are due right now.
create index recurring_due_idx on public.recurring_invoices(next_run_on)
  where status = 'active';

-- One live retainer per contract. Ended/declined ones don't block a new one.
create unique index recurring_one_live_per_contract
  on public.recurring_invoices(contract_id)
  where status in ('pending_approval', 'active', 'paused');

-- ---------- 3. Invoices learn about recurrence ----------

alter table public.invoices
  add column if not exists kind invoice_kind not null default 'milestone',
  add column if not exists recurring_invoice_id uuid
    references public.recurring_invoices(id) on delete set null,
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists reminders_sent integer not null default 0,
  add column if not exists last_reminder_at timestamptz;

-- Retainer invoices have no milestone.
alter table public.invoices alter column milestone_id drop not null;

-- The old index treated NULL milestone_id as participating; make the
-- milestone-only intent explicit.
drop index if exists public.invoices_one_live_per_milestone;
create unique index invoices_one_live_per_milestone
  on public.invoices(milestone_id)
  where milestone_id is not null and status <> 'cancelled';

-- The real guard against double-billing: a schedule can never produce two
-- invoices covering the same period, however often the cron runs.
create unique index invoices_one_per_recurring_period
  on public.invoices(recurring_invoice_id, period_start)
  where recurring_invoice_id is not null;

create index invoices_overdue_idx
  on public.invoices(due_date)
  where kind = 'recurring' and status in ('sent', 'acknowledged');

-- ---------- 4. Cadence helper ----------

create or replace function public.advance_cadence(p_from date, p_cadence recurrence_cadence)
returns date language sql immutable as $$
  select case p_cadence
    when 'weekly'      then p_from + interval '7 days'
    when 'fortnightly' then p_from + interval '14 days'
    when 'monthly'     then p_from + interval '1 month'
  end::date
$$;

-- ---------- 5. Freelancer proposes a retainer ----------

create or replace function public.create_recurring_invoice(
  p_contract_id uuid,
  p_title text,
  p_amount integer,
  p_cadence recurrence_cadence,
  p_starts_on date default null,
  p_description text default null,
  p_tax_percent numeric default 0,
  p_payment_terms_days integer default 7,
  p_ends_on date default null,
  p_max_occurrences integer default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_c contracts%rowtype; v_start date; v_id uuid;
  v_freelancer_name text; v_project_title text;
begin
  v_uid := public.require_auth();

  select * into v_c from contracts where id = p_contract_id;
  if v_c.id is null then raise exception 'Contract not found'; end if;
  if v_c.freelancer_id is distinct from v_uid then
    raise exception 'Only the assigned freelancer can set up a retainer';
  end if;
  if v_c.status <> 'active' then
    raise exception 'Retainers can only be set up on an active contract';
  end if;

  if coalesce(trim(p_title), '') = '' then
    raise exception 'Give the retainer a title';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if p_tax_percent is null or p_tax_percent < 0 or p_tax_percent > 100 then
    raise exception 'Tax percent must be between 0 and 100';
  end if;
  if p_max_occurrences is not null and p_max_occurrences <= 0 then
    raise exception 'Occurrence limit must be greater than zero';
  end if;

  v_start := coalesce(p_starts_on, current_date);
  if v_start < current_date then
    raise exception 'A retainer cannot start in the past';
  end if;
  if p_ends_on is not null and p_ends_on < v_start then
    raise exception 'The end date is before the start date';
  end if;

  if exists (
    select 1 from recurring_invoices
     where contract_id = p_contract_id
       and status in ('pending_approval', 'active', 'paused')
  ) then
    raise exception 'This contract already has a retainer';
  end if;

  insert into recurring_invoices (
    contract_id, project_id, freelancer_id, client_id,
    title, description, amount, tax_percent, cadence,
    payment_terms_days, starts_on, next_run_on, ends_on, max_occurrences
  ) values (
    v_c.id, v_c.project_id, v_uid, v_c.client_id,
    trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
    p_amount, p_tax_percent, p_cadence,
    coalesce(p_payment_terms_days, 7), v_start, v_start, p_ends_on, p_max_occurrences
  ) returning id into v_id;

  select full_name into v_freelancer_name from profiles where id = v_uid;
  select title into v_project_title from projects where id = v_c.project_id;

  perform public.notify(
    v_c.client_id, 'retainer_proposed',
    coalesce(v_freelancer_name, 'Your freelancer') || ' proposed a '
      || p_cadence::text || ' retainer',
    '₹' || p_amount || ' per period on "' || coalesce(v_project_title, 'your project')
      || '" — review it before it starts billing.',
    '/invoices/recurring/' || v_id
  );

  return v_id;
end $$;

-- ---------- 6. Client accepts or declines ----------

create or replace function public.respond_recurring_invoice(
  p_id uuid,
  p_accept boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_r recurring_invoices%rowtype;
begin
  v_uid := public.require_auth();

  select * into v_r from recurring_invoices where id = p_id;
  if v_r.id is null then raise exception 'Retainer not found'; end if;
  if v_r.client_id is distinct from v_uid then
    raise exception 'Only the client can respond to this retainer';
  end if;
  if v_r.status <> 'pending_approval' then
    raise exception 'This retainer has already been responded to';
  end if;

  if p_accept then
    update recurring_invoices
       set status = 'active',
           approved_at = now(),
           -- Don't back-bill: if approval came after the start date, the
           -- first invoice covers the period beginning today.
           next_run_on = greatest(next_run_on, current_date),
           updated_at = now()
     where id = p_id;

    perform public.notify(
      v_r.freelancer_id, 'retainer_approved',
      'Your ' || v_r.cadence::text || ' retainer was approved',
      'Invoices will be issued automatically from now on.',
      '/invoices/recurring/' || p_id
    );
  else
    update recurring_invoices
       set status = 'declined', ended_at = now(),
           end_reason = 'Declined by client', updated_at = now()
     where id = p_id;

    perform public.notify(
      v_r.freelancer_id, 'retainer_declined',
      'Your retainer proposal was declined', null,
      '/contracts/' || v_r.contract_id
    );
  end if;
end $$;

-- ---------- 7. Pause / resume / end ----------

create or replace function public.set_recurring_invoice_paused(
  p_id uuid,
  p_paused boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_r recurring_invoices%rowtype; v_other uuid;
begin
  v_uid := public.require_auth();

  select * into v_r from recurring_invoices where id = p_id;
  if v_r.id is null then raise exception 'Retainer not found'; end if;
  -- Either party can pause: the client is committing money, the freelancer
  -- is committing time.
  if v_uid not in (v_r.freelancer_id, v_r.client_id) then
    raise exception 'Not your retainer';
  end if;

  if p_paused and v_r.status <> 'active' then
    raise exception 'Only an active retainer can be paused';
  end if;
  if not p_paused and v_r.status <> 'paused' then
    raise exception 'Only a paused retainer can be resumed';
  end if;

  update recurring_invoices
     set status = case when p_paused then 'paused' else 'active' end,
         -- Resuming never back-bills the paused stretch.
         next_run_on = case when p_paused then next_run_on
                            else greatest(next_run_on, current_date) end,
         updated_at = now()
   where id = p_id;

  v_other := case when v_uid = v_r.freelancer_id then v_r.client_id
                  else v_r.freelancer_id end;
  perform public.notify(
    v_other,
    case when p_paused then 'retainer_paused' else 'retainer_resumed' end,
    'Retainer "' || v_r.title || '" was '
      || case when p_paused then 'paused' else 'resumed' end,
    null, '/invoices/recurring/' || p_id
  );
end $$;

create or replace function public.end_recurring_invoice(
  p_id uuid,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_r recurring_invoices%rowtype; v_other uuid;
begin
  v_uid := public.require_auth();

  select * into v_r from recurring_invoices where id = p_id;
  if v_r.id is null then raise exception 'Retainer not found'; end if;
  if v_uid not in (v_r.freelancer_id, v_r.client_id) then
    raise exception 'Not your retainer';
  end if;
  if v_r.status in ('ended', 'declined') then
    raise exception 'This retainer has already ended';
  end if;

  update recurring_invoices
     set status = 'ended', ended_at = now(),
         end_reason = nullif(trim(coalesce(p_reason, '')), ''),
         updated_at = now()
   where id = p_id;

  v_other := case when v_uid = v_r.freelancer_id then v_r.client_id
                  else v_r.freelancer_id end;
  perform public.notify(
    v_other, 'retainer_ended',
    'Retainer "' || v_r.title || '" was ended',
    'Invoices already issued still stand.', '/invoices/recurring/' || p_id
  );
end $$;

-- A retainer cannot outlive its contract.
create or replace function public.end_retainers_with_contract() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('completed', 'cancelled')
     and old.status is distinct from new.status then
    update recurring_invoices
       set status = 'ended', ended_at = now(),
           end_reason = 'Contract ' || new.status::text, updated_at = now()
     where contract_id = new.id
       and status in ('pending_approval', 'active', 'paused');
  end if;
  return null;
end $$;

drop trigger if exists contracts_end_retainers on public.contracts;
create trigger contracts_end_retainers
  after update on public.contracts
  for each row execute function public.end_retainers_with_contract();

-- ---------- 8. Issuing one period's invoice ----------

/**
 * Issues the invoice covering p_period_start for a schedule. Internal:
 * the caller has already established that the period is due.
 *
 * Billing snapshot rules match create_invoice — the party details are
 * frozen onto the invoice, because it's a financial record.
 */
create or replace function public.issue_recurring_invoice(
  p_schedule_id uuid,
  p_period_start date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_r recurring_invoices%rowtype;
  v_from profiles%rowtype; v_to profiles%rowtype; v_project projects%rowtype;
  v_number text; v_tax integer; v_total integer; v_id uuid;
  v_period_end date; v_due date; v_label text;
begin
  select * into v_r from recurring_invoices where id = p_schedule_id;
  if v_r.id is null then raise exception 'Retainer not found'; end if;

  select * into v_from from profiles where id = v_r.freelancer_id;
  select * into v_to   from profiles where id = v_r.client_id;
  select * into v_project from projects where id = v_r.project_id;

  v_period_end := public.advance_cadence(p_period_start, v_r.cadence) - 1;
  v_due := p_period_start + v_r.payment_terms_days;
  v_tax := round(v_r.amount * v_r.tax_percent / 100.0);
  v_total := v_r.amount + v_tax;
  v_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('public.invoice_number_seq')::text, 5, '0');
  v_label := v_r.title || ' · ' || to_char(p_period_start, 'DD Mon')
             || ' – ' || to_char(v_period_end, 'DD Mon YYYY');

  insert into invoices (
    invoice_number, kind, recurring_invoice_id, milestone_id,
    contract_id, project_id, freelancer_id, client_id,
    amount, tax_percent, tax_amount, total_amount, currency,
    notes, milestone_title, project_title, due_date,
    period_start, period_end, status,
    from_name, from_address, from_email, from_phone, from_tax_id, from_tax_label,
    to_name, to_address, to_email, to_phone, to_tax_id, to_tax_label,
    deliverables, payment_terms, reference
  ) values (
    v_number, 'recurring', v_r.id, null,
    v_r.contract_id, v_r.project_id, v_r.freelancer_id, v_r.client_id,
    v_r.amount, v_r.tax_percent, v_tax, v_total, v_r.currency,
    v_r.description, v_label, coalesce(v_project.title, 'Project'), v_due,
    p_period_start, v_period_end, 'sent',
    coalesce(nullif(v_from.full_name, ''), 'Freelancer'),
    coalesce(v_from.billing_address, v_from.location),
    v_from.billing_email, v_from.phone, v_from.tax_id,
    coalesce(v_from.tax_id_label, 'Tax ID'),
    coalesce(nullif(v_to.company_name, ''), nullif(v_to.full_name, ''), 'Client'),
    coalesce(v_to.billing_address, v_to.location),
    v_to.billing_email, v_to.phone, v_to.tax_id,
    coalesce(v_to.tax_id_label, 'Tax ID'),
    v_r.description,
    'Net ' || v_r.payment_terms_days || ' — payable via Roster',
    'Retainer ' || left(v_r.id::text, 8) || ' · '
      || to_char(p_period_start, 'YYYY-MM-DD')
  ) returning id into v_id;

  perform public.notify(
    v_r.client_id, 'invoice_received',
    'Invoice ' || v_number || ' — ' || v_r.cadence::text || ' retainer',
    '₹' || v_total || ' due ' || to_char(v_due, 'DD Mon'),
    '/invoices/' || v_id
  );

  return v_id;
end $$;

-- ---------- 9. The cron worker ----------

/**
 * Issues every invoice that has come due and returns them, so the caller
 * can email each one.
 *
 * Catch-up is bounded: at most 6 periods per schedule per run, so a cron
 * outage can't fire off a year of invoices in one burst. The unique index
 * on (recurring_invoice_id, period_start) makes double-billing impossible
 * regardless of how often this is called.
 *
 * NOT granted to authenticated — service_role only. It runs on behalf of
 * the platform, not a user, so require_auth() deliberately isn't used.
 */
create or replace function public.generate_due_recurring_invoices()
returns table (invoice_id uuid, schedule_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_r record; v_period date; v_new uuid;
  v_guard integer;    -- loop-safety counter: periods examined
  v_created integer;  -- invoices actually issued this run
begin
  for v_r in
    select * from recurring_invoices
     where status = 'active' and next_run_on <= current_date
     order by next_run_on
     for update
  loop
    v_period := v_r.next_run_on;
    v_guard := 0;
    v_created := 0;

    while v_period <= current_date and v_guard < 6 loop
      -- Respect the schedule's own limits before issuing.
      exit when v_r.ends_on is not null and v_period > v_r.ends_on;
      exit when v_r.max_occurrences is not null
                and v_r.occurrences_created + v_created >= v_r.max_occurrences;

      -- The insert runs in its own subtransaction so a period that was
      -- already billed is skipped instead of aborting the whole run. The
      -- row is only emitted once that subtransaction has committed.
      v_new := null;
      begin
        v_new := public.issue_recurring_invoice(v_r.id, v_period);
      exception when unique_violation then
        v_new := null;
      end;

      if v_new is not null then
        invoice_id := v_new;
        schedule_id := v_r.id;
        return next;
        v_created := v_created + 1;
      end if;

      v_guard := v_guard + 1;
      v_period := public.advance_cadence(v_period, v_r.cadence);
    end loop;

    update recurring_invoices
       set next_run_on = v_period,
           occurrences_created = occurrences_created + v_created,
           last_run_at = now(),
           updated_at = now(),
           status = case
             when ends_on is not null and v_period > ends_on then 'ended'
             when max_occurrences is not null
                  and occurrences_created + v_created >= max_occurrences then 'ended'
             else status end,
           ended_at = case
             when (ends_on is not null and v_period > ends_on)
               or (max_occurrences is not null
                   and occurrences_created + v_created >= max_occurrences)
             then now() else ended_at end,
           end_reason = case
             when (ends_on is not null and v_period > ends_on)
               or (max_occurrences is not null
                   and occurrences_created + v_created >= max_occurrences)
             then coalesce(end_reason, 'Schedule completed') else end_reason end
     where id = v_r.id;
  end loop;
end $$;

-- ---------- 10. Settling a retainer invoice ----------

/**
 * The client pays a retainer invoice.
 *
 * Unlike a milestone, nothing was pre-funded, so this is where the money
 * actually moves. Two ledger rows keep the platform's mediator role
 * explicit and keep refresh_financials() correct:
 *   escrow_fund  client -> platform   (counts toward client's total_spent)
 *   release      platform -> freelancer (counts toward freelancer's earned)
 * Both land in one transaction, so the platform can never be left holding
 * money with no matching payout.
 */
create or replace function public.settle_recurring_invoice(p_invoice_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_inv invoices%rowtype;
begin
  perform set_config('app.in_rpc', '1', true);

  select * into v_inv from invoices where id = p_invoice_id for update;
  if v_inv.id is null then raise exception 'Invoice not found'; end if;
  if v_inv.kind <> 'recurring' then
    raise exception 'Not a retainer invoice';
  end if;
  if v_inv.status = 'paid' then raise exception 'This invoice is already paid'; end if;
  if v_inv.status = 'cancelled' then raise exception 'This invoice was cancelled'; end if;

  insert into transactions (
    project_id, contract_id, milestone_id, payer_id, payee_id,
    type, amount, status, reference
  ) values (
    v_inv.project_id, v_inv.contract_id, null, v_inv.client_id, null,
    'escrow_fund', v_inv.total_amount, 'completed',
    'RETAINER ' || v_inv.invoice_number
  );

  insert into transactions (
    project_id, contract_id, milestone_id, payer_id, payee_id,
    type, amount, status, reference
  ) values (
    v_inv.project_id, v_inv.contract_id, null, v_inv.client_id, v_inv.freelancer_id,
    'release', v_inv.total_amount, 'completed',
    'RETAINER ' || v_inv.invoice_number
  );

  update invoices
     set status = 'paid', paid_at = now(),
         acknowledged_at = coalesce(acknowledged_at, now())
   where id = p_invoice_id;
end $$;

-- ---------- 11. pay_invoice routes by kind ----------

create or replace function public.pay_invoice(p_invoice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_inv invoices%rowtype;
begin
  v_uid := public.require_auth();
  select * into v_inv from invoices where id = p_invoice_id;
  if v_inv.id is null then raise exception 'Invoice not found'; end if;
  if v_inv.client_id is distinct from v_uid then
    raise exception 'Only the client can pay this invoice';
  end if;
  if v_inv.status = 'paid' then raise exception 'This invoice is already paid'; end if;
  if v_inv.status = 'cancelled' then raise exception 'This invoice was cancelled'; end if;

  -- Records receipt if the client skipped the acknowledge step.
  if v_inv.status = 'sent' then
    update invoices set status = 'acknowledged', acknowledged_at = now()
     where id = p_invoice_id;
  end if;

  if v_inv.kind = 'recurring' then
    perform public.settle_recurring_invoice(p_invoice_id);
  else
    -- Single source of truth for releasing escrow. Raises if the milestone
    -- isn't in a payable state, which correctly aborts this transaction.
    perform public.approve_milestone(v_inv.milestone_id);
  end if;
end $$;

-- cancel_invoice must not assume a milestone exists.
create or replace function public.cancel_invoice(p_invoice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_inv invoices%rowtype;
begin
  v_uid := public.require_auth();
  select * into v_inv from invoices where id = p_invoice_id;
  if v_inv.id is null then raise exception 'Invoice not found'; end if;
  if v_inv.freelancer_id is distinct from v_uid then
    raise exception 'Only the issuing freelancer can cancel this invoice';
  end if;
  if v_inv.status = 'paid' then raise exception 'A paid invoice cannot be cancelled'; end if;

  update invoices set status = 'cancelled' where id = p_invoice_id;
  perform public.notify(
    v_inv.client_id, 'invoice_cancelled',
    'Invoice ' || v_inv.invoice_number || ' was withdrawn', null,
    case when v_inv.kind = 'recurring'
         then '/invoices' else '/contracts/' || v_inv.contract_id end
  );
end $$;

-- notify_invoice_paid says "milestone" in its body; keep it accurate.
create or replace function public.notify_invoice_paid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    perform public.notify(
      new.freelancer_id, 'invoice_paid',
      'Invoice ' || new.invoice_number || ' was paid',
      '₹' || new.total_amount ||
        case when new.kind = 'recurring' then ' received for "' else ' released for "' end
        || new.milestone_title || '"',
      '/invoices/' || new.id
    );
  end if;
  return null;
end $$;

-- ---------- 12. Overdue reminders ----------

/**
 * Retainer invoices past their due date that still need chasing.
 *
 * Deliberately scoped to kind = 'recurring'. A milestone invoice is backed
 * by escrow the client already funded, so emailing them daily to pay money
 * the platform is already holding would be wrong.
 *
 * p_max_reminders stops the chase becoming a mail-loop — an unpaid invoice
 * after a month of daily email is a dispute, not a reminder problem, and
 * uncapped sending will get the sending domain flagged for spam.
 */
create or replace function public.get_overdue_invoices(p_max_reminders integer default 30)
returns setof invoices
language sql security definer set search_path = public as $$
  select * from invoices
   where kind = 'recurring'
     and status in ('sent', 'acknowledged')
     and due_date is not null
     and due_date < current_date
     and reminders_sent < p_max_reminders
     -- At most one chase per calendar day, however often the cron runs.
     and (last_reminder_at is null or last_reminder_at < current_date)
   order by due_date
$$;

create or replace function public.mark_reminder_sent(p_invoice_id uuid)
returns void language sql security definer set search_path = public as $$
  update invoices
     set reminders_sent = reminders_sent + 1, last_reminder_at = now()
   where id = p_invoice_id
$$;

-- ---------- 13. RLS ----------

alter table public.recurring_invoices enable row level security;

-- Readable by the two parties (and admins). No insert/update/delete
-- policies: every mutation goes through the definer RPCs above.
create policy "recurring_read_own" on public.recurring_invoices for select using (
  freelancer_id = auth.uid()
  or client_id = auth.uid()
  or public.is_admin()
);

-- ---------- 14. Grants ----------

revoke all on function public.generate_due_recurring_invoices() from public;
revoke all on function public.get_overdue_invoices(integer) from public;
revoke all on function public.mark_reminder_sent(uuid) from public;
revoke all on function public.issue_recurring_invoice(uuid, date) from public;
revoke all on function public.settle_recurring_invoice(uuid) from public;

-- Platform-side only. These act for the platform, not for a signed-in
-- user, so they must never be reachable with the anon or authenticated key.
grant execute on function public.generate_due_recurring_invoices() to service_role;
grant execute on function public.get_overdue_invoices(integer) to service_role;
grant execute on function public.mark_reminder_sent(uuid) to service_role;

grant execute on function public.create_recurring_invoice(
  uuid, text, integer, recurrence_cadence, date, text, numeric, integer, date, integer
) to authenticated;
grant execute on function public.respond_recurring_invoice(uuid, boolean) to authenticated;
grant execute on function public.set_recurring_invoice_paused(uuid, boolean) to authenticated;
grant execute on function public.end_recurring_invoice(uuid, text) to authenticated;

commit;

-- ============================================================
-- VERIFY
--   -- anonymous callers must be rejected, not return data:
--   select public.create_recurring_invoice(
--     '00000000-0000-0000-0000-000000000000', 'x', 100, 'weekly');
--   -- must be denied for anon and authenticated alike:
--   select public.generate_due_recurring_invoices();
--
--   select title, cadence, status, next_run_on from public.recurring_invoices;
--   select invoice_number, kind, status, due_date, reminders_sent
--     from public.invoices order by created_at desc;
-- ============================================================
