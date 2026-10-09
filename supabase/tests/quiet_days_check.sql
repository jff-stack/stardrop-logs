-- Checks that quiet_days is private per user and validates its input.
-- Run it after 0002_quiet_days.sql. Everything is rolled back at the end.
-- You should see "QUIET DAY CHECKS PASSED".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', jsonb_build_object('dob', '1995-04-12')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', jsonb_build_object('dob', '1990-09-30'));

-- Farmer A records a quiet day
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

insert into public.quiet_days (day) values (current_date);

do $$
begin
  assert (select count(*) from public.quiet_days) = 1, 'FAIL: A cannot see own quiet day';

  -- Duplicate day -> unique violation.
  begin
    insert into public.quiet_days (day) values (current_date);
    raise exception 'FAIL: duplicate quiet day accepted';
  exception when unique_violation then null;
  end;

  -- Far-future day -> rejected by trigger.
  begin
    insert into public.quiet_days (day) values (current_date + 5);
    raise exception 'FAIL: future quiet day accepted';
  exception when invalid_datetime_format then null;
  end;

  -- Spoofing user_id -> no column privilege.
  begin
    insert into public.quiet_days (user_id, day)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', current_date - 1);
    raise exception 'FAIL: user_id spoofing allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Farmer B sees and deletes nothing
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);

do $$
declare n int;
begin
  assert (select count(*) from public.quiet_days) = 0, 'FAIL: B can read A''s quiet days';
  delete from public.quiet_days;
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: B deleted A''s quiet day';
end $$;

-- Logged-out visitor: no access
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.quiet_days;
    raise exception 'FAIL: anon can query quiet_days';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'QUIET DAY CHECKS PASSED' as result;

rollback;
