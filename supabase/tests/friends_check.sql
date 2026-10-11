-- Checks the friends feature from 0005_friends.sql: what friends can and
-- can't see, invite links, limits, blocking, muting and nudges.
-- Everything is rolled back at the end. You should see "FRIENDS CHECKS PASSED".
--
-- Farmers: A (aaaa...), B (bbbb...), C (cccc...), D (dddd...).

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', jsonb_build_object('dob', '1995-04-12', 'display_name', 'Ada')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', jsonb_build_object('dob', '1990-09-30', 'display_name', 'Bea')),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local', jsonb_build_object('dob', '1988-01-20', 'display_name', 'Cy')),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@test.local', jsonb_build_object('dob', '1985-06-02', 'display_name', 'Dee'));

-- Handy way to switch who we're acting as.
create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- 1. Defaults: private, with an invite code from the safe alphabet.
--    Only the four test farmers are looked at here; real accounts may have
--    changed their settings, and that's fine.
do $$
declare r record;
begin
  for r in select p.* from public.profiles p join auth.users u on u.id = p.id
           where u.email in ('a@test.local', 'b@test.local', 'c@test.local', 'd@test.local') loop
    assert r.share_level = 'off', 'FAIL: sharing is not off by default';
    assert r.accept_nudges, 'FAIL: accept_nudges should default to true';
    assert r.timezone = 'UTC', 'FAIL: timezone should default to UTC';
    assert r.friend_code ~ '^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{8}$', 'FAIL: bad friend code ' || r.friend_code;
  end loop;
  -- Across everyone, test farmers and real accounts alike: no two codes the same.
  assert (select count(distinct friend_code) from public.profiles) = (select count(*) from public.profiles),
    'FAIL: friend codes are not unique';
end $$;

-- Bea has some history: a 3-day run that ended a while ago, plus one log today.
-- (logged_at at her local midnight, which is "today" for her wherever UTC is.)
update public.profiles set timezone = 'Pacific/Kiritimati' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
insert into public.poop_logs (user_id, stool_type, color, notes, logged_at) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 4, 'brown', 'secret note',
   date_trunc('day', now() at time zone 'Pacific/Kiritimati') at time zone 'Pacific/Kiritimati'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 6, 'green', null, now() - interval '10 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, 'red',   null, now() - interval '11 days');
insert into public.quiet_days (user_id, day) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', ((now() - interval '12 days') at time zone 'Pacific/Kiritimati')::date);

set local role authenticated;

-- 2. Invite links
select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
declare
  v_a_code text;
begin
  -- A can read only their own profile row, so the codes come from elsewhere.
  assert (select count(*) from public.profiles) = 1, 'FAIL: A can read other profiles';
  select friend_code into v_a_code from public.profiles;

  assert public.send_friend_request('NOTACODE') = 'invalid', 'FAIL: made-up code not refused';
  assert public.send_friend_request('') = 'invalid', 'FAIL: empty code not refused';
  assert public.send_friend_request(null) = 'invalid', 'FAIL: null code not refused';
  assert public.send_friend_request(v_a_code) = 'invalid', 'FAIL: own code accepted (self-request)';

  -- No way to write the tables directly.
  begin
    insert into public.friendships (requester_id, addressee_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    raise exception 'FAIL: direct insert into friendships allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.nudges (sender_id, recipient_id, kind)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hello');
    raise exception 'FAIL: direct insert into nudges allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.blocks (blocker_id, blocked_id)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    raise exception 'FAIL: direct insert into blocks allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set friend_code = 'AAAAAAAA';
    raise exception 'FAIL: friend_code is client-writable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.friend_link_attempts;
    raise exception 'FAIL: link attempts are readable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.best_streak_badge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'UTC');
    raise exception 'FAIL: best_streak_badge is callable by clients';
  exception when insufficient_privilege then null;
  end;

  -- A made-up timezone is refused; a real one is fine.
  begin
    update public.profiles set timezone = 'Mars/Olympus_Mons';
    raise exception 'FAIL: made-up timezone accepted';
  exception when invalid_parameter_value then null;
  end;
  update public.profiles set timezone = 'Europe/London';
end $$;

