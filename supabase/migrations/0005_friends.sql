-- Friends: opt-in, private by default, and nothing about what was logged.
--
-- What a friend can ever see is decided by one function, get_friends_summary():
--   share_level 'off'    -> just my name (the default)
--   share_level 'active' -> whether I logged today, and my best streak badge
--   share_level 'counts' -> also how many logs today and on each of the last 7 days
-- Never: stool type, colour, habits, notes, times, quiet days, birthday,
-- gender or email. Friends get no access to poop_logs, quiet_days or profiles.
--
-- How it's locked down:
--   - RLS is enabled and forced on every new table.
--   - Signed-in users get no INSERT / UPDATE / DELETE on any of them. Every
--     change goes through a function below, which checks who is calling and
--     enforces the limits.
--   - Those functions are SECURITY DEFINER with an empty search_path, and are
--     only executable by signed-in users.
--   - Every row hangs off profiles with ON DELETE CASCADE, so deleting an
--     account (delete_my_account) removes all of it.
--
-- Friends are added by invite link only. The link carries profiles.friend_code;
-- there is no search by name or email.
--
-- Run after 0001-0004, then try supabase/tests/friends_check.sql.
-- Safe to run more than once.

-- 1. PROFILES: sharing choices, invite code, timezone

alter table public.profiles
  add column if not exists share_level   text    not null default 'off',
  add column if not exists accept_nudges boolean not null default true,
  -- Has this person been shown the "what friends can see" explainer yet?
  add column if not exists sharing_seen  boolean not null default false,
  -- IANA name, e.g. 'Europe/London'. "Logged today" for a friend has to mean
  -- THEIR today, not the viewer's.
  add column if not exists timezone      text    not null default 'UTC',
  add column if not exists friend_code   text;

alter table public.profiles drop constraint if exists profiles_share_level_check;
alter table public.profiles
  add constraint profiles_share_level_check check (share_level in ('off', 'active', 'counts'));

comment on column public.profiles.share_level is 'What friends may see: off | active | counts. Off by default.';
comment on column public.profiles.friend_code is 'Token inside the invite link. Not client-writable; see regenerate_friend_code().';

-- 8 characters from an alphabet with no look-alikes (no 0 O 1 I L U).
-- gen_random_uuid() is the source of randomness; bytes 6 and 8 of a v4 uuid
-- aren't fully random, so they're skipped.
create or replace function public.new_friend_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  c_alphabet constant text := 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
  c_bytes    constant int[] := array[0, 1, 2, 3, 4, 5, 10, 11];
  v_raw  bytea;
  v_code text;
  i      int;
begin
  loop
    v_raw := uuid_send(gen_random_uuid());
    v_code := '';
    foreach i in array c_bytes loop
      v_code := v_code || substr(c_alphabet, (get_byte(v_raw, i) % 30) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = v_code);
  end loop;
  return v_code;
end;
$$;

update public.profiles set friend_code = public.new_friend_code() where friend_code is null;

alter table public.profiles alter column friend_code set default public.new_friend_code();
alter table public.profiles alter column friend_code set not null;
create unique index if not exists profiles_friend_code_key on public.profiles (friend_code);

-- Only real timezone names are accepted.
create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'unknown timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_validate_timezone on public.profiles;
create trigger profiles_validate_timezone
  before update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();

-- Users may change their sharing choices and timezone. Still not: id, dob,
-- friend_code or the timestamps.
grant update (share_level, accept_nudges, sharing_seen, timezone) on public.profiles to authenticated;

-- 2. TABLES

create table if not exists public.friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  addressee_id  uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

comment on table public.friendships is 'Friend requests and friendships. Changed only through functions.';

-- One row per pair, whichever way round: A->B and B->A can't both exist.
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create table if not exists public.friend_mutes (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  muted_user_id  uuid not null references public.profiles (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, muted_user_id)
);

create table if not exists public.nudges (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  -- Presets only, no free text. Keep in step with src/lib/nudges.ts.
  kind          text not null
                check (kind in ('hello', 'thirsty', 'water', 'stretch', 'proud', 'thinking')),
  -- False when the recipient has nudges off or has muted the sender. The row
  -- is kept anyway so the sender's limits work the same either way, and the
  -- sender can't tell the difference.
  delivered     boolean not null default true,
  created_at    timestamptz not null default now(),
  seen_at       timestamptz
);

