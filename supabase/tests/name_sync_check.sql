-- Checks the display name rules from 0004_name_rules.sql: cleaned at sign-up,
-- editable only by its owner, never blank, never too long, never untidy.
-- Everything is rolled back at the end. You should see "NAME SYNC CHECKS PASSED".

begin;

-- The clean-up function on its own.
do $$
begin
  assert public.clean_display_name(E'  Sam \t\n  Lee  ') = 'Sam Lee', 'FAIL: whitespace not collapsed';
  assert public.clean_display_name(E'Sam \x01 Lee\x7f') = 'Sam Lee', 'FAIL: control characters not removed';
  assert public.clean_display_name('   ') = '', 'FAIL: blank name not emptied';
  assert public.clean_display_name(null) = '', 'FAIL: null not treated as empty';
  assert public.clean_display_name('山田 太郎') = '山田 太郎', 'FAIL: non-latin name changed';
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local',
   jsonb_build_object('dob', '1995-04-12', 'display_name', E'  Sam \t Lee ')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local',
   jsonb_build_object('dob', '1990-09-30', 'display_name', '    ')),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@test.local',
   jsonb_build_object('dob', '1988-01-20', 'display_name', repeat('x', 23) || ' yz'));

do $$
begin
  assert (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 'Sam Lee',
    'FAIL: sign-up name not cleaned';
  assert (select display_name from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 'Farmer',
    'FAIL: blank sign-up name did not fall back to Farmer';
  -- Cutting at 24 lands on the space; it must not be left dangling.
  assert (select display_name from public.profiles where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = repeat('x', 23),
    'FAIL: long sign-up name not cut cleanly';
end $$;

-- Farmer A edits their own name, can't break the rules, can't touch B's
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

do $$
declare
  n   int;
  bad text;
begin
  update public.profiles set display_name = 'Sammy' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: A could not update own name';
  assert (select display_name from public.profiles) = 'Sammy', 'FAIL: A''s new name not saved';

  -- Longest allowed name is fine.
  update public.profiles set display_name = repeat('x', 24) where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  -- Empty, blank, too long, control character, loose spaces: all refused.
  foreach bad in array array['', '   ', repeat('x', 25), E'Sam\x01', ' Sam', 'Sam ', 'Sam  Lee', E'Sam\tLee']
  loop
    begin
      update public.profiles set display_name = bad where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      raise exception 'FAIL: bad name accepted: [%]', bad;
    exception when check_violation then null;
    end;
  end loop;

  update public.profiles set display_name = 'Hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: A changed B''s name';

  -- Still no way to change the birthday, the id or the timestamps.
  begin
    update public.profiles set dob = '1980-01-01' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    raise exception 'FAIL: A changed their dob';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set updated_at = now() where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    raise exception 'FAIL: A wrote updated_at directly';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$
begin
  assert (select display_name from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = repeat('x', 24),
    'FAIL: a refused update still changed A''s name';
  assert (select display_name from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 'Farmer',
    'FAIL: B''s name changed';
end $$;

select 'NAME SYNC CHECKS PASSED' as result;

rollback;