-- A uses B's link (typed lower-case with a dash: it's tidied up).
reset role;
create temp table codes on commit drop as select id, friend_code from public.profiles;
grant select on codes to authenticated;
set local role authenticated;

select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
declare v_b text := (select friend_code from codes where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
begin
  assert public.send_friend_request(lower(left(v_b, 4)) || '-' || lower(right(v_b, 4))) = 'sent',
    'FAIL: A could not send a request with B''s link';
  assert public.send_friend_request(v_b) = 'invalid', 'FAIL: duplicate request not refused';

  -- Pending is not friends: nothing to see, no nudges.
  assert (select count(*) from public.get_friends_summary()) = 0, 'FAIL: summary shows a pending request';
  assert public.send_nudge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hello') = 'not_friends',
    'FAIL: nudge allowed before the request was accepted';
  assert (select count(*) from public.get_friend_requests() where direction = 'outgoing' and name = 'Bea') = 1,
    'FAIL: A cannot see their outgoing request';
end $$;

-- B: the reverse request can't exist alongside it; using A's link accepts.
select pg_temp.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
do $$
declare
  v_a text := (select friend_code from codes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  v_req uuid;
begin
  select id into v_req from public.get_friend_requests() where direction = 'incoming' and name = 'Ada';
  assert v_req is not null, 'FAIL: B cannot see the incoming request';

  assert public.respond_to_request(v_req, true) = 'accepted', 'FAIL: B could not accept';
  assert public.respond_to_request(v_req, true) = 'unavailable', 'FAIL: accepted twice';
  assert public.send_friend_request(v_a) = 'invalid', 'FAIL: already-friends not refused';
  assert (select count(*) from public.friendships) = 1, 'FAIL: reverse duplicate row exists';
end $$;

-- The table itself refuses a reverse duplicate and a self-row, even for the owner.
reset role;
do $$
begin
  begin
    insert into public.friendships (requester_id, addressee_id)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    raise exception 'FAIL: reverse duplicate friendship accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.friendships (requester_id, addressee_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    raise exception 'FAIL: self-friendship accepted';
  exception when check_violation then null;
  end;
end $$;
set local role authenticated;

-- 3. What A can see of B at each sharing level
select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
declare r record;
begin
  assert (select count(*) from public.poop_logs) = 0, 'FAIL: A can read a friend''s logs';
  assert (select count(*) from public.quiet_days) = 0, 'FAIL: A can read a friend''s quiet days';
  assert (select count(*) from public.profiles) = 1, 'FAIL: A can read a friend''s profile';

  -- B is 'off': a name and nothing else.
  select * into r from public.get_friends_summary();
  assert r.name = 'Bea' and r.share_level = 'off', 'FAIL: summary row missing for B';
  assert r.logged_today is null and r.today_count is null and r.week_counts is null and r.best_badge is null,
    'FAIL: something leaked at share_level off';
end $$;

reset role;
update public.profiles set share_level = 'active' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
set local role authenticated;
select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
declare
  r record;
  cols text[];
begin
  select * into r from public.get_friends_summary();
  assert r.logged_today is true, 'FAIL: logged_today should be true (in B''s own timezone)';
  assert r.today_count is null and r.week_counts is null, 'FAIL: counts leaked at share_level active';
  -- Quiet day + two logs, three days running, some time ago.
  assert r.best_badge = 'streak-3', 'FAIL: best badge should be streak-3, got ' || coalesce(r.best_badge, 'null');

  -- The summary has exactly these columns and no others.
  select array_agg(key order by key) into cols from jsonb_object_keys(to_jsonb(r)) as key;
  assert cols = array['best_badge', 'friend_id', 'logged_today', 'name', 'share_level', 'today_count', 'week_counts'],
    'FAIL: unexpected summary columns ' || cols::text;
end $$;

reset role;
update public.profiles set share_level = 'counts' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
set local role authenticated;
select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
declare r record;
begin
  select * into r from public.get_friends_summary();
  assert r.today_count = 1, 'FAIL: today_count should be 1';
  assert cardinality(r.week_counts) = 7, 'FAIL: week_counts should have 7 days';
  assert r.week_counts[7] = 1, 'FAIL: today should be the last of the 7 days';
  assert (select sum(x) from unnest(r.week_counts) x) = 1, 'FAIL: week_counts counted old logs';
end $$;

-- C and D aren't friends with anyone: they see nothing of B.
select pg_temp.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
do $$
begin
  assert (select count(*) from public.get_friends_summary()) = 0, 'FAIL: summary includes non-friends';
  assert (select count(*) from public.friendships) = 0, 'FAIL: C can read other people''s friendships';
  assert (select count(*) from public.get_friend_requests()) = 0, 'FAIL: C can see other people''s requests';
end $$;

-- 4. Nudges: limits, and silent drops
select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
begin
  begin
    perform public.send_nudge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'u r gross');
    raise exception 'FAIL: free-text nudge accepted';
  exception when invalid_parameter_value then null;
  end;
  assert public.send_nudge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hello') = 'sent', 'FAIL: A could not nudge B';
  assert public.send_nudge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'water') = 'too_soon', 'FAIL: 24h nudge limit not enforced';
  assert public.send_nudge('cccccccc-cccc-cccc-cccc-cccccccccccc', 'hello') = 'not_friends', 'FAIL: nudged a non-friend';
  -- The sender can't read what they sent, so can't see whether it landed.
  assert (select count(*) from public.nudges) = 0, 'FAIL: sender can read nudges';
