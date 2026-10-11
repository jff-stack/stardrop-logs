-- Display name rules, matching normaliseName() in src/lib/name.ts.
--
-- Until now the database only checked the length (1 to 24), so a name made of
-- spaces, or one with invisible control characters, was accepted if someone
-- skipped the app and called the API directly. This adds the same clean-up
-- the app does, and makes the table refuse anything that isn't already clean.
--
-- Nothing changes about who can write what: signed-in users can still only
-- update display_name and gender on their own row.
--
-- Run after 0001, 0002 and 0003. Safe to run more than once.

-- 1. The clean-up itself. Change it together with normaliseName().
--    - tabs, newlines and runs of spaces become one space
--    - control characters are removed
--    - the ends are trimmed
create or replace function public.clean_display_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(normalize(coalesce(p_name, ''), NFC), '\s+', ' ', 'g'),
        '[\u0001-\u001F\u007F-\u009F]', '', 'g'),
      ' {2,}', ' ', 'g'),
    ' ')
$$;

comment on function public.clean_display_name(text) is
  'Tidies a display name. Mirrors normaliseName() in src/lib/name.ts.';

-- It only reshapes the text it's given, so anyone may call it (like
-- min_age_years()). scripts/check-supabase.mjs uses it to see this file ran.
revoke execute on function public.clean_display_name(text) from public;
grant  execute on function public.clean_display_name(text) to anon, authenticated;

-- 2. Tidy names saved before this rule existed, or step 3 would fail on them.
--    A name that cleans down to nothing goes back to the default.
update public.profiles
set display_name = coalesce(nullif(left(public.clean_display_name(display_name), 24), ''), 'Farmer')
where display_name is distinct from
      coalesce(nullif(left(public.clean_display_name(display_name), 24), ''), 'Farmer');

-- 3. The table now refuses names that aren't clean. This replaces the
--    length-only check from 0001 (same 1 to 24 limit).
alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles drop constraint if exists profiles_display_name_clean;
alter table public.profiles
  add constraint profiles_display_name_clean check (
    char_length(display_name) between 1 and 24
    and display_name = public.clean_display_name(display_name)
  );

-- 4. Same sign-up trigger as 0003, now cleaning the name with the shared
--    function instead of a plain trim.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- needs to insert into public.profiles
set search_path = ''      -- prevents search_path hijacking
as $$
declare
  v_dob    date;
  v_name   text;
  v_gender text;
begin
  -- Parse dob defensively; any malformed value is treated as missing.
  begin
    v_dob := (new.raw_user_meta_data ->> 'dob')::date;
  exception when others then
    v_dob := null;
  end;

  if v_dob is null then
    raise exception 'AGE_GATE: date of birth is required'
      using errcode = 'P0001';
  end if;

  if v_dob > current_date then
    raise exception 'AGE_GATE: date of birth is in the future'
      using errcode = 'P0001';
  end if;

  -- Under-age check: born after (today - 18 years) -> too young.
  if v_dob > (current_date - make_interval(years => public.min_age_years()))::date then
    raise exception 'AGE_GATE: must be at least % years old', public.min_age_years()
      using errcode = 'P0001';
  end if;

  -- Display name: clean, cap at 24 chars, fall back to 'Farmer'. Cleaned
  -- again after the cut in case it left a space at the end.
  v_name := public.clean_display_name(
    left(public.clean_display_name(new.raw_user_meta_data ->> 'display_name'), 24));
  if v_name = '' then
    v_name := 'Farmer';
  end if;

  v_gender := lower(coalesce(new.raw_user_meta_data ->> 'gender', ''));
  if v_gender not in ('female', 'male', 'other') then
    v_gender := 'other';
  end if;

  insert into public.profiles (id, display_name, dob, gender)
  values (new.id, v_name, v_dob, v_gender);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Done. Next: run supabase/tests/name_sync_check.sql.
