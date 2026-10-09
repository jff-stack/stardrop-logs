-- Checks the gender column from 0003_gender.sql: picked up at sign-up,
-- cleaned if bogus, editable only by its owner, and limited to 3 values.
-- Everything is rolled back at the end. You should see "GENDER CHECKS PASSED".

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.local', jsonb_build_object('dob', '1995-04-12', 'gender', 'female')),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.local', jsonb_build_object('dob', '1990-09-30', 'gender', '<script>'));

do $$
begin
  assert (select gender from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = 'female',
    'FAIL: gender not copied from sign-up';
  assert (select gender from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 'other',
    'FAIL: bogus gender not cleaned to other';
end $$;

-- Farmer A changes their own, can't use a made-up value, can't touch B's
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

do $$
declare n int;
begin
  update public.profiles set gender = 'male' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert (select gender from public.profiles) = 'male', 'FAIL: A could not update own gender';

  begin
    update public.profiles set gender = 'queen' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    raise exception 'FAIL: invalid gender accepted';
  exception when check_violation then null;
  end;

  update public.profiles set gender = 'female' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: A changed B''s gender';
end $$;

reset role;
do $$
begin
  assert (select gender from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') = 'other',
    'FAIL: B''s gender changed';
end $$;

select 'GENDER CHECKS PASSED' as result;

rollback;
