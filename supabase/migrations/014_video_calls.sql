-- ============================================================
-- VIDEO CALLS — 8x8 JaaS, embedded in the messages page
--
-- The call itself runs on 8x8's infrastructure inside an iframe on our
-- page; this table is the part that has to live here: who is calling whom,
-- whether the other side has picked up, and what the thread should show
-- afterwards.
--
-- WHY A TABLE RATHER THAN A CHAT MESSAGE
--
-- A call needs state a message can't carry — ringing vs answered vs
-- declined, and a "still ringing" row has to be able to expire. Reusing
-- messages would mean editing chat history every time somebody's camera
-- reconnects.
--
-- The room name is derived from the conversation, so both parties compute
-- the same room without negotiating one. It is NOT a secret: authorisation
-- comes from the JaaS JWT, which the server only mints for the two people
-- on the conversation, scoped to that single room.
--
-- Run AFTER 013_fix_billing_column_privileges.sql.
-- ============================================================

begin;

create type call_status as enum ('ringing', 'active', 'ended', 'declined', 'missed');

create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  -- Deterministic per conversation, so a reconnect rejoins rather than
  -- opening a second empty room.
  room_name text not null,
  status call_status not null default 'ringing',
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index call_sessions_conversation_idx
  on public.call_sessions(conversation_id, created_at desc);
create index call_sessions_callee_idx
  on public.call_sessions(callee_id, status);

-- One live call per conversation. Two people hitting "call" at the same
-- moment must land in one room, not two.
create unique index call_sessions_one_live_per_conversation
  on public.call_sessions(conversation_id)
  where status in ('ringing', 'active');

-- ---------- Start ----------

/**
 * Rings the other participant. Returns the existing session if one is
 * already live, so simultaneous calls converge instead of colliding.
 */
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

  -- Anything still ringing after two minutes was never answered.
  update call_sessions
     set status = 'missed', ended_at = now()
   where conversation_id = p_conversation_id
     and status = 'ringing'
     and started_at < now() - interval '2 minutes';

  select * into v_existing from call_sessions
   where conversation_id = p_conversation_id
     and status in ('ringing', 'active')
   limit 1;
  if v_existing.id is not null then return v_existing.id; end if;

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

-- ---------- Answer / decline / end ----------

create or replace function public.answer_call(p_call_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_call call_sessions%rowtype;
begin
  v_uid := public.require_auth();
  select * into v_call from call_sessions where id = p_call_id;
  if v_call.id is null then raise exception 'Call not found'; end if;
  if v_call.callee_id is distinct from v_uid then
    raise exception 'Only the person being called can answer';
  end if;
  if v_call.status <> 'ringing' then
    raise exception 'This call is no longer ringing';
  end if;

  update call_sessions
     set status = 'active', answered_at = now()
   where id = p_call_id;
end $$;

/**
 * Ends or declines. Either party may call it; the resulting status depends
 * on whether the call had been answered, so an unanswered call reads as
 * "declined" rather than a zero-length conversation.
 */
create or replace function public.end_call(p_call_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_call call_sessions%rowtype; v_status call_status;
begin
  v_uid := public.require_auth();
  select * into v_call from call_sessions where id = p_call_id;
  if v_call.id is null then raise exception 'Call not found'; end if;
  if v_uid not in (v_call.caller_id, v_call.callee_id) then
    raise exception 'Not your call';
  end if;
  if v_call.status in ('ended', 'declined', 'missed') then return; end if;

  v_status := case
    when v_call.status = 'active' then 'ended'::call_status
    when v_uid = v_call.callee_id then 'declined'::call_status
    else 'missed'::call_status
  end;

  update call_sessions
     set status = v_status, ended_at = now()
   where id = p_call_id;

  -- Leave a trace in the thread. Written as a normal message so it appears
  -- in history and in the conversation list preview like anything else.
  insert into messages (conversation_id, sender_id, body)
  values (
    v_call.conversation_id,
    v_call.caller_id,
    case v_status
      when 'ended' then
        'Video call ended — ' ||
        greatest(1, extract(epoch from (now() - coalesce(v_call.answered_at, v_call.started_at)))::int / 60)
        || ' min'
      when 'declined' then 'Video call declined'
      else 'Missed video call'
    end
  );
end $$;

-- ---------- Live call for a conversation ----------

create or replace function public.get_active_call(p_conversation_id uuid)
returns setof call_sessions
language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid; v_conv conversations%rowtype;
begin
  v_uid := public.require_auth();

  select * into v_conv from conversations where id = p_conversation_id;
  if v_conv.id is null then return; end if;
  if v_uid not in (v_conv.participant_1, v_conv.participant_2) then
    raise exception 'Not your conversation';
  end if;

  return query
    select c.* from call_sessions c
     where c.conversation_id = p_conversation_id
       and c.status in ('ringing', 'active')
       -- A browser closed mid-call leaves the row 'active' forever, so
       -- anything older than half an hour is treated as dead rather than
       -- showing a phantom call that can never be joined.
       and c.started_at > now() - interval '30 minutes'
     order by c.created_at desc
     limit 1;
end $$;

-- ---------- RLS ----------

alter table public.call_sessions enable row level security;

-- Readable by the two people on the call. Every mutation goes through the
-- definer RPCs above, so there are no insert/update policies.
create policy "call_sessions_read_own" on public.call_sessions for select using (
  caller_id = auth.uid() or callee_id = auth.uid() or public.is_admin()
);

-- Realtime delivers the incoming-call banner; without this the callee has
-- to refresh to notice they're being rung.
alter publication supabase_realtime add table public.call_sessions;

-- ---------- Grants ----------

grant execute on function public.start_call(uuid) to authenticated;
grant execute on function public.answer_call(uuid) to authenticated;
grant execute on function public.end_call(uuid) to authenticated;
grant execute on function public.get_active_call(uuid) to authenticated;

revoke all on function public.start_call(uuid) from anon;
revoke all on function public.answer_call(uuid) from anon;
revoke all on function public.end_call(uuid) from anon;
revoke all on function public.get_active_call(uuid) from anon;

commit;

-- ============================================================
-- VERIFY
--   -- anonymous callers must be rejected, not return data:
--   select public.start_call('00000000-0000-0000-0000-000000000000');
--
--   select id, status, room_name, started_at from public.call_sessions
--    order by created_at desc limit 10;
-- ============================================================
