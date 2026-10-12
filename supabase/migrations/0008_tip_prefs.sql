-- Tips and reminders: two on/off choices, each person's own.
--
-- The tips themselves are picked in the browser from the person's own logs,
-- so nothing about them is stored here: only whether the person wants tips and
-- whether they want reminders. Both start ON.
--
-- The column grants follow the pattern of the other profile choices: a
-- signed-in user may change these two columns on their own row (the row-level
-- security policy already limits updates to that row) and still not id, dob,
-- friend_code or anything else.
--
-- Run after 0001-0007, then try supabase/tests/tips_prefs_check.sql.
-- Safe to run more than once.

alter table public.profiles
  add column if not exists tips_enabled      boolean not null default true,
  add column if not exists reminders_enabled boolean not null default true;

comment on column public.profiles.tips_enabled is
  'Show the personalised tip card and Mia''s tip lines. The person''s own choice.';
comment on column public.profiles.reminders_enabled is
  'Show gentle in-app reminders near the person''s usual time. The person''s own choice.';

grant update (tips_enabled, reminders_enabled) on public.profiles to authenticated;
