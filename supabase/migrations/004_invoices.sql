-- ============================================================
-- INVOICES — one-click milestone invoicing
--
-- Flow: freelancer delivers a milestone (status 'submitted') → sends an
-- invoice in one click → client receives a notification → acknowledges →
-- pays, which releases the escrowed funds for that milestone.
--
-- Design note: paying an invoice DELEGATES to approve_milestone() rather
-- than re-implementing the release. There is exactly one code path that
-- moves money, so escrow, ledger rows, contract completion, and
-- notifications can't drift between the two entry points.
--
-- Run AFTER 003_fix_definer_views.sql.
-- ============================================================

begin;

create type invoice_status as enum ('sent', 'acknowledged', 'paid', 'cancelled');

create sequence if not exists public.invoice_number_seq start 1;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  -- Amounts are snapshotted at issue time so a later milestone edit can
  -- never retroactively change what was invoiced.
  amount integer not null check (amount > 0),
  tax_percent numeric(5,2) not null default 0 check (tax_percent >= 0 and tax_percent <= 100),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null check (total_amount > 0),
  currency text not null default 'INR',
  status invoice_status not null default 'sent',
  notes text,
  milestone_title text not null,
  project_title text not null,
  due_date date,
  issued_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index invoices_freelancer_idx on public.invoices(freelancer_id, created_at desc);
create index invoices_client_idx on public.invoices(client_id, created_at desc);
create index invoices_milestone_idx on public.invoices(milestone_id);
create index invoices_contract_idx on public.invoices(contract_id);

-- At most one live invoice per milestone; cancelled ones don't block a re-issue.
create unique index invoices_one_live_per_milestone
  on public.invoices(milestone_id)
  where status <> 'cancelled';

-- ---------- RPCs ----------

/**
 * Freelancer issues an invoice for a delivered milestone. One click:
 * amount, titles, and due date are all derived server-side.
 */
create or replace function public.create_invoice(
  p_milestone_id uuid,
  p_tax_percent numeric default 0,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype;
  v_project_title text; v_number text; v_tax integer; v_total integer; v_id uuid;
  v_freelancer_name text;
begin
  v_uid := public.require_auth();

  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;

  select * into v_c from contracts
   where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.freelancer_id is distinct from v_uid then
    raise exception 'Only the assigned freelancer can invoice this milestone';
  end if;

  -- Invoice only after the work has actually been delivered.
  if v_m.status <> 'submitted' then
    raise exception 'Submit the milestone for review before invoicing it';
  end if;
  if exists (select 1 from invoices where milestone_id = p_milestone_id and status <> 'cancelled') then
    raise exception 'An invoice already exists for this milestone';
  end if;

  if p_tax_percent is null or p_tax_percent < 0 or p_tax_percent > 100 then
    raise exception 'Tax percent must be between 0 and 100';
  end if;

  select title into v_project_title from projects where id = v_m.project_id;
  select full_name into v_freelancer_name from profiles where id = v_uid;

  v_tax := round(v_m.amount * p_tax_percent / 100.0);
  v_total := v_m.amount + v_tax;
  v_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('public.invoice_number_seq')::text, 5, '0');

  insert into invoices (
    invoice_number, milestone_id, contract_id, project_id,
    freelancer_id, client_id, amount, tax_percent, tax_amount, total_amount,
    notes, milestone_title, project_title, due_date
  ) values (
    v_number, v_m.id, v_c.id, v_m.project_id,
    v_uid, v_c.client_id, v_m.amount, p_tax_percent, v_tax, v_total,
    p_notes, v_m.title, coalesce(v_project_title, 'Project'), current_date + 7
  ) returning id into v_id;

  perform public.notify(
    v_c.client_id, 'invoice_received',
    'Invoice ' || v_number || ' from ' || coalesce(v_freelancer_name, 'your freelancer'),
    '₹' || v_total || ' for "' || v_m.title || '"',
    '/invoices/' || v_id
  );

  return v_id;
end $$;

/** Client confirms receipt. Optional — paying implies acknowledgement. */
create or replace function public.acknowledge_invoice(p_invoice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_inv invoices%rowtype;
begin
  v_uid := public.require_auth();
  select * into v_inv from invoices where id = p_invoice_id;
  if v_inv.id is null then raise exception 'Invoice not found'; end if;
  if v_inv.client_id is distinct from v_uid then
    raise exception 'Only the client can acknowledge this invoice';
  end if;
  if v_inv.status <> 'sent' then raise exception 'Invoice is not awaiting acknowledgement'; end if;

  update invoices set status = 'acknowledged', acknowledged_at = now() where id = p_invoice_id;

  perform public.notify(
    v_inv.freelancer_id, 'invoice_acknowledged',
    'Invoice ' || v_inv.invoice_number || ' was acknowledged',
    'The client has received your invoice.',
    '/invoices/' || p_invoice_id
  );
end $$;

/**
 * Client pays. Delegates the actual money movement to approve_milestone so
 * escrow release, the ledger row, contract completion, and notifications
 * all stay on one code path. The invoices_sync_on_milestone_paid trigger
 * flips this invoice to 'paid'.
 */
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
    update invoices set status = 'acknowledged', acknowledged_at = now() where id = p_invoice_id;
  end if;

  -- Single source of truth for releasing escrow. Raises if the milestone
  -- isn't in a payable state, which correctly aborts this transaction.
  perform public.approve_milestone(v_inv.milestone_id);
end $$;

/** Freelancer withdraws an unpaid invoice (e.g. wrong tax, wrong milestone). */
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
    '/contracts/' || v_inv.contract_id
  );
end $$;

-- ---------- Keep invoices consistent with milestones ----------

/**
 * If a milestone is paid through any route — the invoice, the normal
 * Approve button, or a dispute resolution — settle its open invoice too,
 * so the two can never disagree.
 */
create or replace function public.sync_invoice_on_milestone_paid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update invoices
       set status = 'paid', paid_at = now(),
           acknowledged_at = coalesce(acknowledged_at, now())
     where milestone_id = new.id and status not in ('paid', 'cancelled');
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update invoices set status = 'cancelled'
     where milestone_id = new.id and status not in ('paid', 'cancelled');
  end if;
  return null;
end $$;

create trigger invoices_sync_on_milestone_paid
  after update on public.milestones
  for each row execute function public.sync_invoice_on_milestone_paid();

-- Notify the freelancer once payment lands.
create or replace function public.notify_invoice_paid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    perform public.notify(
      new.freelancer_id, 'invoice_paid',
      'Invoice ' || new.invoice_number || ' was paid',
      '₹' || new.total_amount || ' released for "' || new.milestone_title || '"',
      '/invoices/' || new.id
    );
  end if;
  return null;
end $$;

create trigger invoices_notify_paid
  after update on public.invoices
  for each row execute function public.notify_invoice_paid();

-- ---------- RLS ----------

alter table public.invoices enable row level security;

-- Readable only by the two parties (and admins). No insert/update/delete
-- policies at all: every mutation goes through the definer RPCs above.
create policy "invoices_read_own" on public.invoices for select using (
  freelancer_id = auth.uid()
  or client_id = auth.uid()
  or public.is_admin()
);

commit;

-- ============================================================
-- VERIFY
--   select invoice_number, status, total_amount from public.invoices;
--   -- anonymous callers must be rejected:
--   select public.create_invoice('00000000-0000-0000-0000-000000000000');
-- ============================================================