create index if not exists nudges_recipient_idx on public.nudges (recipient_id, created_at desc);
create index if not exists nudges_sender_idx    on public.nudges (sender_id, created_at desc);

-- Every use of an invite link, good or bad, so guessing codes hits the same
-- daily limit as sending real requests.
create table if not exists public.friend_link_attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists friend_link_attempts_user_idx on public.friend_link_attempts (user_id, created_at desc);

-- 3. PRIVILEGES + ROW LEVEL SECURITY
--    Read your own rows; write nothing directly.

revoke all on public.friendships          from anon, authenticated;
revoke all on public.blocks               from anon, authenticated;
revoke all on public.friend_mutes         from anon, authenticated;
revoke all on public.nudges               from anon, authenticated;
revoke all on public.friend_link_attempts from anon, authenticated;

grant select on public.friendships  to authenticated;
grant select on public.blocks       to authenticated;
grant select on public.friend_mutes to authenticated;
-- Not the `delivered` column: nobody reads that from outside.
grant select (id, sender_id, recipient_id, kind, created_at, seen_at) on public.nudges to authenticated;

alter table public.friendships          enable row level security;
alter table public.friendships          force  row level security;
alter table public.blocks               enable row level security;
alter table public.blocks               force  row level security;
alter table public.friend_mutes         enable row level security;
alter table public.friend_mutes         force  row level security;
alter table public.nudges               enable row level security;
alter table public.nudges               force  row level security;
alter table public.friend_link_attempts enable row level security;
alter table public.friend_link_attempts force  row level security;

drop policy if exists "friendships: read own" on public.friendships;
create policy "friendships: read own"
  on public.friendships for select
  to authenticated
  using ( (select auth.uid()) in (requester_id, addressee_id) );

drop policy if exists "blocks: read own" on public.blocks;
create policy "blocks: read own"
  on public.blocks for select
  to authenticated
  using ( (select auth.uid()) = blocker_id );

drop policy if exists "mutes: read own" on public.friend_mutes;
create policy "mutes: read own"
  on public.friend_mutes for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- Only nudges sent TO me, and only ones that were actually delivered.
drop policy if exists "nudges: read delivered to me" on public.nudges;
create policy "nudges: read delivered to me"
  on public.nudges for select
  to authenticated
  using ( (select auth.uid()) = recipient_id and delivered );

-- friend_link_attempts: no policy at all, so no client can read it.

-- 4. INTERNAL HELPERS (not callable by clients)

create or replace function public.friend_count(p_user uuid)
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int
  from public.friendships
  where status = 'accepted' and p_user in (requester_id, addressee_id)
$$;

create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  )
$$;

-- The highest streak badge someone has ever earned, as a badge id, or null.
-- Same rule as src/lib/checkin.ts: a day counts if it has a log or a quiet
-- day, and days are that person's own calendar days. The thresholds mirror
-- MILESTONES in src/lib/streak.ts; change them together.
create or replace function public.best_streak_badge(p_user uuid, p_tz text)
returns text
language sql
stable
set search_path = ''
as $$
  with days as (
    select (l.logged_at at time zone p_tz)::date as d
    from public.poop_logs l
    where l.user_id = p_user
    union
    select q.day from public.quiet_days q where q.user_id = p_user
  ),
  -- Days in a row share the same (day - position) value.
  runs as (
    select d - (row_number() over (order by d))::int as grp
    from days
    where d <= (now() at time zone p_tz)::date
  ),
  best as (
    select coalesce(max(n), 0) as n from (select count(*) as n from runs group by grp) r
  )
  select case
    when n >= 365 then 'streak-365'
    when n >= 200 then 'streak-200'
    when n >= 100 then 'streak-100'
    when n >= 60  then 'streak-60'
    when n >= 30  then 'streak-30'
    when n >= 14  then 'streak-14'
    when n >= 7   then 'streak-7'
    when n >= 3   then 'streak-3'
    else null
  end
  from best
$$;

-- 5. FRIEND REQUESTS

