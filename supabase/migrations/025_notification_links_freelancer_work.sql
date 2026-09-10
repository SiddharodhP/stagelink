-- ============================================================
-- REJECTION NOTIFICATIONS POINT AT A PAGE THAT EXISTS
--
-- /freelancer/bids and /freelancer/contracts merged into /freelancer/work,
-- the same way /client/projects absorbed /client/contracts: a bid and the
-- contract it becomes are one job at two stages.
--
-- accept_bid still wrote the old path. When a client awards a project, it
-- notifies every freelancer who lost, and the link on that notification was
-- '/freelancer/bids'. The notifications table stores the link as literal
-- text at the moment the row is written, so it is a snapshot, not a live
-- pointer -- the row keeps whatever path was current when it was created,
-- however the app is laid out later.
--
-- next.config.ts redirects the old paths, so nothing 404s today. But a
-- redirect is a patch over a wrong address rather than a correction of it:
-- left alone, every future award writes more rows that depend on that
-- redirect existing forever. This fixes the source, which lets the redirect
-- go back to being what it should be -- cover for old rows and bookmarks.
--
-- WHY CREATE OR REPLACE AND NOT DROP
--
-- The signature is unchanged, so REPLACE keeps the function's privileges.
-- Dropping and recreating would silently discard them, which is how
-- migration 015 managed to apply cleanly and do nothing. accept_bid carries
-- no explicit grants -- it runs on Supabase's defaults and guards itself
-- with require_auth() -- so losing them would be easy to miss.
--
-- The body below is migration 018's, unchanged apart from the one path.
--
-- Run AFTER 024_relax_project_title_length.sql.
-- ============================================================

begin;

create or replace function public.accept_bid(p_bid_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_bid bids%rowtype; v_project projects%rowtype;
  v_contract_id uuid; r record; v_conv_id uuid;
begin
  v_uid := public.require_auth();
  perform set_config('app.in_rpc','1',true);

  select * into v_bid from bids where id = p_bid_id;
  if v_bid.id is null then raise exception 'Bid not found'; end if;
  select * into v_project from projects where id = v_bid.project_id;
  if v_project.id is null then raise exception 'Project not found'; end if;
  if v_project.client_id is distinct from v_uid then
    raise exception 'Only the project owner can accept bids';
  end if;
  if v_project.status <> 'open' then raise exception 'Project is not open'; end if;
  if v_bid.status not in ('submitted','shortlisted') then
    raise exception 'This bid cannot be accepted';
  end if;

  update bids set status = 'accepted' where id = p_bid_id;
  insert into contracts (project_id, bid_id, client_id, freelancer_id, agreed_amount)
  values (v_project.id, v_bid.id, v_project.client_id, v_bid.freelancer_id, v_bid.amount)
  returning id into v_contract_id;
  update projects set status = 'awarded' where id = v_project.id;

  for r in select * from bids
            where project_id = v_project.id and id <> p_bid_id
              and status in ('submitted','shortlisted') loop
    update bids set status = 'rejected' where id = r.id;
    -- The only line that changes in this migration.
    perform public.notify(r.freelancer_id, 'bid_rejected',
      'Your bid on "' || v_project.title || '" was not selected', null, '/freelancer/work');
  end loop;

  -- The plan is meant to come out of a conversation, so open one rather
  -- than expecting either side to go and start it.
  select id into v_conv_id from conversations
   where project_id = v_project.id
     and ((participant_1 = v_project.client_id and participant_2 = v_bid.freelancer_id)
       or (participant_1 = v_bid.freelancer_id and participant_2 = v_project.client_id))
   limit 1;

  if v_conv_id is null then
    insert into conversations (participant_1, participant_2, project_id)
    values (v_project.client_id, v_bid.freelancer_id, v_project.id)
    returning id into v_conv_id;
  end if;

  perform public.notify(v_bid.freelancer_id, 'bid_accepted',
    'You were selected for "' || v_project.title || '"!',
    'Discuss the work with the client — they will send a milestone plan for you to confirm.',
    '/contracts/' || v_contract_id);

  return v_contract_id;
end $$;

-- ---------- Rows already written ----------

-- Nothing depends on this today: the paths only ever appeared on
-- bid_rejected notifications, and this database has never had a rejected
-- bid. It is here so the migration is correct on any database it meets,
-- including one restored from an older backup.

update public.notifications
   set link = '/freelancer/work'
 where link in ('/freelancer/bids', '/freelancer/contracts');

update public.notifications
   set link = '/client/projects'
 where link = '/client/contracts';

commit;

-- ============================================================
-- VERIFY
--
--   -- must return zero rows:
--   select link, count(*) from public.notifications
--    where link in ('/freelancer/bids', '/freelancer/contracts',
--                   '/client/contracts')
--    group by link;
--
--   -- the function must now carry the new path:
--   select position('/freelancer/work' in prosrc) > 0 as fixed,
--          position('/freelancer/bids' in prosrc) > 0 as stale
--     from pg_proc where proname = 'accept_bid';
--   -- expect: fixed = true, stale = false
--
--   -- and still be closed to anonymous callers:
--   --   select public.accept_bid('00000000-0000-0000-0000-000000000000');
--   -- expect: "Authentication required"
-- ============================================================
