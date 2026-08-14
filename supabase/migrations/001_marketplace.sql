-- ============================================================
-- ROSTER MARKETPLACE — full migration from StageLink schema
-- Run this ONCE in the Supabase SQL editor.
--
-- Preserves: auth.users, storage bucket 'media', existing sessions.
-- Migrates:  old users/musician/organizer rows into new `profiles`
--            (musician -> freelancer, organizer -> client).
-- Replaces:  all old business tables.
-- ============================================================

begin;

-- ---------- 0. MOVE COLLIDING OLD TABLES ASIDE ----------
-- The old app already has `reviews`, `messages`, `conversations`.
-- Rename them out of the way; they are dropped at the end.
alter table if exists public.reviews rename to old_reviews;
alter table if exists public.messages rename to old_messages;
alter table if exists public.conversations rename to old_conversations;

-- ---------- 1. ENUMS ----------
create type marketplace_role as enum ('client', 'freelancer', 'admin');
create type project_status as enum ('draft', 'open', 'awarded', 'in_progress', 'completed', 'cancelled');
create type experience_level as enum ('entry', 'intermediate', 'expert');
create type location_pref as enum ('remote', 'onsite', 'hybrid');
create type bid_status as enum ('submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn');
create type contract_status as enum ('pending_acceptance', 'active', 'completed', 'cancelled', 'declined');
create type milestone_status as enum ('pending', 'in_progress', 'submitted', 'revision_requested', 'approved', 'paid', 'disputed', 'cancelled');
create type transaction_type as enum ('escrow_fund', 'release', 'refund');
create type transaction_status as enum ('pending', 'completed', 'failed');
create type dispute_status as enum ('open', 'under_review', 'resolved');
create type availability_status as enum ('available', 'limited', 'unavailable');

-- ---------- 2. CORE TABLES ----------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role marketplace_role,
  full_name text not null default '',
  headline text,
  bio text,
  avatar_url text,
  location text,
  company_name text,
  website text,
  hourly_rate integer,                      -- INR, freelancer indicative rate
  experience_years integer default 0,
  availability availability_status default 'available',
  skills text[] not null default '{}',
  is_verified boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create index profiles_skills_idx on public.profiles using gin(skills);

create table public.categories (
  id serial primary key,
  name text not null unique,
  slug text not null unique
);

create table public.skills (
  id serial primary key,
  name text not null unique
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 140),
  description text not null default '',
  category_id integer references public.categories(id),
  skills text[] not null default '{}',
  experience_level experience_level not null default 'intermediate',
  location_pref location_pref not null default 'remote',
  expected_duration text,                    -- e.g. "2-4 weeks"
  deadline date,
  budget_total integer not null default 0,   -- maintained from milestones
  status project_status not null default 'draft',
  bids_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_status_idx on public.projects(status);
create index projects_client_idx on public.projects(client_id);
create index projects_category_idx on public.projects(category_id);
create index projects_skills_idx on public.projects using gin(skills);
create index projects_published_idx on public.projects(published_at desc);

create table public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  seq integer not null,
  title text not null,
  description text,
  deliverables text,
  amount integer not null check (amount > 0),
  due_date date,
  status milestone_status not null default 'pending',
  escrow_funded boolean not null default false,
  revision_note text,
  submitted_at timestamptz,
  approved_at timestamptz,
  auto_release_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, seq)
);
create index milestones_project_idx on public.milestones(project_id);
create index milestones_status_idx on public.milestones(status);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  proposal text not null,
  delivery_days integer not null check (delivery_days > 0),
  status bid_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, freelancer_id)
);
create index bids_project_idx on public.bids(project_id);
create index bids_freelancer_idx on public.bids(freelancer_id);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bid_id uuid not null references public.bids(id),
  client_id uuid not null references public.profiles(id),
  freelancer_id uuid not null references public.profiles(id),
  agreed_amount integer not null,
  status contract_status not null default 'pending_acceptance',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index contracts_client_idx on public.contracts(client_id);
create index contracts_freelancer_idx on public.contracts(freelancer_id);
-- One live contract per project; declined/cancelled ones don't block re-awarding.
create unique index contracts_live_uniq on public.contracts(project_id)
  where status in ('pending_acceptance','active');

create table public.milestone_submissions (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  freelancer_id uuid not null references public.profiles(id),
  note text not null default '',
  attachment_url text,
  created_at timestamptz not null default now()
);
create index submissions_milestone_idx on public.milestone_submissions(milestone_id);

