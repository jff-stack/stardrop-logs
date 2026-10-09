-- Gender, only so Mia can say hello the right way:
--   female -> "Hey Queen!"   male -> "Hey Buddy!"   other -> "Hey there!"
--
-- It's never shown to anyone else and has no effect on anything but the
-- greeting. Users pick it at sign-up and can change it in Settings.
--
-- Run after 0001 and 0002. Safe to run more than once.

alter table public.profiles
  add column if not exists gender text not null default 'other';

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles
  add constraint profiles_gender_check check (gender in ('female', 'male', 'other'));

comment on column public.profiles.gender is 'Only used to pick Mia''s greeting. female | male | other.';

-- Users may change it later, like their display name.
grant update (gender) on public.profiles to authenticated;

-- Same sign-up trigger as 0001, now also copying gender from the sign-up
-- metadata. Anything that isn't one of the three values becomes 'other'.
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

  -- Display name: trim, cap at 24 chars, fall back to 'Farmer'.
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 24);
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
