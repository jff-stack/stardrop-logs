-- Tries to get at other people's data every way there is, and expects to fail.
--
--   Ada (A) and Bea (B) are friends.
--   Bea (B) and Cy (C) are friends.     -> Cy is a FRIEND OF A FRIEND to Ada.
--   Dee (D) has asked Bea to be friends. -> Dee is a STRANGER to Ada.
--
-- Everyone shares as much as the app allows ('counts'), has an avatar, logs,
-- a quiet day and nudges flying about. Then, acting as Ada, this checks she
-- can see Bea's shared summary and nothing at all about Cy or Dee, and can't
-- change anything that isn't hers. Then the same as a logged-out visitor.
--
-- It finishes with checks on the database's own settings: every table locked,
-- nothing open to logged-out visitors, and so on. Those catch a mistake in a
-- future migration even if nobody thinks to test for it.
--
-- Last, it deletes an account the way the app does and checks that nothing
-- of that person is left in any table.
--
-- Everything is rolled back at the end. You should see "ISOLATION CHECKS PASSED".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', jsonb_build_object('dob', '1995-04-12', 'display_name', 'Ada')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', jsonb_build_object('dob', '1990-09-30', 'display_name', 'Bea')),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local', jsonb_build_object('dob', '1988-01-20', 'display_name', 'Cy')),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'd@test.local', jsonb_build_object('dob', '1985-06-02', 'display_name', 'Dee'));

create temp table t_ids on commit drop as
  select u.id, left(u.email, 1) as who from auth.users u
  where u.email in ('a@test.local', 'b@test.local', 'c@test.local', 'd@test.local');
grant select on t_ids to authenticated, anon;

-- Everyone shares the most they can, and has data worth stealing.
update public.profiles
set share_level = 'counts',
    avatar = '{"v":1,"skin":"skin_3","hair":"hair_short","hairColor":"hc_5","outfit":"outfit_hoodie","outfitColor":"oc_2","eyes":"eyes_happy","accessory":"acc_none","bg":"bg_4"}'
where id in (select id from t_ids);

insert into public.poop_logs (user_id, stool_type, color, notes)
select id, 4, 'brown', 'private note of ' || who from t_ids;
insert into public.quiet_days (user_id, day)
select id, current_date - 1 from t_ids;