-- Payment ledger. NO direct write access for users — RPCs only.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  milestone_id uuid references public.milestones(id) on delete set null,
  payer_id uuid not null references public.profiles(id),
  payee_id uuid references public.profiles(id),
  type transaction_type not null,
  amount integer not null check (amount > 0),
  status transaction_status not null default 'completed',
  reference text not null default 'SIMULATED', -- provider ref once a PSP is integrated
  created_at timestamptz not null default now()
);
create index transactions_payer_idx on public.transactions(payer_id);
create index transactions_payee_idx on public.transactions(payee_id);
create index transactions_milestone_idx on public.transactions(milestone_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now(),
  unique (contract_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on public.reviews(reviewee_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  participant_1 uuid not null references public.profiles(id) on delete cascade,
  participant_2 uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (participant_1, participant_2, project_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  attachment_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.saved_projects (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  link_url text,
  skills text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index portfolio_freelancer_idx on public.portfolio_items(freelancer_id);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  raised_by uuid not null references public.profiles(id),
  reason text not null,
  details text,
  status dispute_status not null default 'open',
  resolution_note text,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

-- ---------- 3. VIEWS ----------

create view public.user_ratings as
select reviewee_id,
       round(avg(rating)::numeric, 1) as avg_rating,
       count(*) as total_reviews
from public.reviews
group by reviewee_id;

create view public.user_financials as
select p.id as user_id,
       coalesce((select sum(t.amount) from public.transactions t
                 where t.payee_id = p.id and t.type = 'release' and t.status = 'completed'), 0) as total_earned,
       coalesce((select sum(t.amount) from public.transactions t
                 where t.payer_id = p.id and t.type in ('escrow_fund') and t.status = 'completed'), 0)
       - coalesce((select sum(t.amount) from public.transactions t
                 where t.payee_id = p.id and t.type = 'refund' and t.status = 'completed'), 0) as total_spent
from public.profiles p;

-- ---------- 4. HELPERS ----------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();
create trigger bids_touch before update on public.bids for each row execute function public.touch_updated_at();

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as
$$ insert into notifications (user_id, type, title, body, link) values (p_user, p_type, p_title, p_body, p_link) $$;

-- Guarded-transition flag: definer RPCs set this so triggers can tell
-- privileged transitions apart from raw client updates.
create or replace function public.in_rpc() returns boolean
language sql stable as
$$ select coalesce(current_setting('app.in_rpc', true), '') = '1' $$;

-- ---------- 5. STATE-MACHINE & BUSINESS-RULE TRIGGERS ----------

-- New signups get an empty profile (role chosen at onboarding).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Bids: enforce marketplace rules on insert.
create or replace function public.validate_bid_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_project projects%rowtype; v_role marketplace_role;
begin
  select * into v_project from projects where id = new.project_id;
  if v_project.id is null then raise exception 'Project not found'; end if;
  if v_project.status <> 'open' then raise exception 'Project is not open for bids'; end if;
  if v_project.client_id = new.freelancer_id then raise exception 'You cannot bid on your own project'; end if;
  select role into v_role from profiles where id = new.freelancer_id;
  if v_role is distinct from 'freelancer' then raise exception 'Only freelancers can bid'; end if;
  return new;
end $$;
create trigger bids_validate before insert on public.bids for each row execute function public.validate_bid_insert();

-- Bids: only safe status transitions outside RPCs.
create or replace function public.validate_bid_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_client uuid;
begin
  if new.status is distinct from old.status and not public.in_rpc() then
    select client_id into v_client from projects where id = old.project_id;
    if new.status = 'withdrawn' then
      if auth.uid() <> old.freelancer_id or old.status not in ('submitted','shortlisted') then
        raise exception 'Invalid bid withdrawal';
      end if;
    elsif new.status = 'submitted' and old.status = 'withdrawn' then
      -- freelancer re-activates a withdrawn bid while the project is open
      if auth.uid() <> old.freelancer_id
         or not exists (select 1 from projects where id = old.project_id and status = 'open') then
        raise exception 'This bid cannot be re-activated';
      end if;
    elsif new.status in ('shortlisted','submitted') then
      if auth.uid() <> v_client or old.status not in ('submitted','shortlisted') then
        raise exception 'Only the project owner can shortlist bids';
      end if;
    else
      raise exception 'Bid status % can only be set by the platform', new.status;
    end if;
  end if;
  -- proposal edits: only the bid owner, only while the bid is live
  if (new.amount, new.proposal, new.delivery_days) is distinct from (old.amount, old.proposal, old.delivery_days) then
    if auth.uid() <> old.freelancer_id then
      raise exception 'Only the freelancer can edit their bid';
    end if;
    if old.status not in ('submitted','shortlisted') then
      raise exception 'This bid can no longer be edited';
    end if;
  end if;
  return new;
end $$;
create trigger bids_guard before update on public.bids for each row execute function public.validate_bid_update();

-- Keep projects.bids_count accurate (live bids only).
create or replace function public.sync_bids_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pid uuid;
begin
  v_pid := coalesce(new.project_id, old.project_id);
  update projects set bids_count =
    (select count(*) from bids where project_id = v_pid and status in ('submitted','shortlisted','accepted'))
  where id = v_pid;
  return null;
end $$;
create trigger bids_count_sync after insert or update or delete on public.bids
  for each row execute function public.sync_bids_count();

-- Notify the client on each new bid.
create or replace function public.notify_new_bid() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_project projects%rowtype; v_name text;
begin
  select * into v_project from projects where id = new.project_id;
  select full_name into v_name from profiles where id = new.freelancer_id;
  perform public.notify(v_project.client_id, 'bid_received',
    coalesce(v_name,'A freelancer') || ' bid on "' || v_project.title || '"',
    '₹' || new.amount || ' · ' || new.delivery_days || ' days',
    '/projects/' || v_project.id);
  return null;
end $$;
create trigger bids_notify after insert on public.bids for each row execute function public.notify_new_bid();

-- Milestones: structure is editable only pre-contract; status only via RPCs.
create or replace function public.validate_milestone_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_status project_status;
begin
  if (new.status is distinct from old.status
      or new.escrow_funded is distinct from old.escrow_funded
      or new.submitted_at is distinct from old.submitted_at
      or new.approved_at is distinct from old.approved_at) and not public.in_rpc() then
    raise exception 'Milestone lifecycle fields can only be changed by the platform';
  end if;
  select status into v_status from projects where id = old.project_id;
  if (new.title, new.description, new.deliverables, new.amount, new.due_date, new.seq)
     is distinct from (old.title, old.description, old.deliverables, old.amount, old.due_date, old.seq)
     and v_status not in ('draft','open') then
    raise exception 'Milestones are locked once a freelancer is engaged';
  end if;
  return new;
end $$;
create trigger milestones_guard before update on public.milestones for each row execute function public.validate_milestone_update();

create or replace function public.validate_milestone_delete() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_status project_status;
begin
  select status into v_status from projects where id = old.project_id;
  if v_status not in ('draft','open') then
    raise exception 'Milestones are locked once a freelancer is engaged';
  end if;
  return old;
end $$;
create trigger milestones_guard_delete before delete on public.milestones for each row execute function public.validate_milestone_delete();

-- Keep projects.budget_total = sum of milestone amounts.
create or replace function public.sync_budget_total() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pid uuid;
begin
  v_pid := coalesce(new.project_id, old.project_id);
  update projects set budget_total = coalesce(
    (select sum(amount) from milestones where project_id = v_pid and status <> 'cancelled'), 0)
  where id = v_pid;
  return null;
end $$;
create trigger milestones_budget_sync after insert or update or delete on public.milestones
  for each row execute function public.sync_budget_total();

-- Projects: guard status transitions from raw client updates.
create or replace function public.validate_project_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and not public.in_rpc() then
    if old.status = 'draft' and new.status = 'open' then
      if (select count(*) from milestones where project_id = old.id) < 1 then
        raise exception 'Add at least one milestone before publishing';
      end if;
      new.published_at := now();
    elsif old.status in ('draft','open') and new.status = 'cancelled' then
      if exists (select 1 from contracts where project_id = old.id and status in ('pending_acceptance','active')) then
        raise exception 'Cancel the contract first';
      end if;
    else
      raise exception 'Project status % → % is managed by the platform', old.status, new.status;
    end if;
  end if;
  return new;
end $$;
create trigger projects_guard before update on public.projects for each row execute function public.validate_project_update();

-- ---------- 6. RPCs (all SECURITY DEFINER + explicit auth checks) ----------

-- Client accepts a bid → contract created, others rejected.
create or replace function public.accept_bid(p_bid_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_bid bids%rowtype; v_project projects%rowtype; v_contract_id uuid; r record;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_bid from bids where id = p_bid_id;
  if v_bid.id is null then raise exception 'Bid not found'; end if;
  select * into v_project from projects where id = v_bid.project_id;
  if v_project.client_id <> auth.uid() then raise exception 'Only the project owner can accept bids'; end if;
  if v_project.status <> 'open' then raise exception 'Project is not open'; end if;
  if v_bid.status not in ('submitted','shortlisted') then raise exception 'This bid cannot be accepted'; end if;

  update bids set status = 'accepted' where id = p_bid_id;
  insert into contracts (project_id, bid_id, client_id, freelancer_id, agreed_amount)
  values (v_project.id, v_bid.id, v_project.client_id, v_bid.freelancer_id, v_bid.amount)
  returning id into v_contract_id;
  update projects set status = 'awarded' where id = v_project.id;

  for r in select * from bids where project_id = v_project.id and id <> p_bid_id and status in ('submitted','shortlisted') loop
    update bids set status = 'rejected' where id = r.id;
    perform public.notify(r.freelancer_id, 'bid_rejected',
      'Your bid on "' || v_project.title || '" was not selected', null, '/freelancer/bids');
  end loop;

  perform public.notify(v_bid.freelancer_id, 'bid_accepted',
    'You were selected for "' || v_project.title || '"!',
    'Review and confirm the milestone structure to start.', '/contracts/' || v_contract_id);
  return v_contract_id;
end $$;

-- Freelancer confirms (or declines) the milestone structure.
create or replace function public.respond_contract(p_contract_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_contract contracts%rowtype; v_title text;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_contract from contracts where id = p_contract_id;
  if v_contract.freelancer_id <> auth.uid() then raise exception 'Not your contract'; end if;
  if v_contract.status <> 'pending_acceptance' then raise exception 'Contract is not awaiting acceptance'; end if;
  select title into v_title from projects where id = v_contract.project_id;

  if p_accept then
    update contracts set status = 'active', started_at = now() where id = p_contract_id;
    update projects set status = 'in_progress' where id = v_contract.project_id;
    perform public.notify(v_contract.client_id, 'contract_accepted',
      'Freelancer confirmed the milestones for "' || v_title || '"',
      'Fund the first milestone to kick off the work.', '/contracts/' || p_contract_id);
  else
    update contracts set status = 'declined' where id = p_contract_id;
    update bids set status = 'rejected' where id = v_contract.bid_id;
    update projects set status = 'open' where id = v_contract.project_id;
    perform public.notify(v_contract.client_id, 'contract_declined',
      'The freelancer declined "' || v_title || '"',
      'Your project is open again — review other bids.', '/projects/' || v_contract.project_id);
  end if;
end $$;

-- Client funds the next milestone (simulated escrow — swap `reference`
-- handling for a real PSP later; the ledger row is the source of truth).
create or replace function public.fund_milestone(p_milestone_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m milestones%rowtype; v_c contracts%rowtype; v_prior integer;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null then raise exception 'No active contract for this project'; end if;
  if v_c.client_id <> auth.uid() then raise exception 'Only the client can fund milestones'; end if;
  if v_m.status <> 'pending' then raise exception 'Milestone is not pending'; end if;
  select count(*) into v_prior from milestones
   where project_id = v_m.project_id and seq < v_m.seq and status not in ('paid','cancelled');
  if v_prior > 0 then raise exception 'Fund milestones in order — earlier milestones are not settled yet'; end if;

  insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status)
  values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, null, 'escrow_fund', v_m.amount, 'completed');
  update milestones set escrow_funded = true, status = 'in_progress' where id = p_milestone_id;

  perform public.notify(v_c.freelancer_id, 'milestone_funded',
    'Milestone "' || v_m.title || '" is funded — work can begin',
    '₹' || v_m.amount || ' is held in escrow.', '/contracts/' || v_c.id);
end $$;

-- Freelancer submits a milestone deliverable.
create or replace function public.submit_milestone(p_milestone_id uuid, p_note text, p_attachment_url text) returns void
language plpgsql security definer set search_path = public as $$
declare v_m milestones%rowtype; v_c contracts%rowtype;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null or v_c.freelancer_id <> auth.uid() then raise exception 'Not your contract'; end if;
  if v_m.status not in ('in_progress','revision_requested') then raise exception 'Milestone is not in a submittable state'; end if;

  insert into milestone_submissions (milestone_id, contract_id, freelancer_id, note, attachment_url)
  values (v_m.id, v_c.id, auth.uid(), coalesce(p_note,''), p_attachment_url);
  update milestones set status = 'submitted', submitted_at = now(),
    auto_release_at = now() + interval '14 days' where id = p_milestone_id;

  perform public.notify(v_c.client_id, 'milestone_submitted',
    '"' || v_m.title || '" was submitted for review',
    'Approve to release ₹' || v_m.amount || ', or request a revision.', '/contracts/' || v_c.id);
end $$;

-- Client approves → escrow released to freelancer; completes contract when last milestone pays out.
create or replace function public.approve_milestone(p_milestone_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m milestones%rowtype; v_c contracts%rowtype; v_remaining integer; v_title text;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null or v_c.client_id <> auth.uid() then raise exception 'Only the client can approve milestones'; end if;
  if v_m.status <> 'submitted' then raise exception 'Milestone is not awaiting review'; end if;
  if not v_m.escrow_funded then raise exception 'Milestone escrow was never funded'; end if;

  update milestones set status = 'paid', approved_at = now() where id = p_milestone_id;
  insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status)
  values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.freelancer_id, 'release', v_m.amount, 'completed');

  perform public.notify(v_c.freelancer_id, 'milestone_paid',
    '₹' || v_m.amount || ' released for "' || v_m.title || '"', null, '/contracts/' || v_c.id);

  select count(*) into v_remaining from milestones
   where project_id = v_m.project_id and status not in ('paid','cancelled');
  if v_remaining = 0 then
    update contracts set status = 'completed', completed_at = now() where id = v_c.id;
    update projects set status = 'completed' where id = v_m.project_id;
    select title into v_title from projects where id = v_m.project_id;
    perform public.notify(v_c.client_id, 'project_completed',
      '"' || v_title || '" is complete', 'Leave a review for your freelancer.', '/contracts/' || v_c.id);
    perform public.notify(v_c.freelancer_id, 'project_completed',
      '"' || v_title || '" is complete', 'Leave a review for your client.', '/contracts/' || v_c.id);
  end if;
end $$;

-- Client requests changes on a submitted milestone.
create or replace function public.request_revision(p_milestone_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_m milestones%rowtype; v_c contracts%rowtype;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  select * into v_c from contracts where project_id = v_m.project_id and status = 'active';
  if v_c.id is null or v_c.client_id <> auth.uid() then raise exception 'Only the client can request revisions'; end if;
  if v_m.status <> 'submitted' then raise exception 'Milestone is not awaiting review'; end if;

  update milestones set status = 'revision_requested', revision_note = p_note, auto_release_at = null
  where id = p_milestone_id;
  perform public.notify(v_c.freelancer_id, 'revision_requested',
    'Revision requested on "' || v_m.title || '"', p_note, '/contracts/' || v_c.id);
end $$;

-- Either party opens a dispute on a live milestone.
create or replace function public.open_dispute(p_milestone_id uuid, p_reason text, p_details text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_m milestones%rowtype; v_c contracts%rowtype; v_id uuid; v_other uuid; r record;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_m from milestones where id = p_milestone_id;
  select * into v_c from contracts where project_id = v_m.project_id and status in ('active');
  if v_c.id is null or auth.uid() not in (v_c.client_id, v_c.freelancer_id) then raise exception 'Not your contract'; end if;
  if v_m.status not in ('in_progress','submitted','revision_requested') then raise exception 'This milestone cannot be disputed'; end if;

  update milestones set status = 'disputed', auto_release_at = null where id = p_milestone_id;
  insert into disputes (contract_id, milestone_id, raised_by, reason, details)
  values (v_c.id, v_m.id, auth.uid(), p_reason, p_details) returning id into v_id;

  v_other := case when auth.uid() = v_c.client_id then v_c.freelancer_id else v_c.client_id end;
  perform public.notify(v_other, 'dispute_opened',
    'A dispute was opened on "' || v_m.title || '"', p_reason, '/contracts/' || v_c.id);
  for r in select id from profiles where role = 'admin' loop
    perform public.notify(r.id, 'dispute_opened', 'New dispute requires review', p_reason, '/admin/disputes');
  end loop;
  return v_id;
end $$;

-- Admin resolves a dispute: release escrow to freelancer or refund the client.
create or replace function public.resolve_dispute(p_dispute_id uuid, p_outcome text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_d disputes%rowtype; v_m milestones%rowtype; v_c contracts%rowtype;
begin
  perform set_config('app.in_rpc','1',true);
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_d from disputes where id = p_dispute_id;
  if v_d.status = 'resolved' then raise exception 'Already resolved'; end if;
  select * into v_m from milestones where id = v_d.milestone_id;
  select * into v_c from contracts where id = v_d.contract_id;

  if p_outcome = 'release' then
    update milestones set status = 'paid', approved_at = now() where id = v_m.id;
    insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status, reference)
    values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.freelancer_id, 'release', v_m.amount, 'completed', 'DISPUTE');
  elsif p_outcome = 'refund' then
    update milestones set status = 'cancelled' where id = v_m.id;
    if v_m.escrow_funded then
      insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status, reference)
      values (v_m.project_id, v_c.id, v_m.id, v_c.client_id, v_c.client_id, 'refund', v_m.amount, 'completed', 'DISPUTE');
    end if;
  else
    raise exception 'Outcome must be release or refund';
  end if;

  update disputes set status = 'resolved', resolution_note = p_note, resolved_by = auth.uid(), resolved_at = now()
  where id = p_dispute_id;
  perform public.notify(v_c.client_id, 'dispute_resolved', 'Dispute resolved: ' || p_outcome, p_note, '/contracts/' || v_c.id);
  perform public.notify(v_c.freelancer_id, 'dispute_resolved', 'Dispute resolved: ' || p_outcome, p_note, '/contracts/' || v_c.id);
end $$;

-- Either party cancels an active contract; funded-but-unpaid milestones refund.
create or replace function public.cancel_contract(p_contract_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_c contracts%rowtype; v_m record; v_other uuid; v_title text;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_c from contracts where id = p_contract_id;
  if auth.uid() not in (v_c.client_id, v_c.freelancer_id) then raise exception 'Not your contract'; end if;
  if v_c.status not in ('pending_acceptance','active') then raise exception 'Contract is not live'; end if;

  for v_m in select * from milestones where project_id = v_c.project_id and status not in ('paid','cancelled') loop
    if v_m.escrow_funded and v_m.status in ('in_progress','submitted','revision_requested','disputed') then
      insert into transactions (project_id, contract_id, milestone_id, payer_id, payee_id, type, amount, status, reference)
      values (v_c.project_id, v_c.id, v_m.id, v_c.client_id, v_c.client_id, 'refund', v_m.amount, 'completed', 'CANCELLATION');
    end if;
    update milestones set status = 'cancelled' where id = v_m.id;
  end loop;

  update contracts set status = 'cancelled' where id = p_contract_id;
  update projects set status = 'cancelled' where id = v_c.project_id;
  select title into v_title from projects where id = v_c.project_id;
  v_other := case when auth.uid() = v_c.client_id then v_c.freelancer_id else v_c.client_id end;
  perform public.notify(v_other, 'contract_cancelled',
    '"' || v_title || '" was cancelled', p_reason, '/contracts/' || p_contract_id);
end $$;

-- Two-way reviews, only after the contract reaches a terminal state.
create or replace function public.create_review(p_contract_id uuid, p_rating integer, p_text text) returns void
language plpgsql security definer set search_path = public as $$
declare v_c contracts%rowtype; v_reviewee uuid;
begin
  perform set_config('app.in_rpc','1',true);
  select * into v_c from contracts where id = p_contract_id;
  if auth.uid() not in (v_c.client_id, v_c.freelancer_id) then raise exception 'Not your contract'; end if;
  if v_c.status not in ('completed','cancelled') then raise exception 'Reviews open once the contract ends'; end if;
  if p_rating not between 1 and 5 then raise exception 'Rating must be 1-5'; end if;
  v_reviewee := case when auth.uid() = v_c.client_id then v_c.freelancer_id else v_c.client_id end;

  insert into reviews (contract_id, reviewer_id, reviewee_id, rating, review_text)
  values (p_contract_id, auth.uid(), v_reviewee, p_rating, p_text);
  perform public.notify(v_reviewee, 'review_received',
    'You received a ' || p_rating || '-star review', p_text, '/u/' || v_reviewee);
end $$;

-- ---------- 7. ROW LEVEL SECURITY ----------

alter table public.profiles enable row level security;
create policy "profiles_read_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_admin_update" on public.profiles for update using (public.is_admin());
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Users cannot self-verify, self-unsuspend, or switch role after onboarding.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.is_verified is distinct from old.is_verified
       or new.is_suspended is distinct from old.is_suspended then
      raise exception 'Verification and suspension are managed by the platform';
    end if;
    if old.role is not null and new.role is distinct from old.role then
      raise exception 'Account type cannot be changed after onboarding';
    end if;
    if new.role = 'admin' then
      raise exception 'Nice try';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.categories enable row level security;
create policy "categories_read" on public.categories for select using (true);
alter table public.skills enable row level security;
create policy "skills_read" on public.skills for select using (true);
create policy "skills_insert_auth" on public.skills for insert with check (auth.uid() is not null);

alter table public.projects enable row level security;
create policy "projects_read" on public.projects for select using (
  status <> 'draft' or client_id = auth.uid() or public.is_admin());
create policy "projects_insert_own" on public.projects for insert with check (
  client_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'client' and not is_suspended));
create policy "projects_update_own" on public.projects for update using (client_id = auth.uid() or public.is_admin());
create policy "projects_delete_draft" on public.projects for delete using (client_id = auth.uid() and status = 'draft');

alter table public.project_attachments enable row level security;
create policy "attachments_read" on public.project_attachments for select using (
  exists (select 1 from projects p where p.id = project_id and (p.status <> 'draft' or p.client_id = auth.uid())));
create policy "attachments_write" on public.project_attachments for insert with check (
  exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid()));
create policy "attachments_delete" on public.project_attachments for delete using (
  exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid()));

alter table public.milestones enable row level security;
create policy "milestones_read" on public.milestones for select using (
  exists (select 1 from projects p where p.id = project_id and (p.status <> 'draft' or p.client_id = auth.uid())));
create policy "milestones_write" on public.milestones for insert with check (
  exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid() and p.status in ('draft','open')));
create policy "milestones_update" on public.milestones for update using (
  exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid()));
create policy "milestones_delete" on public.milestones for delete using (
  exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid()));

