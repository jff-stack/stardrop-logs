-- Checks the two tip choices from 0008_tip_prefs.sql: a user can change their
-- own, only to true or false, never someone else's, and nothing else on the
-- profile opens up with them.
-- Everything is rolled back at the end. You should see "TIP PREFS CHECKS PASSED".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', jsonb_build_object('dob', '1995-04-12', 'display_name', 'Ada')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', jsonb_build_object('dob', '1990-09-30', 'display_name', 'Bea'));

-- Both start on.
do $$
begin
  assert (select count(*) from public.profiles
          where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
            and tips_enabled and reminders_enabled) = 2,
    'FAIL: a new profile should start with tips and reminders on';
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

do $$
declare
  n int;
begin
  -- A turns both off, then one back on.
  update public.profiles set tips_enabled = false, reminders_enabled = false
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: A could not change their own choices';
  assert (select not tips_enabled and not reminders_enabled from public.profiles), 'FAIL: choices not stored';

  update public.profiles set tips_enabled = true where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert (select tips_enabled and not reminders_enabled from public.profiles), 'FAIL: one choice changed the other';

  -- Someone else's row can't be touched.
  update public.profiles set tips_enabled = false where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: A changed B''s choices';

  -- Not a boolean: refused by the column type, not quietly accepted.
  begin
    execute 'update public.profiles set tips_enabled = ''maybe'' where id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''';
    raise exception 'FAIL: a non-boolean was accepted';
  exception when invalid_text_representation then null;
  end;
  begin
    execute 'update public.profiles set reminders_enabled = null where id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''';
    raise exception 'FAIL: null was accepted';
  exception when not_null_violation then null;
  end;

  -- The rest of the profile is still locked.
  begin
    update public.profiles set dob = '1980-01-01', tips_enabled = true where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    raise exception 'FAIL: dob changed alongside the choices';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$
begin
  assert (select tips_enabled and reminders_enabled from public.profiles
          where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    'FAIL: B''s choices changed';
end $$;

-- A logged-out visitor has no rights on the new columns.
do $$
begin
  assert not exists (
    select 1 from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'profiles'
      and column_name in ('tips_enabled', 'reminders_enabled') and grantee in ('anon', 'PUBLIC')),
    'FAIL: a logged-out visitor has rights on the tip choices';
end $$;

select 'TIP PREFS CHECKS PASSED' as result;

rollback;
