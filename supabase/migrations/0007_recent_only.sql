-- Catch up on yesterday, and only yesterday.
--
-- Until now a log could be back-dated a year and a quiet day could be added
-- for any day of the past year. That meant a missed day could always be
-- filled in later, so a broken streak never really stayed broken. From here:
--
--   logs        today or yesterday only
--   quiet days  today or yesterday only
--
-- The database doesn't know anyone's timezone, so it can't say exactly when
-- "yesterday" began for the person asking. It uses bounds that are right for
-- every timezone, and the app narrows them to the user's own calendar day:
--
--   logs        not older than 50 hours. Wherever you are, your yesterday
--               began between 24 and 48 hours ago (49 on the day the clocks
--               go back), so 50 covers everyone.
--   quiet days  the server's date minus 2, up to plus 1. That is today and
--               yesterday with one UTC day of slack either way.
--
-- These limits are for people using the app (requests that carry a signed-in
-- user). Statements run by the owner in the SQL editor, with no user, keep
-- the old one-year rule, so data can be restored and test data set up.
--
-- Rows that already exist are left exactly as they are, and can still be
-- deleted by their owner.
--
-- This replaces two functions from 0001 and 0002 (same names, same triggers).
-- Run after 0001-0006, then try supabase/tests/recent_only_check.sql.
-- Safe to run more than once.

-- 1. LOGS: same guard as 0001, with the tighter window for app users.
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
    if auth.uid() is not null then
      if new.logged_at < now() - interval '50 hours' then
        raise exception 'logged_at cannot be before yesterday' using errcode = '22007';
      end if;
    elsif new.logged_at < now() - interval '1 year' then
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

revoke execute on function public.validate_poop_log() from public, anon, authenticated;

-- 2. QUIET DAYS: how many have been marked lately.
--    Undoing a quiet day deletes its row, so the rows themselves can't be
--    counted. Each mark leaves a line here instead. Nobody can read or write
--    this table from outside; only the trigger below touches it.
create table if not exists public.quiet_day_writes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists quiet_day_writes_user_idx on public.quiet_day_writes (user_id, created_at desc);

revoke all on public.quiet_day_writes from anon, authenticated;
alter table public.quiet_day_writes enable row level security;
alter table public.quiet_day_writes force  row level security;
-- No policies: no client access at all.

-- Same guard as 0002, plus the window and a limit on marks per day.
-- SECURITY DEFINER only so it can write the counter table above.
create or replace function public.validate_quiet_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.day > current_date + 1 then
    raise exception 'quiet day cannot be in the future' using errcode = '22007';
  end if;

  if auth.uid() is not null then
    if new.day < current_date - 2 then
      raise exception 'quiet day cannot be before yesterday' using errcode = '22007';
    end if;

    -- A soft guardrail, not a security boundary: with only two days to mark,
    -- nobody needs more than a handful of tries. It just stops a script
    -- hammering mark/undo. 5 marks per rolling 24 hours.
    delete from public.quiet_day_writes
    where user_id = new.user_id and created_at < now() - interval '2 days';
    if (
      select count(*)
      from public.quiet_day_writes
      where user_id = new.user_id
        and created_at > now() - interval '24 hours'
    ) >= 5 then
      raise exception 'Daily quiet-day limit reached' using errcode = '53400';
    end if;
    insert into public.quiet_day_writes (user_id) values (new.user_id);
  elsif new.day < current_date - 366 then
    raise exception 'quiet day cannot be more than a year ago' using errcode = '22007';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_quiet_day() from public, anon, authenticated;

-- Done. Next: run supabase/tests/recent_only_check.sql.