alter table public.bids enable row level security;
create policy "bids_read" on public.bids for select using (
  freelancer_id = auth.uid()
  or exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid())
  or public.is_admin());
create policy "bids_insert_own" on public.bids for insert with check (freelancer_id = auth.uid());
create policy "bids_update" on public.bids for update using (
  freelancer_id = auth.uid()
  or exists (select 1 from projects p where p.id = project_id and p.client_id = auth.uid()));

alter table public.contracts enable row level security;
create policy "contracts_read" on public.contracts for select using (
  client_id = auth.uid() or freelancer_id = auth.uid() or public.is_admin());

alter table public.milestone_submissions enable row level security;
create policy "submissions_read" on public.milestone_submissions for select using (
  exists (select 1 from contracts c where c.id = contract_id
          and (c.client_id = auth.uid() or c.freelancer_id = auth.uid())) or public.is_admin());

alter table public.transactions enable row level security;
create policy "transactions_read" on public.transactions for select using (
  payer_id = auth.uid() or payee_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: ledger writes happen only inside definer RPCs.

alter table public.reviews enable row level security;
create policy "reviews_read" on public.reviews for select using (true);
-- Inserts only via create_review RPC.

alter table public.conversations enable row level security;
create policy "conversations_read" on public.conversations for select using (
  participant_1 = auth.uid() or participant_2 = auth.uid());
create policy "conversations_insert" on public.conversations for insert with check (
  participant_1 = auth.uid() or participant_2 = auth.uid());

alter table public.messages enable row level security;
create policy "messages_read" on public.messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id
          and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())));
