-- Quiet days: a check-in that says "no bowel movement today".
--
-- It's its own table because a quiet day isn't a stool log (no type, no
-- colour), but it's still useful data and it keeps the check-in streak going.
-- One row per user per local calendar day.
--
-- Run after 0001, then try supabase/tests/quiet_days_check.sql.

create table if not exists public.quiet_days (
  id          uuid primary key default gen_random_uuid(),
  -- Defaults to the caller; clients get no write access to this column.
  user_id     uuid not null default auth.uid()
              references public.profiles (id) on delete cascade,
  -- The user's LOCAL calendar day (sent by the app as YYYY-MM-DD), so it
  -- lines up with their own midnight rather than the server's.
  day         date not null,
  created_at  timestamptz not null default now(),
  -- One quiet day per user per day (also serves as the lookup index).
  constraint quiet_days_one_per_day unique (user_id, day)
);

comment on table public.quiet_days is 'Days the user checked in with no bowel movement. Private per user via RLS.';

-- Date-window guard (trigger, because CHECK must not depend on current_date).
--   - up to 1 day ahead of the server's date (users east of UTC are "tomorrow")
--   - no more than a year back
create or replace function public.validate_quiet_day()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.day > current_date + 1 then
    raise exception 'quiet day cannot be in the future' using errcode = '22007';
  end if;
  if new.day < current_date - 366 then
    raise exception 'quiet day cannot be more than a year ago' using errcode = '22007';
  end if;
  return new;
end;
$$;

drop trigger if exists quiet_days_validate on public.quiet_days;
create trigger quiet_days_validate
  before insert on public.quiet_days
  for each row execute function public.validate_quiet_day();

revoke execute on function public.validate_quiet_day() from public, anon, authenticated;

-- Privileges: read + delete own rows, insert only the `day` column.
-- No update (undo = delete, then re-insert).
revoke all on public.quiet_days from anon, authenticated;
grant select, delete on public.quiet_days to authenticated;
grant insert (day)   on public.quiet_days to authenticated;

-- Row level security
alter table public.quiet_days enable row level security;
alter table public.quiet_days force  row level security;

drop policy if exists "quiet: read own"   on public.quiet_days;
drop policy if exists "quiet: insert own" on public.quiet_days;
drop policy if exists "quiet: delete own" on public.quiet_days;

create policy "quiet: read own"
  on public.quiet_days for select
  to authenticated
  using ( (select auth.uid()) = user_id );

create policy "quiet: insert own"
  on public.quiet_days for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

create policy "quiet: delete own"
  on public.quiet_days for delete
  to authenticated
  using ( (select auth.uid()) = user_id );
