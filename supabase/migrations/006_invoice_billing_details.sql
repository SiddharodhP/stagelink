-- ============================================================
-- INVOICE DETAIL — proper billing blocks, tax IDs, payment terms
--
-- Adds reusable billing details to profiles, and SNAPSHOTS them onto each
-- invoice at issue time. The snapshot matters: an invoice is a financial
-- record, so editing your address or GSTIN next year must not silently
-- rewrite an invoice you issued today.
--
-- Run AFTER 005_invoice_any_delivered_milestone.sql.
-- ============================================================

begin;

-- ---------- 1. Reusable billing details on profiles ----------
alter table public.profiles
  add column if not exists billing_address text,
  add column if not exists billing_email text,
  add column if not exists phone text,
  add column if not exists tax_id text,
  -- India: GSTIN. Elsewhere: VAT No., Tax ID, ABN, etc.
  add column if not exists tax_id_label text not null default 'Tax ID';

-- ---------- 2. Snapshot columns on invoices ----------
alter table public.invoices
  add column if not exists from_name text,
  add column if not exists from_address text,
  add column if not exists from_email text,
  add column if not exists from_phone text,
  add column if not exists from_tax_id text,
  add column if not exists from_tax_label text,
  add column if not exists to_name text,
  add column if not exists to_address text,
  add column if not exists to_email text,
  add column if not exists to_phone text,
  add column if not exists to_tax_id text,
  add column if not exists to_tax_label text,
  add column if not exists deliverables text,
  add column if not exists milestone_seq integer,
  add column if not exists milestone_count integer,
  add column if not exists payment_terms text,
  add column if not exists reference text;

-- ---------- 3. create_invoice: capture the full billing snapshot ----------
create or replace function public.create_invoice(
  p_milestone_id uuid,
  p_tax_percent numeric default 0,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype;
  v_from profiles%rowtype; v_to profiles%rowtype;
  v_project projects%rowtype;
  v_number text; v_tax integer; v_total integer; v_id uuid;
  v_is_receipt boolean; v_count integer; v_terms text;
begin
  v_uid := public.require_auth();

  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;

  select * into v_c from contracts
   where project_id = v_m.project_id
     and status in ('active', 'completed')
   order by created_at desc limit 1;
  if v_c.id is null then raise exception 'No contract found for this project'; end if;
  if v_c.freelancer_id is distinct from v_uid then
    raise exception 'Only the assigned freelancer can invoice this milestone';
  end if;

  if v_m.status not in ('submitted', 'revision_requested', 'paid') then
    raise exception 'Deliver the milestone before invoicing it';
  end if;
  if exists (select 1 from invoices where milestone_id = p_milestone_id and status <> 'cancelled') then
    raise exception 'An invoice already exists for this milestone';
  end if;
  if p_tax_percent is null or p_tax_percent < 0 or p_tax_percent > 100 then
    raise exception 'Tax percent must be between 0 and 100';
  end if;

  v_is_receipt := (v_m.status = 'paid');

  select * into v_from from profiles where id = v_uid;
  select * into v_to from profiles where id = v_c.client_id;
  select * into v_project from projects where id = v_m.project_id;
  select count(*) into v_count from milestones
   where project_id = v_m.project_id and status <> 'cancelled';

  v_tax := round(v_m.amount * p_tax_percent / 100.0);
  v_total := v_m.amount + v_tax;
  v_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('public.invoice_number_seq')::text, 5, '0');
  v_terms := case when v_is_receipt
                  then 'Paid via Roster escrow'
                  else 'Net 7 — released from escrow on milestone approval' end;

  insert into invoices (
    invoice_number, milestone_id, contract_id, project_id,
    freelancer_id, client_id, amount, tax_percent, tax_amount, total_amount,
    notes, milestone_title, project_title, due_date,
    status, acknowledged_at, paid_at,
    from_name, from_address, from_email, from_phone, from_tax_id, from_tax_label,
    to_name, to_address, to_email, to_phone, to_tax_id, to_tax_label,
    deliverables, milestone_seq, milestone_count, payment_terms, reference
  ) values (
    v_number, v_m.id, v_c.id, v_m.project_id,
    v_uid, v_c.client_id, v_m.amount, p_tax_percent, v_tax, v_total,
    p_notes, v_m.title, coalesce(v_project.title, 'Project'),
    case when v_is_receipt then null else current_date + 7 end,
    case when v_is_receipt then 'paid'::invoice_status else 'sent'::invoice_status end,
    case when v_is_receipt then coalesce(v_m.approved_at, now()) else null end,
    case when v_is_receipt then coalesce(v_m.approved_at, now()) else null end,
    -- From (freelancer)
    coalesce(nullif(v_from.full_name, ''), 'Freelancer'),
    coalesce(v_from.billing_address, v_from.location),
    v_from.billing_email, v_from.phone, v_from.tax_id,
    coalesce(v_from.tax_id_label, 'Tax ID'),
    -- To (client)
    coalesce(nullif(v_to.company_name, ''), nullif(v_to.full_name, ''), 'Client'),
    coalesce(v_to.billing_address, v_to.location),
    v_to.billing_email, v_to.phone, v_to.tax_id,
    coalesce(v_to.tax_id_label, 'Tax ID'),
    -- Work detail
    v_m.deliverables, v_m.seq, v_count, v_terms,
    'Contract ' || left(v_c.id::text, 8) || ' · Milestone ' || v_m.seq
  ) returning id into v_id;

  if v_is_receipt then
    perform public.notify(
      v_c.client_id, 'receipt_issued',
      'Receipt ' || v_number || ' from ' || coalesce(v_from.full_name, 'your freelancer'),
      'For "' || v_m.title || '" — already paid, for your records.',
      '/invoices/' || v_id
    );
  else
    perform public.notify(
      v_c.client_id, 'invoice_received',
      'Invoice ' || v_number || ' from ' || coalesce(v_from.full_name, 'your freelancer'),
      '₹' || v_total || ' for "' || v_m.title || '"',
      '/invoices/' || v_id
    );
  end if;

  return v_id;