create policy "messages_insert" on public.messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from conversations c where c.id = conversation_id
          and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())));
create policy "messages_mark_read" on public.messages for update using (
  sender_id <> auth.uid() and exists (select 1 from conversations c where c.id = conversation_id
          and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())));

alter table public.notifications enable row level security;
create policy "notifications_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid());
create policy "notifications_delete_own" on public.notifications for delete using (user_id = auth.uid());

alter table public.saved_projects enable row level security;
create policy "saved_own" on public.saved_projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.portfolio_items enable row level security;
create policy "portfolio_read" on public.portfolio_items for select using (true);
create policy "portfolio_write" on public.portfolio_items for insert with check (freelancer_id = auth.uid());
create policy "portfolio_update" on public.portfolio_items for update using (freelancer_id = auth.uid());
create policy "portfolio_delete" on public.portfolio_items for delete using (freelancer_id = auth.uid());

alter table public.disputes enable row level security;
create policy "disputes_read" on public.disputes for select using (
  raised_by = auth.uid()
  or exists (select 1 from contracts c where c.id = contract_id
             and (c.client_id = auth.uid() or c.freelancer_id = auth.uid()))
  or public.is_admin());
create policy "disputes_admin_update" on public.disputes for update using (public.is_admin());

alter table public.reports enable row level security;
create policy "reports_insert" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports_read" on public.reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_admin_update" on public.reports for update using (public.is_admin());