end $$;

select pg_temp.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
do $$
declare v_id uuid;
begin
  assert (select count(*) from public.get_my_nudges()) = 1, 'FAIL: B did not get the nudge';
  select id into v_id from public.get_my_nudges() where sender_name = 'Ada' and kind = 'hello';
  assert v_id is not null, 'FAIL: nudge has the wrong sender or kind';
  perform public.dismiss_nudge(v_id);
  assert (select count(*) from public.get_my_nudges()) = 0, 'FAIL: dismissed nudge still showing';

  -- B mutes A. A isn't told.
  assert public.mute_friend('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true), 'FAIL: B could not mute A';
  assert public.send_nudge('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'proud') = 'sent', 'FAIL: B could not nudge A';
end $$;

-- A day later A nudges again. B has A muted: A still gets 'sent', B gets nothing,
-- and A's 24h limit applies exactly as if it had landed.
reset role;
update public.nudges set created_at = created_at - interval '25 hours'
where sender_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;

select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
begin
  assert public.send_nudge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'thirsty') = 'sent', 'FAIL: muted nudge did not report sent';
  assert public.send_nudge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'thirsty') = 'too_soon',
    'FAIL: a dropped nudge did not count toward the 24h limit';
  assert (select count(*) from public.get_my_nudges()) = 1, 'FAIL: A did not get B''s nudge';
end $$;

