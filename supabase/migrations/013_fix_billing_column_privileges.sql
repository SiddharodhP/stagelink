-- ============================================================
-- SECURITY FIX — billing details are still world-readable
--
-- Migration 011 tried to hide the billing block with:
--   revoke select (billing_address, billing_email, phone, tax_id,
--                  tax_id_label) on public.profiles from anon, authenticated;
--
-- That does nothing. Supabase grants SELECT on public tables at the TABLE
-- level, and in PostgreSQL a table-level grant covers every column. A
-- column-level REVOKE cannot subtract from it — the column list is only
-- consulted when there is no table-wide privilege to fall back on.
--
-- Verified after 011 was applied, with the public anon key:
--   /rest/v1/profiles?select=*  returned all 32 columns, including
--   billing_address, billing_email, phone, tax_id and tax_id_label.
--
-- The correct shape is the inverse: drop the table-level grant, then grant
-- back an explicit column list. That is what this does.
--
-- This matters more than it did a migration ago: /onboarding now collects
-- phone numbers and billing addresses, so these columns are about to stop
-- being NULL.
--
-- Run AFTER 012_cities_worldwide.sql.
-- ============================================================

begin;

-- ---------- 1. Drop the table-wide read ----------

revoke select on public.profiles from anon, authenticated;

-- ---------- 2. Grant back everything except the billing block ----------

-- Enumerated deliberately rather than generated: a new column added later
-- is invisible until someone adds it here, which is the safe direction to
-- fail. Adding a column to profiles means adding it to this list too.
grant select (
  id,
  role,
  full_name,
  headline,
  bio,
  avatar_url,
  location,
  company_name,
  website,
  hourly_rate,
  experience_years,
  availability,
  skills,
  is_verified,
  is_suspended,
  created_at,
  updated_at,
  avg_rating,
  total_reviews,
  total_earned,
  total_spent,
  city,
  state,
  country,
  works_remotely,
  travel_radius_km,
  completeness
) on public.profiles to anon, authenticated;

-- Withheld on purpose, readable only through get_my_billing():
--   billing_address, billing_email, phone, tax_id, tax_id_label
--
-- UPDATE is untouched, so profiles_update_own still lets a user write
-- their own billing details — they just can't read anybody's, including
-- their own, without the definer function.
--
-- SECURITY DEFINER functions (create_invoice, issue_recurring_invoice,
-- get_my_billing) run as the owner and keep full column access, so
-- invoicing is unaffected.

commit;

-- ============================================================
-- VERIFY — with the ANON key. Run BOTH; the first is the real test.
--
--   -- must fail with "permission denied for column billing_email":
--   select billing_email, phone, tax_id from public.profiles limit 1;
--
--   -- must still return rows:
--   select id, full_name, city, completeness from public.profiles limit 5;
--
-- Over the REST API, select=* now also fails, because * expands to
-- columns the role cannot read. Every client-side read already projects
-- an explicit column list (PUBLIC_PROFILE_COLUMNS), so that is expected.
-- ============================================================
