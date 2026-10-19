-- ============================================================
-- MAKING THE FIRST ADMIN POSSIBLE
--
-- profiles_guard calls guard_profile_update before every profile update, and
-- that function refuses a role change unless is_admin() is true. Sound rule,
-- with one consequence nobody wanted: on a platform with no admin yet, there
-- is no way to make one.
--
--   is_admin()  =  exists (select 1 from profiles
--                          where id = auth.uid() and role = 'admin')
--
-- The service role has no auth.uid(), so is_admin() is false for it too. It
-- bypasses RLS but NOT triggers, so even the platform's own key is refused.
-- With zero admins the guard is unsatisfiable, and 031's set_user_role --
-- which requires an admin to call it -- cannot bootstrap the first one
-- either.
--
-- WHY ALLOWING THE SERVICE ROLE IS NOT A WEAKENING
--
-- Anyone holding the service role key already owns this database. They can
-- disable the trigger, change the function, or edit the row directly. The
-- guard was never a barrier to them -- it only blocked the honest path and
-- pushed the operation towards disabling triggers by hand, which is worse.
--
-- The key itself is server-only: it has no NEXT_PUBLIC_ prefix, is read in
-- route handlers only, and was verified absent from the browser bundle.
--
-- What is NOT changed: an ordinary authenticated user still cannot change
-- their own role, self-verify, or self-unsuspend. Those checks are untouched.
--
-- Run AFTER 031_dispute_outcomes.sql.
-- ============================================================

begin;

create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- The platform acting as itself, or an admin acting through the product.
  -- Everyone else falls through to the checks below.
  if public.is_admin() or public.is_service_role() then
    return new;
  end if;

  if new.is_verified is distinct from old.is_verified
     or new.is_suspended is distinct from old.is_suspended then
    raise exception 'Verification and suspension are managed by the platform';
  end if;

  if old.role is not null and new.role is distinct from old.role then
    raise exception 'Account type cannot be changed after onboarding';
  end if;

  -- Kept although the check above already covers it: a role arriving as
  -- 'admin' from a caller who is neither an admin nor the platform is worth
  -- refusing on its own terms, whatever the old value was.
  if new.role = 'admin' and old.role is distinct from 'admin' then
    raise exception 'Nice try';
  end if;

  return new;
end $$;

commit;

-- ------------------------------------------------------------
-- AFTER THIS RUNS
--
-- The first admin can be made with the service role, through the ordinary
-- API rather than by disabling triggers:
--
--   update public.profiles set role = 'admin' where id = '<uuid>';
--
-- and from then on 031's set_user_role() handles promotions and demotions
-- from inside the product, with its own guards against removing the last
-- admin or demoting yourself.
-- ------------------------------------------------------------