-- ---------- 8. REALTIME ----------
do $$ begin
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.messages;
exception when others then null; -- publication missing or tables already added
end $$;

-- ---------- 9. SEED DATA ----------
insert into public.categories (name, slug) values
  ('Web Development','web-development'), ('Mobile Apps','mobile-apps'),
  ('Design & Creative','design-creative'), ('Writing & Translation','writing-translation'),
  ('Digital Marketing','digital-marketing'), ('Video & Animation','video-animation'),
  ('Data & AI','data-ai'), ('Engineering & Architecture','engineering-architecture'),
  ('Finance & Accounting','finance-accounting'), ('Admin & Support','admin-support'),
  ('Music & Audio','music-audio'), ('Legal','legal');

insert into public.skills (name) values
  ('React'),('Next.js'),('Node.js'),('TypeScript'),('Python'),('Django'),('Flutter'),('React Native'),
  ('Swift'),('Kotlin'),('PostgreSQL'),('Supabase'),('Firebase'),('AWS'),('DevOps'),('UI Design'),
  ('UX Research'),('Figma'),('Illustration'),('Logo Design'),('Branding'),('Motion Graphics'),
  ('Video Editing'),('3D Modeling'),('Copywriting'),('Content Writing'),('Technical Writing'),
  ('Translation'),('SEO'),('Social Media Marketing'),('Performance Ads'),('Email Marketing'),
  ('Data Analysis'),('Machine Learning'),('Data Engineering'),('Excel'),('Bookkeeping'),
  ('Tax Filing'),('Virtual Assistance'),('Customer Support'),('Voice Over'),('Music Production'),
  ('Contract Drafting'),('WordPress'),('Shopify'),('Game Development'),('Blockchain'),('QA Testing');

