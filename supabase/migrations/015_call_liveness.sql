-- ============================================================
-- CALL LIVENESS — stop dead calls wedging a conversation
--
-- Migration 014 expired calls that were left 'ringing', but nothing ever
-- expired one left 'active'. A call only reached 'ended' if somebody
-- clicked Leave; closing the tab, losing the network, or a crash left the
-- row 'active' forever.
--
-- Observed in the wild after one test call: a single row stuck at
-- status='active', answered_at set, ended_at null. Every consequence
-- followed from that one row —
--   start_call() found a "live" session and returned it instead of
--     starting a new one, so the button showed Rejoin permanently
--   get_active_call() kept reporting a call in progress
--   joining that room connected to an empty meeting
--
-- A status column alone cannot express "still there", because the event
-- that would clear it is exactly the event that fails to arrive. So the
-- clients now heartbeat while they are in a call, and a call whose
-- participants have stopped reporting is treated as over.
--
-- Run AFTER 014_video_calls.sql.
-- ============================================================

begin;

-- ---------- 1. Liveness ----------

alter table public.call_sessions
  add column if not exists last_seen_at timestamptz not null default now();

-- Anything already stranded by the old behaviour.
update public.call_sessions
   set status = 'ended', ended_at = coalesce(ended_at, now())
 where status in ('ringing', 'active')
   and started_at < now() - interval '2 minutes';

/**
 * How long a call may go unreported before it counts as dead.
 *
 * Clients beat every 15 seconds, so 60 gives three missed beats before a
 * call is written off — long enough to survive a brief network stall,
 * short enough that a closed laptop frees the conversation in under a
 * minute rather than never.
 */
create or replace function public.call_stale_after() returns interval
language sql immutable as $$ select interval '60 seconds' $$;

/**
 * Marks dead calls ended. Called at the start of the read/start paths, so
 * staleness is resolved wherever it would otherwise be observed rather
 * than needing a scheduled job.
 */
create or replace function public.expire_stale_calls(p_conversation_id uuid)
returns void
language sql security definer set search_path = public as $$
  update call_sessions
     set status = 'ended', ended_at = now()
   where conversation_id = p_conversation_id
     and (
       -- Nobody picked up.
       (status = 'ringing' and started_at < now() - interval '2 minutes')
       -- Or everybody stopped reporting in.
       or (status = 'active' and last_seen_at < now() - public.call_stale_after())
     );
$$;

/** Heartbeat from a client that is currently in the call. */
create or replace function public.touch_call(p_call_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  v_uid := public.require_auth();
  update call_sessions
     set last_seen_at = now()
   where id = p_call_id
     and status in ('ringing', 'active')
     and v_uid in (caller_id, callee_id);
end $$;

-- ---------- 2. start_call: expire first, then reuse ----------

-- Dropped rather than replaced: CREATE OR REPLACE cannot change every
-- property of an existing function, and these two were defined in 014.
-- Dropping also discards their grants, which are restored in section 4.
drop function if exists public.start_call(uuid);

create or replace function public.start_call(p_conversation_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid; v_conv conversations%rowtype; v_other uuid;
  v_existing call_sessions%rowtype; v_id uuid; v_name text;
begin
  v_uid := public.require_auth();

  select * into v_conv from conversations where id = p_conversation_id;
  if v_conv.id is null then raise exception 'Conversation not found'; end if;
  if v_uid not in (v_conv.participant_1, v_conv.participant_2) then
    raise exception 'Not your conversation';
  end if;

  -- Critical ordering: clear the dead ones BEFORE looking for a live one,
  -- or a stale row gets handed back and the conversation stays wedged.
  perform public.expire_stale_calls(p_conversation_id);

  select * into v_existing from call_sessions
   where conversation_id = p_conversation_id
     and status in ('ringing', 'active')
   limit 1;

  if v_existing.id is not null then
    -- Genuinely live: joining it is the right move, and beating on the way
    -- in stops it being reaped while the joiner is still connecting.
    perform public.touch_call(v_existing.id);
    return v_existing.id;
  end if;

  v_other := case when v_uid = v_conv.participant_1
                  then v_conv.participant_2 else v_conv.participant_1 end;

  insert into call_sessions (conversation_id, caller_id, callee_id, room_name)
  values (
    p_conversation_id, v_uid, v_other,
    'roster-' || replace(p_conversation_id::text, '-', '')
  )
  returning id into v_id;

  select coalesce(nullif(full_name, ''), 'Someone') into v_name
    from profiles where id = v_uid;

  perform public.notify(
    v_other, 'call_incoming',
    v_name || ' is calling you',
    'Video call', '/messages?c=' || p_conversation_id
  );

  return v_id;
end $$;

-- ---------- 3. get_active_call: same staleness rule ----------

-- Was STABLE in 014. It expires rows before reading them now, so it has to
-- be volatile — a STABLE function cannot call a volatile one, and Postgres
-- will not always let CREATE OR REPLACE make that switch.
drop function if exists public.get_active_call(uuid);

create or replace function public.get_active_call(p_conversation_id uuid)
returns setof call_sessions
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_conv conversations%rowtype;
begin
  v_uid := public.require_auth();

  select * into v_conv from conversations where id = p_conversation_id;
  if v_conv.id is null then return; end if;
  if v_uid not in (v_conv.participant_1, v_conv.participant_2) then
    raise exception 'Not your conversation';
  end if;

  perform public.expire_stale_calls(p_conversation_id);

  return query
    select c.* from call_sessions c
     where c.conversation_id = p_conversation_id
       and c.status in ('ringing', 'active')
     order by c.created_at desc
     limit 1;
end $$;

-- ---------- 4. Grants ----------

-- Restored for the two dropped above; DROP FUNCTION discards privileges.
grant execute on function public.start_call(uuid) to authenticated;
grant execute on function public.get_active_call(uuid) to authenticated;
revoke all on function public.start_call(uuid) from anon;
revoke all on function public.get_active_call(uuid) from anon;

grant execute on function public.touch_call(uuid) to authenticated;
revoke all on function public.touch_call(uuid) from anon;

-- Platform-internal: only the definer functions above ever call it.
revoke all on function public.expire_stale_calls(uuid) from anon, authenticated, public;

commit;

-- ============================================================
-- VERIFY
--   -- must be no rows left stranded:
--   select status, count(*) from public.call_sessions group by status;
--
--   -- and starting a call must now return a NEW id after one is abandoned:
--   select public.start_call('<a conversation id>');
-- ============================================================