insert into public.friendships (requester_id, addressee_id, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'accepted'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'accepted'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pending');
insert into public.nudges (sender_id, recipient_id, kind) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hello');
insert into public.friend_mutes (user_id, muted_user_id) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
insert into public.blocks (blocker_id, blocked_id) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- Ids Ada shouldn't know, handed to her anyway to see if knowing them helps.
select set_config('stardrop.req_d_to_b',
  (select id::text from public.friendships where requester_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), true);
select set_config('stardrop.nudge_c_to_b',
  (select id::text from public.nudges where sender_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), true);
select set_config('stardrop.c_code',
  (select friend_code from public.profiles where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), true);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

-- 1. What Ada can READ
do $$
declare
  c_a constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  c_b constant uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  c_c constant uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  c_d constant uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_all text;
begin
  -- Tables: only her own rows, even when asking for someone else's by id.
  assert (select array_agg(id) from public.profiles) = array[c_a], 'FAIL: Ada can read other profiles';
  assert (select count(*) from public.profiles where id in (c_b, c_c, c_d)) = 0, 'FAIL: Ada can read a profile by id';
  assert (select count(*) from public.poop_logs where user_id <> c_a) = 0, 'FAIL: Ada can read other people''s logs';
  assert (select count(*) from public.poop_logs) = 1, 'FAIL: Ada should see exactly her own log';
  assert (select count(*) from public.quiet_days where user_id <> c_a) = 0, 'FAIL: Ada can read other people''s quiet days';
  assert (select count(*) from public.friendships where c_a not in (requester_id, addressee_id)) = 0,
    'FAIL: Ada can see friendships she is not part of (this is how friends of friends would leak)';
  assert (select count(*) from public.friendships) = 1, 'FAIL: Ada should see exactly her one friendship';
  assert (select count(*) from public.nudges) = 0, 'FAIL: Ada can read nudges sent to someone else';
  assert (select count(*) from public.friend_mutes) = 0, 'FAIL: Ada can read someone else''s mutes';
  assert (select count(*) from public.blocks) = 0, 'FAIL: Ada can read someone else''s blocks';

  -- Functions: Bea, and only Bea.
  assert (select array_agg(friend_id) from public.get_friends_summary()) = array[c_b],
    'FAIL: get_friends_summary returned someone who is not Ada''s friend';
  assert (select array_agg(user_id) from public.get_friend_avatars()) = array[c_b],
    'FAIL: get_friend_avatars returned someone who is not Ada''s friend';
  assert (select count(*) from public.get_friend_requests()) = 0, 'FAIL: Ada can see Bea''s incoming request';
  assert (select count(*) from public.get_my_nudges()) = 0, 'FAIL: Ada can see Bea''s nudge';
  assert (select count(*) from public.get_blocked_users()) = 0, 'FAIL: Ada can see someone else''s block list';
  assert (select count(*) from public.get_farm_summary('UTC', 30)) = 1, 'FAIL: farm summary is not just Ada''s own';

  -- Nothing Ada can fetch mentions Cy or Dee anywhere: not a name, not an id,
  -- not a note.
  select coalesce((select jsonb_agg(to_jsonb(s))::text from public.get_friends_summary() s), '')
      || coalesce((select jsonb_agg(to_jsonb(s))::text from public.get_friend_avatars() s), '')
      || coalesce((select jsonb_agg(to_jsonb(s))::text from public.get_friend_requests() s), '')
      || coalesce((select jsonb_agg(to_jsonb(s))::text from public.get_my_nudges() s), '')
      || coalesce((select jsonb_agg(to_jsonb(s))::text from public.friendships s), '')
      || coalesce((select jsonb_agg(to_jsonb(s))::text from public.profiles s), '')
      || coalesce((select jsonb_agg(to_jsonb(s))::text from public.poop_logs s), '')
  into v_all;
  assert v_all not like '%' || c_c::text || '%' and v_all not like '%' || c_d::text || '%',
    'FAIL: an id of someone Ada isn''t friends with appears in what she can fetch';
  assert v_all !~ '"(Cy|Dee)"', 'FAIL: the name of someone Ada isn''t friends with appears in what she can fetch';
  assert v_all not like '%private note of b%' and v_all not like '%private note of c%',
    'FAIL: someone else''s note appears in what Ada can fetch';

  -- And of her real friend Bea she gets the shared summary, not the diary.
  assert v_all not like '%secret%' and v_all not like '%b@test.local%' and v_all not like '%1990-09-30%',
    'FAIL: Bea''s email or birthday appears in what Ada can fetch';
end $$;

-- 2. What Ada can DO to people who aren't her friends, even knowing their ids
do $$
declare
  c_a constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  c_b constant uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  c_c constant uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  c_d constant uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  n int;
begin
  assert public.send_nudge(c_c, 'hello') = 'not_friends', 'FAIL: Ada nudged a friend of a friend';
  assert public.send_nudge(c_d, 'hello') = 'not_friends', 'FAIL: Ada nudged a stranger';
  assert not public.mute_friend(c_c, true), 'FAIL: Ada muted someone who is not her friend';
  assert public.respond_to_request(current_setting('stardrop.req_d_to_b')::uuid, true) = 'unavailable',
    'FAIL: Ada accepted a request that was sent to Bea';
  assert public.respond_to_request(current_setting('stardrop.req_d_to_b')::uuid, false) = 'unavailable',
    'FAIL: Ada declined a request that was sent to Bea';
  perform public.dismiss_nudge(current_setting('stardrop.nudge_c_to_b')::uuid);
  assert not public.remove_friend(c_c), 'FAIL: remove_friend reported removing someone Ada isn''t connected to';
  -- Blocking a stranger only affects Ada's own side.
  perform public.block_user(c_c);
  perform public.unblock_user(c_c);

  -- Direct writes to other people's rows: nothing happens.
  update public.profiles set display_name = 'Hacked', share_level = 'counts' where id = c_c;
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: Ada changed Cy''s profile';
  update public.poop_logs set notes = 'hacked' where user_id <> c_a;
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: Ada changed someone else''s log';
  delete from public.poop_logs where user_id <> c_a;
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: Ada deleted someone else''s log';
  delete from public.quiet_days where user_id <> c_a;
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: Ada deleted someone else''s quiet day';

  -- Writing the friends tables directly: not allowed at all.
  begin
    insert into public.friendships (requester_id, addressee_id, status) values (c_a, c_c, 'accepted');
    raise exception 'FAIL: Ada made herself Cy''s friend with a direct insert';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.friendships set status = 'accepted';
    raise exception 'FAIL: Ada could update friendships directly';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.friendships;
    raise exception 'FAIL: Ada could delete friendships directly';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.nudges (sender_id, recipient_id, kind) values (c_c, c_a, 'hello');
    raise exception 'FAIL: Ada forged a nudge';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.nudges set seen_at = now();
    raise exception 'FAIL: Ada could update nudges directly';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.blocks;
    raise exception 'FAIL: Ada could delete blocks directly';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.friend_mutes (user_id, muted_user_id) values (c_b, c_a);
    raise exception 'FAIL: Ada could write mutes directly';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.poop_logs (user_id, stool_type) values (c_c, 4);
    raise exception 'FAIL: Ada logged as Cy';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.quiet_days (user_id, day) values (c_c, current_date);
    raise exception 'FAIL: Ada marked a quiet day as Cy';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set id = c_c where id = c_a;
    raise exception 'FAIL: Ada changed her own id';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set friend_code = current_setting('stardrop.c_code') where id = c_a;
    raise exception 'FAIL: Ada set her own friend code';
  exception when insufficient_privilege then null;
  end;

  -- The helper functions behind the scenes can't be called.
  begin
    perform public.friend_count(c_c);
    raise exception 'FAIL: friend_count is callable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.is_blocked_between(c_c, c_d);
    raise exception 'FAIL: is_blocked_between is callable (would reveal who blocked whom)';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.best_streak_badge(c_c, 'UTC');
    raise exception 'FAIL: best_streak_badge is callable for anyone';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.new_friend_code();
    raise exception 'FAIL: new_friend_code is callable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 3. None of that changed anything for the others.
reset role;
do $$
begin
  assert (select count(*) from public.friendships
          where requester_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and addressee_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
            and status = 'accepted') = 1, 'FAIL: Bea and Cy''s friendship was changed';
  assert (select status from public.friendships where requester_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd') = 'pending',
    'FAIL: Dee''s request to Bea was changed';
  assert (select seen_at from public.nudges where id = current_setting('stardrop.nudge_c_to_b')::uuid) is null,
    'FAIL: Ada dismissed Bea''s nudge';
  assert (select display_name from public.profiles where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 'Cy',
    'FAIL: Cy''s profile was changed';
  assert (select friend_code from public.profiles where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = current_setting('stardrop.c_code'),
    'FAIL: Cy''s friend code was changed';
  assert (select count(*) from public.poop_logs where user_id in (select id from t_ids)) = 4, 'FAIL: a log went missing';
  assert (select count(*) from public.friend_mutes
          where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and muted_user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 1,
    'FAIL: Bea''s mute was changed';
  assert (select count(*) from public.blocks where blocker_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 1,
    'FAIL: Cy''s block was changed';
end $$;

-- 4. Bea, in the middle, sees both of her friends and her request, as she should,
--    but that doesn't let Cy see Ada either.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
do $$
begin
  assert (select array_agg(friend_id) from public.get_friends_summary()) = array['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid],
    'FAIL: Cy can see a friend of a friend';
  assert (select array_agg(user_id) from public.get_friend_avatars()) = array['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid],
    'FAIL: Cy can see the avatar of a friend of a friend';
  assert (select count(*) from public.friendships) = 1, 'FAIL: Cy can see friendships that aren''t Cy''s';
end $$;

-- 5. A logged-out visitor gets nothing from anything.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare
  t text;
  f text;
begin
  foreach t in array array['profiles', 'poop_logs', 'quiet_days', 'friendships', 'nudges', 'blocks',
                           'friend_mutes', 'friend_link_attempts', 'quiet_day_writes']
  loop
    begin
      execute format('select 1 from public.%I limit 1', t);
      raise exception 'FAIL: a logged-out visitor can read %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;

  foreach f in array array[
    'get_friends_summary()', 'get_friend_requests()', 'get_friend_avatars()', 'get_my_nudges()',
    'get_blocked_users()', 'get_farm_summary(''UTC'', 30)', 'send_friend_request(''ABCDEFGH'')',
    'regenerate_friend_code()', 'delete_my_account()',
    'send_nudge(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''hello'')',
    'block_user(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'')',
    'remove_friend(''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'')']
  loop
    begin
      execute format('select public.%s', f);
      raise exception 'FAIL: a logged-out visitor can call %', f;
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;

-- 6. The database's own settings. These hold for every table and function in
--    the public schema, including ones added later.
reset role;
do $$
declare
  v_bad text;
begin
  -- Every table has row-level security switched on AND forced.
  select string_agg(c.relname, ', ') into v_bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not (c.relrowsecurity and c.relforcerowsecurity);
  assert v_bad is null, 'FAIL: tables without forced row-level security: ' || v_bad;

  -- Logged-out visitors hold no rights on any table.
  select string_agg(distinct table_name, ', ') into v_bad
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'PUBLIC');
  assert v_bad is null, 'FAIL: tables a logged-out visitor has rights on: ' || v_bad;
  select string_agg(distinct table_name, ', ') into v_bad
  from information_schema.column_privileges
  where table_schema = 'public' and grantee in ('anon', 'PUBLIC');
  assert v_bad is null, 'FAIL: columns a logged-out visitor has rights on: ' || v_bad;

  -- The only functions a logged-out visitor may call are the two harmless ones.
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('anon', p.oid, 'execute')
    and p.proname not in ('min_age_years', 'clean_display_name');
  assert v_bad is null, 'FAIL: functions a logged-out visitor can call: ' || v_bad;

  -- Signed-in users can call exactly this list, and nothing internal.
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and has_function_privilege('authenticated', p.oid, 'execute')
    and p.proname not in (
      'min_age_years', 'clean_display_name', 'get_farm_summary', 'delete_my_account',
      'send_friend_request', 'respond_to_request', 'remove_friend', 'block_user', 'unblock_user',
      'mute_friend', 'send_nudge', 'dismiss_nudge', 'get_my_nudges', 'regenerate_friend_code',
      'get_friends_summary', 'get_friend_requests', 'get_blocked_users', 'get_friend_avatars');
  assert v_bad is null, 'FAIL: unexpected functions a signed-in user can call: ' || v_bad;

  -- Every function that runs with the owner's rights pins its search path,
  -- so it can't be tricked into running someone else's code.
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%');
  assert v_bad is null, 'FAIL: SECURITY DEFINER functions without a fixed search_path: ' || v_bad;

  -- Signed-in users can't write the friends tables or the counters directly.
  select string_agg(distinct table_name || ':' || privilege_type, ', ') into v_bad
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
    and table_name in ('friendships', 'nudges', 'blocks', 'friend_mutes', 'friend_link_attempts', 'quiet_day_writes', 'profiles');
  assert v_bad is null, 'FAIL: direct write rights on locked tables: ' || v_bad;
  select string_agg(distinct table_name || '.' || column_name, ', ') into v_bad
  from information_schema.column_privileges
  where table_schema = 'public' and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE')
    and table_name in ('friendships', 'nudges', 'blocks', 'friend_mutes', 'friend_link_attempts', 'quiet_day_writes');
  assert v_bad is null, 'FAIL: direct column write rights on locked tables: ' || v_bad;

  -- On their own profile they can change exactly these columns.
  assert (select array_agg(column_name::text order by column_name::text)
          from information_schema.column_privileges
          where table_schema = 'public' and table_name = 'profiles'
            and grantee = 'authenticated' and privilege_type = 'UPDATE')
       = array['accept_nudges', 'avatar', 'display_name', 'gender', 'reminders_enabled', 'share_level', 'sharing_seen', 'timezone', 'tips_enabled'],
    'FAIL: the list of profile columns a user may change is not what it should be';

  -- Nobody but the recipient-facing columns of nudges is readable; never "delivered".
  assert not exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'nudges' and column_name = 'delivered' and grantee = 'authenticated'),
    'FAIL: nudges.delivered is readable (it would reveal a mute)';
end $$;

-- 7. Deleting an account removes all of it.
--    Bea has the most to leave behind: logs, a quiet day, an avatar, two
--    friendships, a request sent to her, a nudge, a mute. Give her one of
--    everything else too, then delete her the way Settings does.
insert into public.friend_link_attempts (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
insert into public.quiet_day_writes (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
insert into public.blocks (blocker_id, blocked_id)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
insert into public.nudges (sender_id, recipient_id, kind)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hello');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select public.delete_my_account();

reset role;
do $$
declare
  c_b constant uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_bad text;
  r record;
  n bigint;
begin
  assert not exists (select 1 from auth.users where id = c_b), 'FAIL: the sign-in account survived deletion';
  assert not exists (select 1 from public.profiles where id = c_b), 'FAIL: the profile survived deletion';

  -- Every column in every table that points at a person: no row may still hold Bea's id.
  for r in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
      and c.confrelid = 'public.profiles'::regclass
  loop
    execute format('select count(*) from %s where %I = $1', r.tbl, r.col) into n using c_b;
    assert n = 0, format('FAIL: %s.%s still has %s row(s) of a deleted account', r.tbl, r.col, n);
  end loop;

  -- And the wiring that guarantees it, for tables added later too: every
  -- table other than profiles must point at profiles, and remove its rows
  -- when the profile goes (ON DELETE CASCADE).
  select string_agg(t.relname, ', ') into v_bad
  from pg_class t join pg_namespace n2 on n2.oid = t.relnamespace
  where n2.nspname = 'public' and t.relkind = 'r' and t.relname <> 'profiles'
    and not exists (
      select 1 from pg_constraint c
      where c.conrelid = t.oid and c.contype = 'f'
        and c.confrelid = 'public.profiles'::regclass and c.confdeltype = 'c');
  assert v_bad is null, 'FAIL: tables whose rows would outlive a deleted account: ' || v_bad;

  select string_agg(c.conrelid::regclass::text || '.' || c.conname, ', ') into v_bad
  from pg_constraint c
  where c.contype = 'f' and c.connamespace = 'public'::regnamespace
    and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass) and c.confdeltype <> 'c';
  assert v_bad is null, 'FAIL: links to a person that do not cascade on delete: ' || v_bad;

  -- Nobody else lost anything: Ada, Cy and Dee keep their own logs and each other.
  assert (select count(*) from public.poop_logs where user_id in (select id from t_ids)) = 3,
    'FAIL: deleting one account removed someone else''s logs';
  assert (select count(*) from public.profiles where id in (select id from t_ids)) = 3,
    'FAIL: deleting one account removed someone else''s profile';
end $$;

select 'ISOLATION CHECKS PASSED' as result;

rollback;
