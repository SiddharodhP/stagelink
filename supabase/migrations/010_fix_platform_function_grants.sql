-- ============================================================
-- SECURITY FIX — platform-only functions were callable by anyone
--
-- Migration 009 tried to lock its cron functions down with
--   revoke all on function ... from public;
-- That is a no-op on Supabase. Supabase runs
--   alter default privileges in schema public
--     grant all on functions to anon, authenticated, service_role;
-- so EXECUTE is granted DIRECTLY to the anon and authenticated roles.
-- Revoking from PUBLIC does not remove a direct role grant, and the
-- later `grant ... to service_role` did nothing to narrow it.
--
-- Verified before this fix, using only the public anon key:
--   generate_due_recurring_invoices  -> ran, returned []
--   get_overdue_invoices             -> ran, returned []
--   mark_reminder_sent               -> ran
--   issue_recurring_invoice          -> reached 'Retainer not found'
--
-- Impact. get_overdue_invoices is SECURITY DEFINER returning setof
-- invoices, so once any invoice went overdue it would have handed every
-- anonymous caller the full row: client name, billing address, email,
-- phone and tax ID. issue_recurring_invoice had no auth check of its own
-- and would have issued invoices for arbitrary periods against a real
-- schedule id. mark_reminder_sent let anyone burn the reminder counter to
-- silence legitimate chasing.
--
-- Two layers of fix, because the grant layer already failed once:
--   1. Revoke from anon and authenticated BY NAME.
--   2. Make the cron functions verify the caller is service_role, so a
--      future default-privilege grant cannot silently reopen this.
--
-- Run AFTER 009_recurring_invoices.sql.
-- ============================================================

begin;

-- ---------- 1. Caller must be the service role ----------

/**
 * Raises unless the caller authenticated with the service-role key.
 *
 * Reads the role claim PostgREST puts on the request. A direct psql
 * connection has no such claim and is therefore rejected too — these
 * functions are only ever meant to run from the cron route.
 */
create or replace function public.require_service_role() returns void
language plpgsql stable set search_path = public as $$
declare v_role text;
begin
  v_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
  if v_role is distinct from 'service_role' then
    raise exception 'This function is platform-internal';
  end if;
end $$;

-- ---------- 2. Guard the cron entry points ----------

create or replace function public.get_overdue_invoices(p_max_reminders integer default 30)
returns setof invoices
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_service_role();

  return query
  select * from invoices
   where kind = 'recurring'
     and status in ('sent', 'acknowledged')
     and due_date is not null
     and due_date < current_date
     and reminders_sent < p_max_reminders
     -- At most one chase per calendar day, however often the cron runs.
     and (last_reminder_at is null or last_reminder_at < current_date)
   order by due_date;
end $$;

create or replace function public.mark_reminder_sent(p_invoice_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_service_role();
  update invoices
     set reminders_sent = reminders_sent + 1, last_reminder_at = now()
   where id = p_invoice_id;
end $$;

-- issue_recurring_invoice is reached two ways: directly (must be blocked)
-- and from generate_due_recurring_invoices, which is SECURITY DEFINER and
-- runs under the same request claims, so the guard still passes there.
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

-- generate_due_recurring_invoices: same body as 009, plus the guard.
create or replace function public.generate_due_recurring_invoices()
returns table (invoice_id uuid, schedule_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_r record; v_period date; v_new uuid;
  v_guard integer;    -- loop-safety counter: periods examined
  v_created integer;  -- invoices actually issued this run
begin
  perform public.require_service_role();

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

-- ---------- 3. Revoke BY NAME, not from PUBLIC ----------

-- settle_recurring_invoice is deliberately NOT service-role guarded: it is
-- called by pay_invoice on behalf of a signed-in client. pay_invoice is
-- SECURITY DEFINER and runs as the owner, so revoking the direct grant
-- blocks external calls without breaking that internal one.
revoke all on function public.generate_due_recurring_invoices() from anon, authenticated, public;
revoke all on function public.get_overdue_invoices(integer)      from anon, authenticated, public;
revoke all on function public.mark_reminder_sent(uuid)           from anon, authenticated, public;
revoke all on function public.issue_recurring_invoice(uuid, date) from anon, authenticated, public;
revoke all on function public.settle_recurring_invoice(uuid)     from anon, authenticated, public;
revoke all on function public.require_service_role()             from anon, authenticated, public;

grant execute on function public.generate_due_recurring_invoices() to service_role;
grant execute on function public.get_overdue_invoices(integer)     to service_role;
grant execute on function public.mark_reminder_sent(uuid)          to service_role;

-- ---------- 4. Same bug, older migrations ----------

-- notify() is SECURITY DEFINER and inserts straight into notifications.
-- Verified anon-callable: it reached a foreign-key violation, meaning the
-- insert was attempted. With a real user id an anonymous caller could push
-- arbitrary notifications — including the link field — into anyone's feed,
-- which is a ready-made phishing channel ("Invoice overdue, click here").
--
-- Every legitimate caller is a SECURITY DEFINER function or trigger running
-- as the owner, so removing the direct grant breaks nothing.
revoke all on function public.notify(uuid, text, text, text, text)
  from anon, authenticated, public;

-- These only ever recompute derived columns from source rows, so they can't
-- corrupt data — but there is no reason for them to be reachable either.
revoke all on function public.refresh_reputation(uuid) from anon, authenticated, public;
revoke all on function public.refresh_financials(uuid) from anon, authenticated, public;

commit;

-- ============================================================
-- VERIFY — with the ANON key, every one of these must now fail.
-- "permission denied for function" or "This function is platform-internal"
-- are both correct; an empty array [] means the hole is still open.
--
--   select public.generate_due_recurring_invoices();
--   select public.get_overdue_invoices(999);
--   select public.mark_reminder_sent('00000000-0000-0000-0000-000000000000');
--   select public.issue_recurring_invoice(
--     '00000000-0000-0000-0000-000000000000', current_date);
--   -- must be denied, NOT a foreign-key error:
--   select public.notify('00000000-0000-0000-0000-000000000000','x','spam',null,null);
--
-- And these must still WORK for a signed-in user:
--   select public.create_recurring_invoice(<contract>, 'Test', 100, 'weekly');
--   select public.pay_invoice(<a recurring invoice id>);
-- ============================================================
