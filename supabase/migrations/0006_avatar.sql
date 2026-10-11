-- Avatars: each person's own little pixel character, built in the app from a
-- fixed set of parts. What's stored is only the list of chosen part ids:
--
--   {"v":1,"skin":"skin_3","hair":"hair_short","hairColor":"hc_5",
--    "outfit":"outfit_hoodie","outfitColor":"oc_2","eyes":"eyes_happy",
--    "accessory":"acc_none","bg":"bg_4"}
--
-- NULL means "not made one yet"; the app then draws a default worked out from
-- the user's id, so nobody needs a row filled in.
--
-- ON PURPOSE, the part ids are NOT whitelisted here. Everywhere else in this
-- project a rule lives twice (Zod in the app, a CHECK or trigger here). This
-- is the one deliberate exception: the catalogue of parts will keep growing
-- once the shop exists, and every new hat would need a migration. So the
-- database checks the SHAPE strictly (below) and the app checks the ids
-- (AvatarSchema in src/lib/validation.ts). An id the app doesn't know simply
-- draws as that slot's default. When paid parts arrive, "does this user own
-- it" must be checked on the server at save time; this trigger won't do it.
--
-- Run after 0001-0005, then try supabase/tests/avatar_check.sql.
-- Safe to run more than once.

alter table public.profiles add column if not exists avatar jsonb;

comment on column public.profiles.avatar is
  'Chosen avatar part ids (shape checked by validate_avatar). NULL = default avatar.';

create or replace function public.validate_avatar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  c_keys constant text[] := array['v', 'skin', 'hair', 'hairColor', 'outfit', 'outfitColor', 'eyes', 'accessory', 'bg'];
  k text;
  v jsonb;
begin
  if new.avatar is null then
    return new;
  end if;

  if jsonb_typeof(new.avatar) <> 'object' then
    raise exception 'avatar must be an object' using errcode = '22023';
  end if;
  -- A real avatar is around 200 bytes. This stops the column being used to
  -- stash anything else.
  if pg_column_size(new.avatar) >= 300 then
    raise exception 'avatar is too large' using errcode = '22023';
  end if;
  -- Exactly these keys: all present, and no others.
  if not (new.avatar ?& c_keys)
     or (select count(*) from jsonb_object_keys(new.avatar)) <> cardinality(c_keys) then
    raise exception 'avatar has the wrong keys' using errcode = '22023';
  end if;
  if new.avatar -> 'v' <> '1'::jsonb then
    raise exception 'unknown avatar version' using errcode = '22023';
  end if;
  -- Every choice is a short, plain id. Which ids exist is the app's business.
  for k, v in select * from jsonb_each(new.avatar) loop
    if k <> 'v' and (jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[a-z0-9_]{1,24}$') then
      raise exception 'avatar part ids must be short plain strings' using errcode = '22023';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists profiles_validate_avatar on public.profiles;
create trigger profiles_validate_avatar
  before insert or update of avatar on public.profiles
  for each row execute function public.validate_avatar();

revoke execute on function public.validate_avatar() from public, anon, authenticated;

-- Users may change their own avatar (the "update own" policy from 0001 still
-- decides whose row). Still not: id, dob, friend_code or the timestamps.
grant update (avatar) on public.profiles to authenticated;

-- Friends see each other's avatar, the same way they see each other's name:
-- always, whatever the sharing level. This returns the avatar (and nothing
-- else) for people I'm friends with, people in a pending request with me, and
-- anyone whose nudge is waiting for me. Never a stranger's.
create or replace function public.get_friend_avatars()
returns table (user_id uuid, avatar jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.avatar
  from public.profiles p
  where p.id in (
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from public.friendships f
    where auth.uid() in (f.requester_id, f.addressee_id)
    union
    select n.sender_id
    from public.nudges n
    where n.recipient_id = auth.uid()
      and n.delivered
      and n.seen_at is null
      and n.created_at > now() - interval '48 hours'
  )
$$;

revoke execute on function public.get_friend_avatars() from public, anon;
grant  execute on function public.get_friend_avatars() to authenticated;

-- Done. Next: run supabase/tests/avatar_check.sql.
