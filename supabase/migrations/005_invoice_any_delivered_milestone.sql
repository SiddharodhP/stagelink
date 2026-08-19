-- ============================================================
-- FIX — allow invoicing any DELIVERED milestone, not just one
-- sitting in the 'submitted' review window.
--
-- Problem with 004: create_invoice() required status = 'submitted'. That
-- window closes the moment the client approves, so a milestone approved
-- through the normal Approve button could never be invoiced — not even
-- retroactively. Freelancers need an invoice for every delivered milestone
-- as a tax/accounting record, independent of when payment happened.
--
-- Now:
--   submitted / revision_requested -> invoice is a REQUEST for payment
--   paid                           -> invoice is issued as a RECEIPT
--                                     (created already settled)
--
-- Run AFTER 004_invoices.sql.
-- ============================================================

begin;

create or replace function public.create_invoice(
  p_milestone_id uuid,
  p_tax_percent numeric default 0,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_m milestones%rowtype; v_c contracts%rowtype;
  v_project_title text; v_number text; v_tax integer; v_total integer; v_id uuid;
  v_freelancer_name text; v_is_receipt boolean;
begin
  v_uid := public.require_auth();

  select * into v_m from milestones where id = p_milestone_id;
  if v_m.id is null then raise exception 'Milestone not found'; end if;

  -- Accept any live contract state: a completed contract still needs its
  -- paid milestones to be receiptable.
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

  select title into v_project_title from projects where id = v_m.project_id;
  select full_name into v_freelancer_name from profiles where id = v_uid;

  v_tax := round(v_m.amount * p_tax_percent / 100.0);
  v_total := v_m.amount + v_tax;
  v_number := 'INV-' || to_char(now(), 'YYYY') || '-' ||
              lpad(nextval('public.invoice_number_seq')::text, 5, '0');

  insert into invoices (
    invoice_number, milestone_id, contract_id, project_id,
    freelancer_id, client_id, amount, tax_percent, tax_amount, total_amount,
    notes, milestone_title, project_title, due_date,
    status, acknowledged_at, paid_at
  ) values (
    v_number, v_m.id, v_c.id, v_m.project_id,
    v_uid, v_c.client_id, v_m.amount, p_tax_percent, v_tax, v_total,
    p_notes, v_m.title, coalesce(v_project_title, 'Project'),
    case when v_is_receipt then null else current_date + 7 end,
    -- Already-paid work is issued settled; the money moved long ago.
    case when v_is_receipt then 'paid'::invoice_status else 'sent'::invoice_status end,
    case when v_is_receipt then coalesce(v_m.approved_at, now()) else null end,
    case when v_is_receipt then coalesce(v_m.approved_at, now()) else null end
  ) returning id into v_id;

  if v_is_receipt then
    perform public.notify(
      v_c.client_id, 'receipt_issued',
      'Receipt ' || v_number || ' from ' || coalesce(v_freelancer_name, 'your freelancer'),
      'For "' || v_m.title || '" — already paid, for your records.',
      '/invoices/' || v_id
    );
  else
    perform public.notify(
      v_c.client_id, 'invoice_received',
      'Invoice ' || v_number || ' from ' || coalesce(v_freelancer_name, 'your freelancer'),
      '₹' || v_total || ' for "' || v_m.title || '"',
      '/invoices/' || v_id
    );
  end if;

  return v_id;
end $$;

commit;

-- ============================================================
-- VERIFY
--   select invoice_number, status, milestone_title, total_amount
--   from public.invoices order by created_at desc;
-- ============================================================
