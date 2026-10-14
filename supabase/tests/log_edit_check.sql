-- Checks editing a log that already exists: type, colour, habits and note can
-- be changed on ANY of the user's own logs, however old; the time can only be
-- moved to today or yesterday; nobody can edit someone else's log or the
-- columns that aren't theirs to write.
-- Everything is rolled back at the end. You should see "LOG EDIT CHECKS PASSED".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', jsonb_build_object('dob', '1995-04-12', 'display_name', 'Ada')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', jsonb_build_object('dob', '1990-09-30', 'display_name', 'Bea'));

-- Set up as the owner (no signed-in user), so old logs can exist.
insert into public.poop_logs (id, user_id, stool_type, color, factors, logged_at, notes) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 'brown', '{}', now() - interval '10 days', 'old'),
  ('a0000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 'brown', '{}', now() - interval '300 days', null),
  ('a0000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 4, 'brown', '{}', now() - interval '1 hour', null),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 4, 'brown', '{}', now() - interval '1 hour', 'bea');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

do $$
declare
  n int;
  v_before timestamptz;
  v_moved boolean;
begin
  -- Type, colour, habits and note on a 10-day-old log, and on a 300-day-old one.
  update public.poop_logs
  set stool_type = 6, color = 'green', factors = array['coffee', 'stressed'], notes = 'fixed'
  where id = 'a0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: could not edit a 10-day-old log';
  assert (select category from public.poop_logs where id = 'a0000000-0000-4000-8000-000000000001') = 'loose',
    'FAIL: the category did not follow the new type';
  assert (select color from public.poop_logs where id = 'a0000000-0000-4000-8000-000000000001') = 'green',
    'FAIL: the colour was not changed';

  update public.poop_logs set color = 'dark_brown', notes = null where id = 'a0000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: could not edit a 300-day-old log';

  -- Its time is untouched by an edit that does not send one.
  select logged_at into v_before from public.poop_logs where id = 'a0000000-0000-4000-8000-000000000001';
  update public.poop_logs set color = 'brown' where id = 'a0000000-0000-4000-8000-000000000001';
  assert (select logged_at from public.poop_logs where id = 'a0000000-0000-4000-8000-000000000001') = v_before,
    'FAIL: an edit without a time changed the time';

  -- A bad value is still refused on an old log (the CHECKs apply to updates).
  begin
    update public.poop_logs set stool_type = 9 where id = 'a0000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: type 9 accepted on an edit';
  exception when check_violation then null;
  end;
  begin
    update public.poop_logs set color = 'purple' where id = 'a0000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: an unknown colour accepted on an edit';
  exception when check_violation or invalid_text_representation then null;
  end;

  -- The time can not be moved back beyond yesterday, or into the future.
  v_moved := false;
  begin
    update public.poop_logs set logged_at = now() - interval '5 days' where id = 'a0000000-0000-4000-8000-000000000003';
    v_moved := true;
  exception when others then null;
  end;
  assert not v_moved, 'FAIL: a log was moved 5 days back';

  begin
    update public.poop_logs set logged_at = now() + interval '2 days' where id = 'a0000000-0000-4000-8000-000000000003';
    v_moved := true;
  exception when others then null;
  end;
  assert not v_moved, 'FAIL: a log was moved into the future';

  -- It can move to a time yesterday.
  update public.poop_logs set logged_at = now() - interval '20 hours' where id = 'a0000000-0000-4000-8000-000000000003';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: could not move a log to yesterday';

  -- Someone else's log can not be touched.
  update public.poop_logs set color = 'black' where id = 'b0000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: A edited B''s log';

  -- Columns that are not a user's to write.
  begin
    update public.poop_logs set user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = 'a0000000-0000-4000-8000-000000000003';
    raise exception 'FAIL: user_id was writable';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.poop_logs set created_at = now() - interval '2 years' where id = 'a0000000-0000-4000-8000-000000000003';
    raise exception 'FAIL: created_at was writable';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$
begin
  assert (select color from public.poop_logs where id = 'b0000000-0000-4000-8000-000000000001') = 'brown',
    'FAIL: B''s log changed';
  assert (select user_id from public.poop_logs where id = 'a0000000-0000-4000-8000-000000000003')
         = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FAIL: a log changed owner';
end $$;

select 'LOG EDIT CHECKS PASSED' as result;

rollback;