-- ---------- 10. MIGRATE OLD USERS, THEN TEAR DOWN OLD TABLES ----------

-- Carry every existing account into `profiles` with a mapped role.
-- musician -> freelancer, organizer -> client. Names/bios/photos are preserved.
insert into public.profiles (id, role, full_name, bio, avatar_url, location, company_name, skills, created_at)
select
  u.id,
  case u.role::text when 'musician' then 'freelancer'::marketplace_role
                    when 'organizer' then 'client'::marketplace_role
                    else null end,
  coalesce(m.stage_name, o.organizer_name, ''),
  m.bio,
  m.profile_image,
  coalesce(m.city, o.city),
  o.company_name,
  coalesce(m.genres, '{}'),
  u.created_at
from public.users u
left join public.musician_profiles m on m.user_id = u.id
left join public.organizer_profiles o on o.user_id = u.id
on conflict (id) do nothing;

-- Safety net: any auth user without a profile row still gets one
-- (role null -> they pick client/freelancer at next login).
insert into public.profiles (id, created_at)
select a.id, a.created_at from auth.users a
on conflict (id) do nothing;

-- Old business tables (dependents first, `users` last).
drop view if exists public.musician_ratings;
drop table if exists public.old_reviews cascade;
drop table if exists public.old_messages cascade;
drop table if exists public.old_conversations cascade;
drop table if exists public.musician_media cascade;
drop table if exists public.availability cascade;
drop table if exists public.inquiries cascade;
drop table if exists public.musician_profiles cascade;
drop table if exists public.organizer_profiles cascade;
drop table if exists public.users cascade;
drop type if exists user_role;
drop type if exists inquiry_status;
drop type if exists media_type;

commit;

-- ============================================================
-- POST-MIGRATION (run separately, replacing the email)
--
-- Grant yourself admin access to /admin:
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- Verify the migration:
--   select role, count(*) from public.profiles group by role;
--   select count(*) from public.categories;  -- expect 12
--   select count(*) from public.skills;      -- expect 48
-- ============================================================
