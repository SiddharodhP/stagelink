-- ============================================================
-- PROJECT COMMENTS — public notes attached to bids
--
-- Every bid now carries a short note the freelancer writes FOR PUBLIC
-- VIEW, shown as a comment on the project so other freelancers can see
-- who they are up against.
--
-- WHAT IS NOT PUBLISHED, AND WHY
--
-- bids.proposal and bids.amount stay private, readable only by the bidder
-- and the client, exactly as before. The public note is a separate column.
--
-- That separation is the whole design. Bids are private on Upwork and
-- Freelancer for a reason: a late bidder who can read earlier proposals
-- can undercut them, which pushes prices down and rewards bidding last.
-- Publishing the pitch and the number would import that problem wholesale.
-- Publishing a note the freelancer knowingly wrote for an audience gives
-- the transparency without handing over anyone's strategy.
--
-- ATOMICITY
--
-- The bid and its comment are written by one function. Inserting them
-- separately from the client would let a project show five bids and four
-- comments the moment a request fails halfway.
--
-- Run AFTER 016_photo_video_only.sql.
-- ============================================================

begin;

-- ---------- 1. The public note lives on the bid ----------

alter table public.bids
  add column if not exists public_note text;

-- ---------- 2. Comments ----------

create table if not exists public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- Set when the comment came from a bid. Null leaves room for plain
  -- questions on a project later without reshaping anything.
  bid_id uuid references public.bids(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 1000),
  -- A withdrawn bid keeps its comment but marks it, so the thread stays
  -- honest rather than silently losing entries.
  is_withdrawn boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_comments_project_idx
  on public.project_comments(project_id, created_at desc);
create index if not exists project_comments_author_idx
  on public.project_comments(author_id);

-- One comment per bid; editing a bid edits its comment.
create unique index if not exists project_comments_one_per_bid
  on public.project_comments(bid_id) where bid_id is not null;

-- ---------- 3. Place a bid and publish its note, together ----------

/**
 * Replaces the direct insert the client used to do. The bid and its
 * public comment are one operation, so the two can never disagree.
 */
create or replace function public.place_bid(
  p_project_id uuid,
  p_amount integer,
  p_proposal text,
  p_delivery_days integer,
  p_public_note text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_project projects%rowtype; v_role marketplace_role;
  v_bid_id uuid; v_note text;
begin
  v_uid := public.require_auth();

  select role into v_role from profiles
   where id = v_uid and not is_suspended;
  if v_role is distinct from 'freelancer' then
    raise exception 'Only freelancers can bid';
  end if;

  select * into v_project from projects where id = p_project_id;
  if v_project.id is null then raise exception 'Project not found'; end if;
  if v_project.status <> 'open' then
    raise exception 'This project is no longer accepting bids';
  end if;
  if v_project.client_id = v_uid then
    raise exception 'You cannot bid on your own project';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter a bid amount greater than zero';
  end if;
  if p_delivery_days is null or p_delivery_days <= 0 then
    raise exception 'Enter a delivery time in days';
  end if;
  if coalesce(trim(p_proposal), '') = '' then
    raise exception 'Write a proposal for the client';
  end if;

  v_note := nullif(trim(coalesce(p_public_note, '')), '');
  if v_note is null then
    raise exception 'Add a short public note — other freelancers will see it';
  end if;
  if length(v_note) > 1000 then
    raise exception 'Keep the public note under 1000 characters';
  end if;

  insert into bids (project_id, freelancer_id, amount, proposal, delivery_days, public_note)
  values (p_project_id, v_uid, p_amount, trim(p_proposal), p_delivery_days, v_note)
  returning id into v_bid_id;

  insert into project_comments (project_id, author_id, bid_id, body)
  values (p_project_id, v_uid, v_bid_id, v_note);

  return v_bid_id;
end $$;

/** Editing a bid edits the comment it published. */
create or replace function public.update_bid_note(
  p_bid_id uuid,
  p_amount integer,
  p_proposal text,
  p_delivery_days integer,
  p_public_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_bid bids%rowtype; v_note text;
begin
  v_uid := public.require_auth();

  select * into v_bid from bids where id = p_bid_id;
  if v_bid.id is null then raise exception 'Bid not found'; end if;
  if v_bid.freelancer_id is distinct from v_uid then
    raise exception 'Not your bid';
  end if;
  if v_bid.status not in ('submitted', 'shortlisted') then
    raise exception 'This bid can no longer be edited';
  end if;

  v_note := nullif(trim(coalesce(p_public_note, '')), '');
  if v_note is null then
    raise exception 'Add a short public note — other freelancers will see it';
  end if;

  update bids
     set amount = coalesce(p_amount, amount),
         proposal = coalesce(nullif(trim(p_proposal), ''), proposal),
         delivery_days = coalesce(p_delivery_days, delivery_days),
         public_note = v_note,
         updated_at = now()
   where id = p_bid_id;

  update project_comments
     set body = v_note, updated_at = now()
   where bid_id = p_bid_id;
end $$;

/** Withdrawing marks the comment rather than deleting it. */
create or replace function public.withdraw_bid(p_bid_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_bid bids%rowtype;
begin
  v_uid := public.require_auth();
  select * into v_bid from bids where id = p_bid_id;
  if v_bid.id is null then raise exception 'Bid not found'; end if;
  if v_bid.freelancer_id is distinct from v_uid then
    raise exception 'Not your bid';
  end if;

  update bids set status = 'withdrawn', updated_at = now() where id = p_bid_id;
  update project_comments
     set is_withdrawn = true, updated_at = now()
   where bid_id = p_bid_id;
end $$;

-- ---------- 4. Backfill ----------

-- Existing bids predate the public note. Their proposals were written in
-- confidence, so they are NOT published — the comment thread simply starts
-- from here.
-- (Deliberately no backfill. Publishing text somebody wrote privately
--  would be a betrayal of the context it was written in.)

-- ---------- 5. RLS ----------

alter table public.project_comments enable row level security;

-- Readable by anyone who can read the project, which for a non-draft
-- project means the public — that is the point of the feature.
create policy "project_comments_read" on public.project_comments for select using (
  exists (
    select 1 from projects p
     where p.id = project_id
       and (p.status <> 'draft' or p.client_id = auth.uid())
  )
);

-- No insert/update/delete policies: comments only ever come from the
-- definer functions above, so a bid and its comment cannot drift apart.

-- ---------- 6. Grants ----------

grant execute on function public.place_bid(uuid, integer, text, integer, text) to authenticated;
grant execute on function public.update_bid_note(uuid, integer, text, integer, text) to authenticated;
grant execute on function public.withdraw_bid(uuid) to authenticated;

revoke all on function public.place_bid(uuid, integer, text, integer, text) from anon;
revoke all on function public.update_bid_note(uuid, integer, text, integer, text) from anon;
revoke all on function public.withdraw_bid(uuid) from anon;

commit;

-- ============================================================
-- VERIFY
--   -- anonymous callers must be rejected:
--   select public.place_bid('00000000-0000-0000-0000-000000000000', 100, 'x', 1, 'y');
--
--   -- but reading the thread anonymously must WORK (that is the feature):
--   select body, is_withdrawn, created_at from public.project_comments
--    order by created_at desc limit 10;
--
--   -- and bids must still be private:
--   select amount, proposal from public.bids limit 1;   -- expect no rows
-- ============================================================
