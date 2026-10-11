-- Checks the avatar column from 0006_avatar.sql: a user can save their own,
-- only in the right shape, and only friends can see it.
-- Everything is rolled back at the end. You should see "AVATAR CHECKS PASSED".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', jsonb_build_object('dob', '1995-04-12', 'display_name', 'Ada')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', jsonb_build_object('dob', '1990-09-30', 'display_name', 'Bea')),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local', jsonb_build_object('dob', '1988-01-20', 'display_name', 'Cy'));

do $$
begin
  assert (select count(*) from public.profiles
          where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc')
            and avatar is null) = 3,
    'FAIL: a new profile should start with no avatar';
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

do $$
declare
  c_good constant jsonb := '{"v":1,"skin":"skin_3","hair":"hair_short","hairColor":"hc_5","outfit":"outfit_hoodie","outfitColor":"oc_2","eyes":"eyes_happy","accessory":"acc_none","bg":"bg_4"}';
  v_bad jsonb;
  n int;
begin
  -- A saves a valid avatar.
  update public.profiles set avatar = c_good where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: A could not save their avatar';
  assert (select avatar from public.profiles) = c_good, 'FAIL: avatar was not stored as sent';

  -- An id the database has never heard of is fine, as long as it's shaped
  -- like an id. (The app decides which ids exist.)
  update public.profiles set avatar = c_good || '{"accessory":"acc_future_hat_2031"}'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- The longest ids allowed still fit under the size limit... just not all at once.
  update public.profiles set avatar = c_good || jsonb_build_object('hair', repeat('x', 24))
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Everything else is refused.
  foreach v_bad in array array[
    c_good || '{"hat":"hat_1"}',                           -- extra key
    c_good - 'bg',                                         -- missing key
    (c_good - 'bg') || '{"background":"bg_4"}',            -- right count, wrong key
    c_good || jsonb_build_object('hair', repeat('x', 25)), -- value too long
    c_good || '{"hair":""}',                               -- empty value
    c_good || '{"hair":"Hair Short"}',                     -- capitals and a space
    c_good || '{"hair":"hair-short"}',                     -- dash
    c_good || '{"hair":"<script>"}',
    c_good || '{"hair":7}',                                -- not a string
    c_good || '{"hair":null}',
    c_good || '{"hair":["hair_short"]}',
    c_good || '{"hair":{"id":"hair_short"}}',
    c_good || '{"v":2}',                                   -- wrong version
    c_good || '{"v":"1"}',
    '"hair_short"'::jsonb,                                 -- not an object
    '[1,2,3]'::jsonb,
    '42'::jsonb,
    'null'::jsonb,
    '{}'::jsonb
  ]
  loop
    begin
      update public.profiles set avatar = v_bad where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      raise exception 'FAIL: bad avatar accepted: %', v_bad;
    exception when invalid_parameter_value then null;
    end;
  end loop;

  -- Too big, even though every value is a legal id.
  begin
    update public.profiles
    set avatar = (select jsonb_object_agg(key, case when key = 'v' then '1'::jsonb else to_jsonb(repeat('x', 24)) end)
                  from jsonb_object_keys(c_good) key)
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    raise exception 'FAIL: oversized avatar accepted';
  exception when invalid_parameter_value then null;
  end;

  -- A refused update leaves the last good one in place.
  assert (select avatar ->> 'hair' from public.profiles) = repeat('x', 24), 'FAIL: a refused update changed the avatar';

  -- Back to "not made one yet" is allowed.
  update public.profiles set avatar = null where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert (select avatar from public.profiles) is null, 'FAIL: could not clear the avatar';
  update public.profiles set avatar = c_good where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Someone else's row can't be touched.
  update public.profiles set avatar = c_good where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: A changed B''s avatar';

  -- The rest of the profile is still locked.
  begin
    update public.profiles set dob = '1980-01-01', avatar = c_good where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    raise exception 'FAIL: dob changed alongside the avatar';
  exception when insufficient_privilege then null;
  end;

  -- Nobody is A's friend yet, so there are no avatars to see.
  assert (select count(*) from public.get_friend_avatars()) = 0, 'FAIL: avatars visible with no friends';
end $$;

reset role;
do $$
begin
  assert (select avatar from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') is null,
    'FAIL: B''s avatar changed';
end $$;

-- B and A become friends; C sends B a request. A's avatar is set, the others aren't.
insert into public.friendships (requester_id, addressee_id, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'accepted'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pending');
set local role authenticated;

-- B sees A (friend) and C (asked to be friends), and that's all.
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
do $$
begin
  assert (select count(*) from public.get_friend_avatars()) = 2, 'FAIL: B should see two avatars';
  assert (select avatar ->> 'outfit' from public.get_friend_avatars()
          where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 'outfit_hoodie',
    'FAIL: B cannot see friend A''s avatar';
  assert (select avatar from public.get_friend_avatars()
          where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') is null,
    'FAIL: C has no avatar, so it should come back empty';
  -- Still no way to read the profile itself.
  assert (select count(*) from public.profiles) = 1, 'FAIL: B can read other profiles';
end $$;

-- A sees B only. C is a stranger to A.
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
do $$
begin
  assert (select array_agg(user_id) from public.get_friend_avatars())
       = array['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid],
    'FAIL: A should see only B''s avatar';
end $$;

-- Logged-out visitors get nothing.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.get_friend_avatars();
    raise exception 'FAIL: anon can call get_friend_avatars';
  exception when insufficient_privilege then null;
  end;
  begin
    perform avatar from public.profiles;
    raise exception 'FAIL: anon can read avatars';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'AVATAR CHECKS PASSED' as result;

rollback;
