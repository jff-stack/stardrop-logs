-- Stardrop Logs: tables, the 18+ age gate, and row-level security.
--
-- Run it in the Supabase SQL Editor, or with the CLI:
--   supabase link --project-ref <ref> && supabase db push
--
-- How the security works:
--   - RLS is enabled and forced on every table, so no row is visible unless a
--     policy allows it.
--   - Logged-out visitors (anon) get no access to any table.
--   - Signed-in users only get column-level grants, so they can never write
--     user_id, dob, or timestamps they shouldn't control.
--   - The age check runs inside the database during sign-up, so calling the
--     Auth API directly can't skip it.
--   - It's safe to re-run while developing.

-- 0. Config
-- Minimum age in years. Change here AND in src/lib/constants.ts if ever needed.
create or replace function public.min_age_years()
returns int
language sql
immutable
as $$ select 18 $$;

-- 1. Types
-- Stool colours, in farm-friendly order. `red`, `black`, and `clay_pale` are
-- "check with a doctor" colours; the app surfaces a gentle note for them.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'stool_color') then
    create type public.stool_color as enum (
      'brown',        -- Rich Soil      (typical)
      'dark_brown',   -- Dark Loam      (typical)
      'light_brown',  -- Sandy Loam     (typical)
      'green',        -- Mossy          (often diet-related)
      'yellow',       -- Straw          (can mean fat malabsorption)
      'clay_pale',    -- Pale Clay      (see a doctor if persistent)
      'red',          -- Clay-Red       (see a doctor unless beets!)
      'black'         -- Charcoal       (see a doctor unless iron/bismuth)
    );
  end if;
end $$;

-- 2. Shared helper: keep `updated_at` honest
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 3. PROFILES, one row per auth user, created automatically on sign-up
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default 'Farmer'
                check (char_length(display_name) between 1 and 24),
  -- Birthdate is required and validated by handle_new_user() below.
  dob           date not null
                check (dob >= date '1900-01-01'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table  public.profiles     is 'Farmer profile; 1:1 with auth.users.';
comment on column public.profiles.dob is 'Birthdate; used for the 18+ age gate. Immutable after sign-up.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- DOB can never change after sign-up (prevents "age-washing" an account).
-- Column grants below already block it; this trigger is belt-and-braces in
-- case grants are ever loosened by mistake.
create or replace function public.protect_dob()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.dob is distinct from old.dob then
    raise exception 'dob is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_dob on public.profiles;
create trigger profiles_protect_dob
  before update on public.profiles
  for each row execute function public.protect_dob();

-- 4. SIGN-UP HOOK + AGE GATE
--    Runs inside the same transaction as the auth.users insert. Raising an
--    exception here ABORTS the sign-up entirely: no auth user, no profile.
--    The client sends dob via supabase.auth.signUp({ options: { data: { dob,
--    display_name } } }) which lands in raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- needs to insert into public.profiles
set search_path = ''      -- prevents search_path hijacking
as $$
declare
  v_dob   date;
  v_name  text;
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

  -- Sanitise display name: trim, cap at 24 chars, fall back to 'Farmer'.
  v_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 24);
  if v_name = '' then
    v_name := 'Farmer';
  end if;

  insert into public.profiles (id, display_name, dob)
  values (new.id, v_name, v_dob);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. POOP_LOGS, "The Crops"