select pg_temp.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
do $$
begin
  assert (select count(*) from public.get_my_nudges()) = 0, 'FAIL: muted nudge was delivered';
  assert (select count(*) from public.nudges where kind = 'thirsty') = 0, 'FAIL: B can read a dropped nudge directly';
  -- Unmute, and turn nudges off altogether instead.
  perform public.mute_friend('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  update public.profiles set accept_nudges = false;
end $$;

reset role;
do $$
begin
  assert (select count(*) from public.nudges
          where sender_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and not delivered) = 1,
    'FAIL: dropped nudge was not stored as undelivered';
end $$;
update public.nudges set created_at = created_at - interval '25 hours'
where sender_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;

select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
begin
  assert public.send_nudge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stretch') = 'sent', 'FAIL: nudges-off did not report sent';
end $$;
select pg_temp.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
do $$
begin
  assert (select count(*) from public.get_my_nudges()) = 0, 'FAIL: nudge delivered with accept_nudges off';
  update public.profiles set accept_nudges = true;
end $$;

-- Nudges older than 48 hours stop showing.
reset role;
update public.nudges set created_at = now() - interval '49 hours'
where recipient_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
begin
  assert (select count(*) from public.get_my_nudges()) = 0, 'FAIL: 49-hour-old nudge still showing';
end $$;

-- 10 nudges per sender per day. D gets 11 friends and tries to nudge them all.
reset role;
insert into auth.users (id, email, raw_user_meta_data)
select gen_random_uuid(), 'n' || g || '@test.local', jsonb_build_object('dob', '1990-01-01', 'display_name', 'N' || g)
from generate_series(1, 11) g;
insert into public.friendships (requester_id, addressee_id, status)
select 'dddddddd-dddd-dddd-dddd-dddddddddddd', u.id, 'accepted' from auth.users u where u.email like 'n%@test.local';
create temp table nudge_targets on commit drop as
  select id, row_number() over (order by email) as n from auth.users where email like 'n%@test.local';
grant select on nudge_targets to authenticated;
set local role authenticated;

select pg_temp.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
do $$
declare r record;
begin
  for r in select id, n from nudge_targets order by n loop
    if r.n <= 10 then
      assert public.send_nudge(r.id, 'hello') = 'sent', 'FAIL: nudge ' || r.n || ' of 10 refused';
    else
      assert public.send_nudge(r.id, 'hello') = 'daily_limit', 'FAIL: 11th nudge of the day allowed';
    end if;
  end loop;
end $$;

-- 5. Blocking
-- C blocks A. A's requests to C fail with the same answer as a bad code,
-- and A can't tell they were blocked.
select pg_temp.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
do $$
begin
  assert public.block_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'FAIL: C could not block A';
  assert (select count(*) from public.get_blocked_users() where name = 'Ada') = 1, 'FAIL: C cannot see their block list';
end $$;

select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
declare v_c text := (select friend_code from codes where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc');
begin
  assert public.send_friend_request(v_c) = 'invalid', 'FAIL: blocked user could send a request';
  assert (select count(*) from public.blocks) = 0, 'FAIL: A can see that C blocked them';
end $$;

-- B blocks A while they are friends: the friendship ends and nudges stop.
select pg_temp.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
do $$
begin
  perform public.block_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  assert (select count(*) from public.friendships) = 0, 'FAIL: blocking did not end the friendship';
end $$;

select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
declare v_b text := (select friend_code from codes where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
begin
  assert (select count(*) from public.get_friends_summary()) = 0, 'FAIL: blocked user still sees the summary';
  assert public.send_nudge('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hello') = 'not_friends', 'FAIL: blocked user could nudge';
  assert public.send_friend_request(v_b) = 'invalid', 'FAIL: blocked user could re-request';
end $$;

-- Unblocking lets a request through again.
select pg_temp.act_as('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select public.unblock_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.act_as('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$
declare v_b text := (select friend_code from codes where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
begin
  assert public.send_friend_request(v_b) = 'sent', 'FAIL: request refused after unblocking';
end $$;

-- 6. Regenerating the code kills the old link
select pg_temp.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
do $$
declare
  v_old text := (select friend_code from codes where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd');
  v_new text;
begin
  v_new := public.regenerate_friend_code();
  assert v_new <> v_old and v_new ~ '^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{8}$', 'FAIL: code was not regenerated';
  assert (select friend_code from public.profiles) = v_new, 'FAIL: new code not saved';
  -- Remembered for the next steps (settings last until the rollback).
  perform set_config('stardrop.d_old', v_old, true);
  perform set_config('stardrop.d_new', v_new, true);
end $$;

select pg_temp.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
do $$
begin
  assert public.send_friend_request(current_setting('stardrop.d_old')) = 'invalid', 'FAIL: old code still works';
  assert public.send_friend_request(current_setting('stardrop.d_new')) = 'sent', 'FAIL: new code does not work';
  -- C changes their mind and takes it back.
  assert public.remove_friend('dddddddd-dddd-dddd-dddd-dddddddddddd'), 'FAIL: could not cancel a request';
  assert (select count(*) from public.friendships) = 0, 'FAIL: cancelled request still there';
end $$;

-- 7. Caps
-- 20 link uses a day, and failed ones count. C has used 2 so far.
do $$
declare i int;
begin
  for i in 3..20 loop
    assert public.send_friend_request('WRONG' || i) = 'invalid', 'FAIL: bad code not refused on try ' || i;
  end loop;
  assert public.send_friend_request('WRONG21') = 'daily_limit', 'FAIL: failed tries did not count toward the daily cap';
  assert public.send_friend_request(current_setting('stardrop.d_new')) = 'daily_limit', 'FAIL: daily cap not enforced for a good code';
end $$;

-- 50 friends. Give C 50, then try one more each way.
reset role;
delete from public.friend_link_attempts
where user_id in ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
insert into auth.users (id, email, raw_user_meta_data)
select gen_random_uuid(), 'f' || g || '@test.local', jsonb_build_object('dob', '1990-01-01', 'display_name', 'F' || g)
from generate_series(1, 50) g;
insert into public.friendships (requester_id, addressee_id, status)
select 'cccccccc-cccc-cccc-cccc-cccccccccccc', u.id, 'accepted' from auth.users u where u.email like 'f%@test.local';
set local role authenticated;

select pg_temp.act_as('cccccccc-cccc-cccc-cccc-cccccccccccc');
do $$
begin
  assert (select count(*) from public.get_friends_summary()) = 50, 'FAIL: C should have 50 friends';
  assert public.send_friend_request(current_setting('stardrop.d_new')) = 'friend_limit', 'FAIL: 51st friend request allowed';
  -- Listed by name, not by anything you could rank on.
  assert (select array_agg(name) from public.get_friends_summary())
       = (select array_agg(name order by lower(name)) from public.get_friends_summary()),
    'FAIL: friends are not in alphabetical order';
end $$;

-- Someone else asking C gets the generic answer, not "they're full".
select pg_temp.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
do $$
declare v_c text := (select friend_code from codes where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc');
begin
  assert public.send_friend_request(v_c) = 'invalid', 'FAIL: request to a full friend list was not generic';
end $$;

-- 10 pending outgoing requests.
reset role;
insert into auth.users (id, email, raw_user_meta_data)
select gen_random_uuid(), 'p' || g || '@test.local', jsonb_build_object('dob', '1990-01-01', 'display_name', 'P' || g)
from generate_series(1, 11) g;
create temp table pending_codes on commit drop as
  select p.friend_code, row_number() over (order by u.email) as n
  from auth.users u join public.profiles p on p.id = u.id where u.email like 'p%@test.local';
grant select on pending_codes to authenticated;
delete from public.friend_link_attempts
where user_id in ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
set local role authenticated;

select pg_temp.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
do $$
declare r record;
begin
  for r in select friend_code, n from pending_codes order by n loop
    if r.n <= 10 then
      assert public.send_friend_request(r.friend_code) = 'sent', 'FAIL: pending request ' || r.n || ' refused';
    else
      assert public.send_friend_request(r.friend_code) = 'pending_limit', 'FAIL: 11th pending request allowed';
    end if;
  end loop;
end $$;

-- 8. Logged-out visitors get nothing
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform 1 from public.friendships;
    raise exception 'FAIL: anon can query friendships';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.nudges;
    raise exception 'FAIL: anon can query nudges';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_friends_summary();
    raise exception 'FAIL: anon can call get_friends_summary';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.send_friend_request('ABCDEFGH');
    raise exception 'FAIL: anon can call send_friend_request';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 9. Deleting an account removes every trace of it
reset role;
set local role authenticated;
select pg_temp.act_as('dddddddd-dddd-dddd-dddd-dddddddddddd');
select public.block_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select public.delete_my_account();

reset role;
do $$
declare v_d uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
begin
  assert not exists (select 1 from public.profiles where id = v_d), 'FAIL: profile survived account deletion';
  assert not exists (select 1 from public.friendships where v_d in (requester_id, addressee_id)), 'FAIL: friendships survived';
  assert not exists (select 1 from public.nudges where v_d in (sender_id, recipient_id)), 'FAIL: nudges survived';
  assert not exists (select 1 from public.blocks where v_d in (blocker_id, blocked_id)), 'FAIL: blocks survived';
  assert not exists (select 1 from public.friend_mutes where v_d in (user_id, muted_user_id)), 'FAIL: mutes survived';
  assert not exists (select 1 from public.friend_link_attempts where user_id = v_d), 'FAIL: link attempts survived';
end $$;

select 'FRIENDS CHECKS PASSED' as result;

rollback;
