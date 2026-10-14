-- Phase 0.1: close the public exposure of social_profiles / follows.
--
-- What was exposed (verified against production on 2026-10-14):
--   * social_profiles: policy "public social profiles" allowed anyone,
--     INCLUDING the logged-out public API key, to read every row where
--     is_public = true (the column defaulted to true). Each row is a user's
--     first name (display_name), a generated handle ("user_" + 8 characters of
--     their account id), and follower_count / following_count. 10 of 10 rows
--     were readable.
--   * follows: policy "read follows" was `using (true)`, so the whole follow
--     graph was readable by anyone. (0 rows today.)
--   * shares: already owner-only. Unchanged apart from removing anon's grant.
--   * Every new signup got a social_profiles row from handle_new_user().
--
-- What this does (no row is deleted, no table is dropped):
--   1. social_profiles may be read only by its owner.
--   2. follows may be read only by the two people in the relationship.
--   3. The logged-out (anon) role loses all privileges on the three tables.
--   4. social_profiles.is_public defaults to false, and existing rows are set
--      to false (a visibility flag, nothing removed).
--   5. handle_new_user() no longer creates a social_profiles row at signup.
--
-- Existing social_profiles rows are left in place. Dropping the tables is a
-- separate, destructive step that needs explicit approval.
--
-- Rollback (only if something unexpected breaks; this RE-OPENS the exposure):
--   drop policy "own social profile" on public.social_profiles;
--   create policy "public social profiles" on public.social_profiles
--     for select using (is_public = true or auth.uid() = user_id);
--   drop policy "read own follows" on public.follows;
--   create policy "read follows" on public.follows for select using (true);
--   grant all on public.social_profiles, public.follows, public.shares to anon;
--   (and restore the social_profiles insert in handle_new_user from schema.sql
--   history)

begin;

-- 1. social_profiles: owner only
drop policy if exists "public social profiles" on public.social_profiles;
drop policy if exists "own social profile" on public.social_profiles;
create policy "own social profile" on public.social_profiles
  for select using (auth.uid() = user_id);

-- 4. most-private default; flip existing rows' flag (data kept)
alter table public.social_profiles alter column is_public set default false;
update public.social_profiles set is_public = false where is_public;

-- 2. follows: participants only
drop policy if exists "read follows" on public.follows;
drop policy if exists "read own follows" on public.follows;
create policy "read own follows" on public.follows
  for select using (auth.uid() = follower_id or auth.uid() = following_id);

-- 3. logged-out visitors get nothing on these tables
revoke all on public.social_profiles from anon;
revoke all on public.follows from anon;
revoke all on public.shares from anon;

-- 5. signups create a profile and a subscription row, and nothing social
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, first_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name', ''));

  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'none');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

commit;