-- Use an invite link. Returns one of:
--   'sent'           request created
--   'accepted'       they had already asked me, so we're friends now
--   'invalid'        ONE answer for: no such code, my own code, already
--                    friends, already asked, blocked either way, or their
--                    friend list is full. Never says which.
--   'daily_limit'    20 link uses in the last 24 hours (about me, not the code)
--   'friend_limit'   I already have 50 friends
--   'pending_limit'  I already have 10 requests waiting
create or replace function public.send_friend_request(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me       uuid := auth.uid();
  v_code     text;
  v_them     uuid;
  v_existing public.friendships%rowtype;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- One at a time per user, so two quick taps can't slip past the limits.
  perform pg_advisory_xact_lock(hashtextextended(v_me::text, 0));

  delete from public.friend_link_attempts
  where user_id = v_me and created_at < now() - interval '2 days';

  if (select count(*) from public.friend_link_attempts
      where user_id = v_me and created_at > now() - interval '24 hours') >= 20 then
    return 'daily_limit';
  end if;
  insert into public.friend_link_attempts (user_id) values (v_me);

  if public.friend_count(v_me) >= 50 then
    return 'friend_limit';
  end if;

  -- Same tidy-up as normaliseFriendCode() in src/lib/friend-link.ts.
  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  select id into v_them from public.profiles where friend_code = v_code;

  if v_them is null or v_them = v_me or public.is_blocked_between(v_me, v_them) then
    return 'invalid';
  end if;

  select * into v_existing
  from public.friendships
  where least(requester_id, addressee_id) = least(v_me, v_them)
    and greatest(requester_id, addressee_id) = greatest(v_me, v_them);

  if found then
    -- They asked first: using their link is a yes.
    if v_existing.status = 'pending' and v_existing.addressee_id = v_me
       and public.friend_count(v_them) < 50 then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where id = v_existing.id;
      return 'accepted';
    end if;
    return 'invalid';
  end if;

  if public.friend_count(v_them) >= 50 then
    return 'invalid';
  end if;

  if (select count(*) from public.friendships
      where requester_id = v_me and status = 'pending') >= 10 then
    return 'pending_limit';
  end if;

  begin
    insert into public.friendships (requester_id, addressee_id) values (v_me, v_them);
  exception when unique_violation then
    return 'invalid';
  end;
  return 'sent';
end;
$$;

-- Answer a request sent to me. Returns 'accepted', 'declined',
-- 'friend_limit' (I have 50 already) or 'unavailable' (not mine, not
-- pending, or the other person can't take more friends).
create or replace function public.respond_to_request(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me  uuid := auth.uid();
  v_row public.friendships%rowtype;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_me::text, 0));

  select * into v_row
  from public.friendships
  where id = p_id and addressee_id = v_me and status = 'pending';
  if not found then
    return 'unavailable';
  end if;

  if not coalesce(p_accept, false) then
    delete from public.friendships where id = v_row.id;
    return 'declined';
  end if;

  if public.friend_count(v_me) >= 50 then
    return 'friend_limit';
  end if;
  if public.friend_count(v_row.requester_id) >= 50 then
    return 'unavailable';
  end if;

  update public.friendships
  set status = 'accepted', responded_at = now()
  where id = v_row.id;
  return 'accepted';
end;
$$;

-- Unfriend, or take back a request I sent, or turn down one sent to me.
create or replace function public.remove_friend(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  n    int;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  delete from public.friendships
  where least(requester_id, addressee_id) = least(v_me, p_user)
    and greatest(requester_id, addressee_id) = greatest(v_me, p_user);
  get diagnostics n = row_count;

  delete from public.friend_mutes
  where (user_id = v_me and muted_user_id = p_user) or (user_id = p_user and muted_user_id = v_me);
  return n > 0;
end;
$$;

-- 6. BLOCK / MUTE

-- Block someone: ends the friendship and any request, and stops their links
-- and nudges reaching me. Always answers the same, whoever p_user is.
create or replace function public.block_user(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_user is not null and p_user <> v_me
     and exists (select 1 from public.profiles where id = p_user) then
    insert into public.blocks (blocker_id, blocked_id)
    values (v_me, p_user)
    on conflict do nothing;

    delete from public.friendships
    where least(requester_id, addressee_id) = least(v_me, p_user)
      and greatest(requester_id, addressee_id) = greatest(v_me, p_user);
    delete from public.friend_mutes
    where (user_id = v_me and muted_user_id = p_user) or (user_id = p_user and muted_user_id = v_me);
    -- Anything they sent me that I hadn't seen goes too.
    delete from public.nudges where sender_id = p_user and recipient_id = v_me;
  end if;
  return true;
end;
$$;

create or replace function public.unblock_user(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from public.blocks where blocker_id = v_me and blocked_id = p_user;
  return true;
end;
$$;

-- Mute or unmute a friend's nudges. They aren't told.
create or replace function public.mute_friend(p_user uuid, p_muted boolean default true)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not coalesce(p_muted, true) then
    delete from public.friend_mutes where user_id = v_me and muted_user_id = p_user;
    return true;
  end if;

  if not exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(v_me, p_user)
      and greatest(requester_id, addressee_id) = greatest(v_me, p_user)
  ) then
    return false;
  end if;

  insert into public.friend_mutes (user_id, muted_user_id)
  values (v_me, p_user)
  on conflict do nothing;
  return true;
end;
$$;

-- 7. NUDGES

-- Send a preset nudge to a friend. Returns:
--   'sent'         also when it was quietly dropped (nudges off, or muted)
--   'too_soon'     I already nudged this friend in the last 24 hours
--   'daily_limit'  I've sent 10 in the last 24 hours
--   'not_friends'  not an accepted friend (this covers blocked too)
create or replace function public.send_nudge(p_user uuid, p_kind text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me        uuid := auth.uid();
  v_delivered boolean;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('hello', 'thirsty', 'water', 'stretch', 'proud', 'thinking') then
    raise exception 'unknown nudge' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_me::text, 0));

  if p_user is null or public.is_blocked_between(v_me, p_user) or not exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(v_me, p_user)
      and greatest(requester_id, addressee_id) = greatest(v_me, p_user)
  ) then
    return 'not_friends';
  end if;

  -- Old ones aren't needed for the limits any more.
  delete from public.nudges where sender_id = v_me and created_at < now() - interval '7 days';

  -- Dropped nudges count here too, on purpose.
  if exists (select 1 from public.nudges
             where sender_id = v_me and recipient_id = p_user
               and created_at > now() - interval '24 hours') then
    return 'too_soon';
  end if;
  if (select count(*) from public.nudges
      where sender_id = v_me and created_at > now() - interval '24 hours') >= 10 then
    return 'daily_limit';
  end if;

  select p.accept_nudges
         and not exists (select 1 from public.friend_mutes m
                         where m.user_id = p_user and m.muted_user_id = v_me)
  into v_delivered
  from public.profiles p
  where p.id = p_user;

  insert into public.nudges (sender_id, recipient_id, kind, delivered)
  values (v_me, p_user, p_kind, coalesce(v_delivered, false));
  return 'sent';
end;
$$;

create or replace function public.dismiss_nudge(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  update public.nudges
  set seen_at = now()
  where id = p_id and recipient_id = v_me and seen_at is null;
  return true;
end;
$$;

-- Nudges waiting for me: delivered, not dismissed, under 48 hours old.
create or replace function public.get_my_nudges()
returns table (id uuid, kind text, sender_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.kind, p.display_name, n.created_at
  from public.nudges n
  join public.profiles p on p.id = n.sender_id
  where n.recipient_id = auth.uid()
    and n.delivered
    and n.seen_at is null
    and n.created_at > now() - interval '48 hours'
  order by n.created_at
$$;

-- 8. INVITE CODE

-- Swap my invite code for a new one. Old links stop working at once.
create or replace function public.regenerate_friend_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me   uuid := auth.uid();
  v_code text;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  update public.profiles
  set friend_code = public.new_friend_code()
  where id = v_me
  returning friend_code into v_code;
  return v_code;
end;
$$;

-- 9. WHAT FRIENDS SEE
--    The only place another person's data leaves the database. Listed by
--    name: there is deliberately nothing here to rank or sort people by.

create or replace function public.get_friends_summary()
returns table (
  friend_id     uuid,
  name          text,
  share_level   text,
  logged_today  boolean,   -- null when share_level = 'off'
  today_count   int,       -- null unless share_level = 'counts'
  week_counts   int[],     -- 7 days, oldest first, today last; null unless 'counts'
  best_badge    text       -- badge id; null when share_level = 'off' or none earned
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    p.share_level,
    case when p.share_level = 'off' then null
         else exists (
           select 1 from public.poop_logs l
           where l.user_id = p.id
             and (l.logged_at at time zone p.timezone)::date = t.today
         )
    end,
    case when p.share_level = 'counts' then (
           select count(*)::int from public.poop_logs l
           where l.user_id = p.id
             and (l.logged_at at time zone p.timezone)::date = t.today
         )
    end,
    case when p.share_level = 'counts' then (
           select array_agg(c.n order by c.back desc)
           from (
             select g.back,
                    (select count(*)::int from public.poop_logs l
                     where l.user_id = p.id
                       and (l.logged_at at time zone p.timezone)::date = t.today - g.back) as n
             from generate_series(0, 6) as g(back)
           ) c
         )
    end,
    case when p.share_level = 'off' then null
         else public.best_streak_badge(p.id, p.timezone)
    end
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  cross join lateral (select (now() at time zone p.timezone)::date as today) t
  where f.status = 'accepted'
    and auth.uid() in (f.requester_id, f.addressee_id)
  order by lower(p.display_name), p.id
$$;

-- Requests waiting, both directions, with the other person's name.
create or replace function public.get_friend_requests()
returns table (id uuid, direction text, user_id uuid, name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    case when f.addressee_id = auth.uid() then 'incoming' else 'outgoing' end,
    p.id,
    p.display_name,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.status = 'pending'
    and auth.uid() in (f.requester_id, f.addressee_id)
  order by lower(p.display_name), p.id
$$;

-- People I've blocked, so I can undo it.
create or replace function public.get_blocked_users()
returns table (user_id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by lower(p.display_name), p.id
$$;

-- 10. FUNCTION EXECUTE PRIVILEGES
--     Helpers and triggers: nobody. Everything else: signed-in users only.

revoke execute on function public.new_friend_code()               from public, anon, authenticated;
revoke execute on function public.validate_profile_timezone()     from public, anon, authenticated;
revoke execute on function public.friend_count(uuid)              from public, anon, authenticated;
revoke execute on function public.is_blocked_between(uuid, uuid)  from public, anon, authenticated;
revoke execute on function public.best_streak_badge(uuid, text)   from public, anon, authenticated;

revoke execute on function public.send_friend_request(text)       from public, anon;
revoke execute on function public.respond_to_request(uuid, boolean) from public, anon;
revoke execute on function public.remove_friend(uuid)             from public, anon;
revoke execute on function public.block_user(uuid)                from public, anon;
revoke execute on function public.unblock_user(uuid)              from public, anon;
revoke execute on function public.mute_friend(uuid, boolean)      from public, anon;
revoke execute on function public.send_nudge(uuid, text)          from public, anon;
revoke execute on function public.dismiss_nudge(uuid)             from public, anon;
revoke execute on function public.get_my_nudges()                 from public, anon;
revoke execute on function public.regenerate_friend_code()        from public, anon;
revoke execute on function public.get_friends_summary()           from public, anon;
revoke execute on function public.get_friend_requests()           from public, anon;
revoke execute on function public.get_blocked_users()             from public, anon;

grant execute on function public.send_friend_request(text)        to authenticated;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid)              to authenticated;
grant execute on function public.block_user(uuid)                 to authenticated;
grant execute on function public.unblock_user(uuid)               to authenticated;
grant execute on function public.mute_friend(uuid, boolean)       to authenticated;
grant execute on function public.send_nudge(uuid, text)           to authenticated;
grant execute on function public.dismiss_nudge(uuid)              to authenticated;
grant execute on function public.get_my_nudges()                  to authenticated;
grant execute on function public.regenerate_friend_code()         to authenticated;
grant execute on function public.get_friends_summary()            to authenticated;
grant execute on function public.get_friend_requests()            to authenticated;
grant execute on function public.get_blocked_users()              to authenticated;

-- Done. Next: run supabase/tests/friends_check.sql.
