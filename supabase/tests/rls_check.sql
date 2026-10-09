-- Checks that the age gate and per-user isolation actually work.
-- Run it in the SQL Editor after 0001_init.sql. Everything happens in one
-- transaction that gets rolled back, so no test data is left behind.
-- You should see "ALL RLS CHECKS PASSED"; otherwise an assert tells you
-- exactly what broke.

begin;

-- Fixed test ids so we can impersonate them.
--   Farmer A: aaaaaaaa-...   Farmer B: bbbbbbbb-...

-- 1. Age gate: an under-18 sign-up must be rejected by the database.
do $$
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'kid@test.local',
      jsonb_build_object('dob', (current_date - interval '17 years')::date::text)
    );
    raise exception 'FAIL: under-18 sign-up was accepted';
  exception
    when raise_exception then
      if sqlerrm like 'FAIL:%' then raise; end if;
      -- Expected: AGE_GATE exception. Good.
  end;

  -- Missing DOB must also be rejected.
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'nodob@test.local', '{}'::jsonb);
    raise exception 'FAIL: sign-up without dob was accepted';
  exception
    when raise_exception then
      if sqlerrm like 'FAIL:%' then raise; end if;
  end;
end $$;

-- 2. Two valid adult farmers.
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local',
   jsonb_build_object('dob', '1995-04-12', 'display_name', 'Farmer A')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local',
   jsonb_build_object('dob', '1990-09-30', 'display_name', 'Farmer B'));

do $$
begin
  assert (select count(*) from public.profiles
          where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')) = 2,
    'FAIL: profiles were not auto-created by handle_new_user()';
end $$;

-- 3. Act as Farmer A: insert a log.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

insert into public.poop_logs (stool_type, color, factors, notes)
values (4, 'brown', array['hydrated','fiber'], 'Prize crop!');

do $$
begin
  assert (select count(*) from public.poop_logs) = 1,
    'FAIL: Farmer A cannot see their own log';
  assert (select user_id from public.poop_logs limit 1)
         = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'FAIL: user_id default did not resolve to auth.uid()';
end $$;

-- A tries to spoof user_id -> must fail (no column privilege).
do $$
begin
  begin
    insert into public.poop_logs (user_id, stool_type)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3);
    raise exception 'FAIL: user_id spoofing was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A tries to change their DOB -> must fail.
do $$
begin
  begin
    update public.profiles set dob = '2015-01-01'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    raise exception 'FAIL: dob was editable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Invalid data -> must fail (type 9, unknown factor, future date).
do $$
begin
  begin
    insert into public.poop_logs (stool_type) values (9);
    raise exception 'FAIL: stool_type 9 accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.poop_logs (stool_type, factors) values (4, array['pizza']);
    raise exception 'FAIL: unknown factor accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.poop_logs (stool_type, logged_at) values (4, now() + interval '2 days');
    raise exception 'FAIL: future logged_at accepted';
  exception when invalid_datetime_format then null;
  end;
end $$;

-- 4. Switch to Farmer B: must see/touch NOTHING of A's.
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);

do $$
declare n int;
begin
  assert (select count(*) from public.poop_logs) = 0,
    'FAIL: Farmer B can read Farmer A''s logs';
  assert (select count(*) from public.profiles) = 1,
    'FAIL: Farmer B can read other profiles';

  update public.poop_logs set notes = 'hacked';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: Farmer B updated Farmer A''s log';

  delete from public.poop_logs;
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: Farmer B deleted Farmer A''s log';

  assert (select count(*) from public.get_farm_summary('UTC', 30)) = 0,
    'FAIL: farm summary leaked another user''s data';
end $$;

-- 5. Logged-out visitor (anon): zero access.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform 1 from public.poop_logs;
    raise exception 'FAIL: anon can query poop_logs';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.profiles;
    raise exception 'FAIL: anon can query profiles';
  exception when insufficient_privilege then null;
  end;
end $$;

-- 6. Back to A: confirm the log survived B's attempts.
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

do $$
begin
  assert (select notes from public.poop_logs limit 1) = 'Prize crop!',
    'FAIL: Farmer A''s log was modified by someone else';
end $$;

select 'ALL RLS CHECKS PASSED' as result;

rollback;