create table if not exists public.poop_logs (
  id          uuid primary key default gen_random_uuid(),
  -- Defaults to the caller. Clients are NOT granted write access to this
  -- column, so it can never be spoofed to another user's id.
  user_id     uuid not null default auth.uid()
              references public.profiles (id) on delete cascade,

  -- Bristol Stool Scale 1–7.
  stool_type  smallint not null check (stool_type between 1 and 7),

  -- Derived bucket, handy for queries and farm logic. Never written by clients.
  category    text generated always as (
                case
                  when stool_type <= 2 then 'dry'      -- Dry Pebbles / Clumpy Soil
                  when stool_type <= 4 then 'healthy'  -- Perfect Log / Prize Crop
                  else                      'loose'    -- Loose Mud / Rainy Soil
                end
              ) stored,

  color       public.stool_color not null default 'brown',

  -- Whitelisted factor tags only; max 8 (that's every tag at once).
  factors     text[] not null default '{}'
              check (
                factors <@ array[
                  'hydrated', 'fiber', 'movement', 'coffee',
                  'stressed', 'poor_sleep', 'alcohol', 'spicy'
                ]::text[]
                and cardinality(factors) <= 8
              ),

  -- When it happened (user-chosen). Bounds are enforced by trigger below
  -- rather than CHECK, because CHECK must not depend on now().
  logged_at   timestamptz not null default now(),

  notes       text check (notes is null or char_length(notes) <= 500),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.poop_logs is 'Bowel movement logs ("crops"). Strictly private per user via RLS.';

-- Dashboard query: "my logs, newest first".
create index if not exists poop_logs_user_logged_at_idx
  on public.poop_logs (user_id, logged_at desc);

drop trigger if exists poop_logs_set_updated_at on public.poop_logs;
create trigger poop_logs_set_updated_at
  before update on public.poop_logs
  for each row execute function public.set_updated_at();

-- Time-window + rate-limit guard.
--   - logged_at may not be > 5 minutes in the future (clock-skew allowance)
--   - logged_at may not be > 1 year in the past
--   - max 50 logs per rolling 24h per user (stops scripted flooding)
create or replace function public.validate_poop_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.logged_at is distinct from old.logged_at then
    if new.logged_at > now() + interval '5 minutes' then
      raise exception 'logged_at cannot be in the future' using errcode = '22007';
    end if;
    if new.logged_at < now() - interval '1 year' then
      raise exception 'logged_at cannot be more than a year ago' using errcode = '22007';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if (
      select count(*)
      from public.poop_logs
      where user_id = new.user_id
        and created_at > now() - interval '24 hours'
    ) >= 50 then
      raise exception 'Daily log limit reached' using errcode = '53400';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists poop_logs_validate on public.poop_logs;
create trigger poop_logs_validate
  before insert or update on public.poop_logs
  for each row execute function public.validate_poop_log();

-- 6. PRIVILEGES, least privilege, column by column
--    Supabase grants broad table rights to anon/authenticated by default.
--    We wipe those and grant back only what the app actually needs.
revoke all on public.profiles  from anon, authenticated;
revoke all on public.poop_logs from anon, authenticated;

-- profiles: read own row; edit display_name only. No insert (trigger does it),
-- no delete (cascades from auth.users via delete_my_account()).
grant select                  on public.profiles to authenticated;
grant update (display_name)   on public.profiles to authenticated;

-- poop_logs: full CRUD on the user-controlled columns only.
grant select, delete on public.poop_logs to authenticated;
grant insert (stool_type, color, factors, logged_at, notes) on public.poop_logs to authenticated;
grant update (stool_type, color, factors, logged_at, notes) on public.poop_logs to authenticated;

-- 7. ROW LEVEL SECURITY
--    `(select auth.uid())` is wrapped in a sub-select so Postgres evaluates it
--    once per statement instead of once per row (Supabase perf guidance).
alter table public.profiles  enable row level security;
alter table public.profiles  force  row level security;
alter table public.poop_logs enable row level security;
alter table public.poop_logs force  row level security;

-- profiles
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using      ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- poop_logs
drop policy if exists "logs: read own"   on public.poop_logs;
drop policy if exists "logs: insert own" on public.poop_logs;
drop policy if exists "logs: update own" on public.poop_logs;
drop policy if exists "logs: delete own" on public.poop_logs;

create policy "logs: read own"
  on public.poop_logs for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "logs: insert own"
  on public.poop_logs for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "logs: update own"
  on public.poop_logs for update
  to authenticated
  using      ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

create policy "logs: delete own"
  on public.poop_logs for delete
  to authenticated
  using ( (select auth.uid()) = user_id );

-- 8. FARM SUMMARY RPC
--    Per-day totals in the caller's timezone, used to grow the farm.
--    SECURITY INVOKER -> it runs under the caller's RLS, so it can only ever
--    aggregate the caller's own rows.
--    Call:  supabase.rpc('get_farm_summary', { p_tz: 'America/Chicago', p_days: 30 })
create or replace function public.get_farm_summary(
  p_tz   text default 'UTC',
  p_days int  default 30
)
returns table (day date, logs int, healthy int, dry int, loose int)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  -- Validate inputs (bad tz would otherwise throw a cryptic error).
  if p_days < 1 or p_days > 366 then
    raise exception 'p_days must be between 1 and 366' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then
    p_tz := 'UTC';
  end if;

  return query
  select
    (l.logged_at at time zone p_tz)::date                as day,
    count(*)::int                                        as logs,
    count(*) filter (where l.category = 'healthy')::int  as healthy,
    count(*) filter (where l.category = 'dry')::int      as dry,
    count(*) filter (where l.category = 'loose')::int    as loose
  from public.poop_logs l
  where l.user_id = (select auth.uid())
    and l.logged_at >= now() - make_interval(days => p_days)
  group by 1
  order by 1 desc;
end;
$$;

-- 9. SELF-SERVICE ACCOUNT DELETION
--    Deletes the caller's auth user; profile + logs cascade away with it.
--    SECURITY DEFINER is required to touch auth.users, so it is locked to
--    auth.uid() and cannot target anyone else.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- 10. FUNCTION EXECUTE PRIVILEGES
--     New functions are executable by PUBLIC by default. Lock them down.
revoke execute on function public.handle_new_user()          from public, anon, authenticated;
revoke execute on function public.protect_dob()              from public, anon, authenticated;
revoke execute on function public.validate_poop_log()        from public, anon, authenticated;
revoke execute on function public.set_updated_at()           from public, anon, authenticated;

revoke execute on function public.get_farm_summary(text, int) from public, anon;
grant  execute on function public.get_farm_summary(text, int) to authenticated;

revoke execute on function public.delete_my_account()        from public, anon;
grant  execute on function public.delete_my_account()        to authenticated;

-- min_age_years() is harmless and lets the UI read the same constant.
grant execute on function public.min_age_years() to anon, authenticated;

-- Done. Next: run supabase/tests/rls_check.sql to prove isolation works.
