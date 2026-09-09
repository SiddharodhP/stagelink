-- ============================================================
-- A TITLE JUST HAS TO EXIST
--
-- projects.title carried check (char_length(title) between 5 and 140).
-- The wizard enforced the same five character minimum before submitting,
-- so the constraint never actually fired -- but the minimum is being
-- dropped from the form, and without this the database would reject a
-- short title with a raw constraint violation instead of accepting it.
--
-- The upper bound stays. It is a layout limit as much as a data one: the
-- input is maxLength 140 and project cards are built around titles that
-- fit on two lines.
--
-- Run AFTER 023_single_currency_usd.sql.
-- ============================================================

begin;

alter table public.projects
  drop constraint if exists projects_title_check;

alter table public.projects
  add constraint projects_title_check
  check (char_length(title) between 1 and 140);

commit;

-- ============================================================
-- VERIFY
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--    where conrelid = 'public.projects'::regclass
--      and conname = 'projects_title_check';
--   -- expect: CHECK ((char_length(title) >= 1 AND char_length(title) <= 140))
-- ============================================================