end $$;

-- ---------- 4. Backfill snapshots on existing invoices ----------
-- Existing rows predate the snapshot columns; fill them from current
-- profiles so old invoices still render a complete document.
update public.invoices i set
  from_name = coalesce(i.from_name, nullif(f.full_name, ''), 'Freelancer'),
  from_address = coalesce(i.from_address, f.billing_address, f.location),
  from_email = coalesce(i.from_email, f.billing_email),
  from_phone = coalesce(i.from_phone, f.phone),
  from_tax_id = coalesce(i.from_tax_id, f.tax_id),
  from_tax_label = coalesce(i.from_tax_label, f.tax_id_label, 'Tax ID'),
  to_name = coalesce(i.to_name, nullif(c.company_name, ''), nullif(c.full_name, ''), 'Client'),
  to_address = coalesce(i.to_address, c.billing_address, c.location),
  to_email = coalesce(i.to_email, c.billing_email),
  to_phone = coalesce(i.to_phone, c.phone),
  to_tax_id = coalesce(i.to_tax_id, c.tax_id),
  to_tax_label = coalesce(i.to_tax_label, c.tax_id_label, 'Tax ID'),
  payment_terms = coalesce(i.payment_terms,
    case when i.status = 'paid' then 'Paid via Roster escrow'
         else 'Net 7 — released from escrow on milestone approval' end),
  reference = coalesce(i.reference, 'Contract ' || left(i.contract_id::text, 8))
from public.profiles f, public.profiles c
where f.id = i.freelancer_id and c.id = i.client_id;

-- Fill milestone position where it's still missing.
update public.invoices i set
  milestone_seq = coalesce(i.milestone_seq, m.seq),
  deliverables = coalesce(i.deliverables, m.deliverables),
  milestone_count = coalesce(i.milestone_count,
    (select count(*) from milestones x where x.project_id = m.project_id and x.status <> 'cancelled'))
from public.milestones m
where m.id = i.milestone_id;

commit;

-- ============================================================
-- NOTE ON TAX
-- tax_id / tax_id_label are free-text fields for display only (GSTIN,
-- VAT No., ABN…). This does NOT make the document a compliant GST tax
-- invoice — that needs HSN/SAC codes, place of supply, and a CGST/SGST
-- vs IGST split. Have a CA confirm requirements before relying on these
-- for statutory filing.
-- ============================================================
