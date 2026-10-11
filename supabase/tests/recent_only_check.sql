-- Checks 0007_recent_only.sql: logs and quiet days can be added for today or
-- yesterday and nothing older, and quiet-day marks are limited per day.
-- Everything is rolled back at the end. You should see "RECENT-ONLY CHECKS PASSED".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', jsonb_build_object('dob', '1995-04-12')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', jsonb_build_object('dob', '1990-09-30'));

-- The owner, with no signed-in user, may still put older history in place
-- (restoring data, setting up tests). These two rows are A's "old" data.
insert into public.poop_logs (user_id, stool_type, logged_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, now() - interval '10 days');
insert into public.quiet_days (user_id, day)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 10);
-- And something of B's, to check A can't touch it.
insert into public.quiet_days (user_id, day)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', current_date - 1);

do $$
begin
  assert (select count(*) from public.quiet_day_writes
          where user_id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')) = 0,
    'FAIL: owner inserts should not count as marks';
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

-- 1. Logs: today and yesterday, nothing older, nothing ahead.
do $$
declare
  v_id uuid;
  n int;
begin
  insert into public.poop_logs (stool_type) values (4);
  insert into public.poop_logs (stool_type, logged_at) values (4, now() - interval '30 hours');
  -- Still inside anyone's "yesterday", wherever they are.
  insert into public.poop_logs (stool_type, logged_at) values (4, now() - interval '49 hours')
  returning id into v_id;

  begin
    insert into public.poop_logs (stool_type, logged_at) values (4, now() - interval '51 hours');
    raise exception 'FAIL: a log from 51 hours ago was accepted';
  exception when invalid_datetime_format then null;
  end;
  begin
    insert into public.poop_logs (stool_type, logged_at) values (4, now() - interval '3 days');
    raise exception 'FAIL: a log from 3 days ago was accepted';
  exception when invalid_datetime_format then null;
  end;
  begin
    insert into public.poop_logs (stool_type, logged_at) values (4, now() - interval '6 months');
    raise exception 'FAIL: a log from 6 months ago was accepted';
  exception when invalid_datetime_format then null;
  end;
  begin
    insert into public.poop_logs (stool_type, logged_at) values (4, now() + interval '1 hour');
    raise exception 'FAIL: a log in the future was accepted';
  exception when invalid_datetime_format then null;
  end;

  -- Moving an existing log back in time is the same thing by another route.
  begin
    update public.poop_logs set logged_at = now() - interval '5 days' where id = v_id;
    raise exception 'FAIL: a log was moved to 5 days ago';
  exception when invalid_datetime_format then null;
  end;
  -- Editing anything else about a log is still fine.
  update public.poop_logs set notes = 'edited' where id = v_id;

  -- Old logs that already exist stay, and their owner can still remove them.
  assert (select count(*) from public.poop_logs where logged_at < now() - interval '5 days') = 1,
    'FAIL: the existing old log is missing';
  delete from public.poop_logs where logged_at < now() - interval '5 days';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: could not delete an old log';
end $$;

-- 2. Quiet days: today and yesterday (plus a day of slack either side for
--    timezones), nothing older, nothing further ahead.
do $$
declare n int;
begin
  insert into public.quiet_days (day) values (current_date);       -- mark 1
  insert into public.quiet_days (day) values (current_date - 1);   -- mark 2

  begin
    insert into public.quiet_days (day) values (current_date - 3);
    raise exception 'FAIL: a quiet day 3 days ago was accepted';
  exception when invalid_datetime_format then null;
  end;
  begin
    insert into public.quiet_days (day) values (current_date - 30);
    raise exception 'FAIL: a quiet day a month ago was accepted';
  exception when invalid_datetime_format then null;
  end;
  begin
    insert into public.quiet_days (day) values (current_date + 2);
    raise exception 'FAIL: a quiet day 2 days ahead was accepted';
  exception when invalid_datetime_format then null;
  end;

  -- Marking a day that's already quiet changes nothing, and doesn't use up a mark.
  begin
    insert into public.quiet_days (day) values (current_date - 1);
    raise exception 'FAIL: duplicate quiet day accepted';
  exception when unique_violation then null;
  end;

  -- Undo works for both days.
  delete from public.quiet_days where day = current_date - 1;
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: could not undo yesterday';
  delete from public.quiet_days where day = current_date;
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: could not undo today';

  -- The old quiet day that already existed is still there, and removable.
  assert (select count(*) from public.quiet_days) = 1, 'FAIL: the existing old quiet day is missing';
  delete from public.quiet_days where day = current_date - 10;
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: could not delete an old quiet day';

  -- Refused tries and duplicates didn't count: only the two real marks did.
  -- Three more are allowed, then the sixth in a day is refused, even though
  -- each one was undone in between.
  insert into public.quiet_days (day) values (current_date - 1);   -- mark 3
  delete from public.quiet_days where day = current_date - 1;
  insert into public.quiet_days (day) values (current_date - 1);   -- mark 4
  delete from public.quiet_days where day = current_date - 1;
  insert into public.quiet_days (day) values (current_date - 1);   -- mark 5
  delete from public.quiet_days where day = current_date - 1;
  begin
    insert into public.quiet_days (day) values (current_date - 1);
    raise exception 'FAIL: a 6th quiet-day mark in one day was accepted';
  exception when configuration_limit_exceeded then null;
  end;

  -- The counter itself is out of reach.
  begin
    perform 1 from public.quiet_day_writes;
    raise exception 'FAIL: quiet_day_writes is readable';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.quiet_day_writes;
    raise exception 'FAIL: quiet_day_writes can be cleared';
  exception when insufficient_privilege then null;
  end;

  -- B's quiet day is invisible and untouchable.
  assert (select count(*) from public.quiet_days) = 0, 'FAIL: A can see B''s quiet day';
  delete from public.quiet_days where day = current_date - 1;
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: A deleted B''s quiet day';
end $$;

-- 3. B's limit is their own: A using theirs up doesn't affect B.
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
do $$
begin
  assert (select count(*) from public.quiet_days) = 1, 'FAIL: B''s quiet day changed';
  insert into public.quiet_days (day) values (current_date);
end $$;

reset role;
do $$
begin
  assert (select count(*) from public.quiet_day_writes where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 5,
    'FAIL: A should have exactly 5 marks counted';
  assert (select count(*) from public.quiet_day_writes where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 1,
    'FAIL: B should have exactly 1 mark counted';
end $$;

select 'RECENT-ONLY CHECKS PASSED' as result;

rollback;
