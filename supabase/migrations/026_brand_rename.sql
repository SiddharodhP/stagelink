-- ============================================================
-- THE BRAND NAME COMES OFF THE INVOICES
--
-- Two functions write the old name into invoices.payment_terms, which is
-- a stored document field -- it is rendered on the invoice page and baked
-- into the downloaded PDF. Renaming the product in the app left those
-- rows and every future row still saying it.
--
--   create_invoice           'Paid via Roster escrow'   (migration 006)
--   issue_recurring_invoice  'payable via Roster'       (migration 010)
--
-- Both bodies below are their current definitions verbatim, with only
-- that one string changed. CREATE OR REPLACE, never DROP -- a dropped
-- function silently loses its grants, and issue_recurring_invoice is
-- service_role-only by grant (migration 010), so dropping it would quietly
-- open it to anon and authenticated.
--
-- Run AFTER 025_notification_links_freelancer_work.sql.
-- ============================================================

begin;

-- ---------- 1. New invoices ----------

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
                  then 'Paid via Jayree escrow'
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

-- ---------- 2. Recurring invoices ----------

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
  perform public.require_service_role();

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
    'Net ' || v_r.payment_terms_days || ' — payable via Jayree',
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

-- ---------- 3. Invoices already issued ----------
--
-- payment_terms is a snapshot taken when the invoice was written, so past
-- invoices keep the old name until it is rewritten here. Scoped to the two
-- phrases this platform generated rather than a blanket replace, because
-- payment_terms is also free text a freelancer can set.

update public.invoices
   set payment_terms = 'Paid via Jayree escrow'
 where payment_terms = 'Paid via Roster escrow';

update public.invoices
   set payment_terms = replace(payment_terms, 'payable via Roster',
                                              'payable via Jayree')
 where payment_terms like '%payable via Roster';

commit;

-- ------------------------------------------------------------
-- LEFT ALONE ON PURPOSE
--
-- Video call rooms are still named 'roster-<conversation id>' by
-- create_call (014) and its replacement in 015. That string is an opaque
-- identifier passed to JaaS, never shown to anyone, and it is stored on
-- calls.room_name -- so changing the prefix would split old and new rooms
-- for no visible gain.
-- ------------------------------------------------------------
