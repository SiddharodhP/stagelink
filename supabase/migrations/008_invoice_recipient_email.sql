-- ============================================================
-- RESOLVE THE INVOICE RECIPIENT'S EMAIL
--
-- Every account has an email in auth.users from signup, but auth.users is
-- not readable with the anon key — and it must not be, or anyone could
-- harvest every user's address.
--
-- This exposes exactly one address, to exactly the people entitled to it:
-- given an invoice, it returns the client's email, and only if the caller
-- is the freelancer or client on that invoice. Nothing else leaks.
--
-- Prefers the explicit billing_email if the user set one, otherwise falls
-- back to the account email they signed up with.
--
-- Run AFTER 007_photo_video_categories.sql.
-- ============================================================

begin;

create or replace function public.get_invoice_recipient_email(p_invoice_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
  v_inv invoices%rowtype;
  v_email text;
begin
  v_uid := public.require_auth();

  select * into v_inv from invoices where id = p_invoice_id;
  if v_inv.id is null then
    raise exception 'Invoice not found';
  end if;

  -- Only the two parties to this invoice.
  if v_inv.freelancer_id is distinct from v_uid
     and v_inv.client_id is distinct from v_uid then
    raise exception 'Not your invoice';
  end if;

  select coalesce(nullif(trim(p.billing_email), ''), u.email)
    into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = v_inv.client_id;

  return v_email;
end $$;

-- Callable by signed-in users; the function body does the real gatekeeping.
revoke all on function public.get_invoice_recipient_email(uuid) from public;
grant execute on function public.get_invoice_recipient_email(uuid) to authenticated;

commit;

-- ============================================================
-- VERIFY (as an anonymous caller this must raise, not return an address)
--   select public.get_invoice_recipient_email(
--     '00000000-0000-0000-0000-000000000000');
-- ============================================================
