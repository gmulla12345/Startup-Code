-- Phase 6: the "Local pick" badge.
--
-- A place can carry a small badge, "Local pick", that the OWNER sets by hand: nothing computes it and nothing
-- infers it. It is a judgement (this is somewhere a person who lives here would send you), so it is only ever
-- shown for a place that has a row here with local_pick true. There are no counts and no scores behind it.
--
--   place_id    the Google place id and nothing else from Google (Google allows place_id to be kept; names, photos,
--               ratings and addresses are fetched live and never stored). The same id the lists and shared links use.
--   local_pick  the boolean the owner sets. Default true, so adding a row marks the place; set it to false (or delete
--               the row) to take the badge off.
--
-- To mark a place, in the Supabase SQL editor (the id comes from Google's Place ID Finder):
--   insert into public.local_picks (place_id) values ('ChIJ...')
--     on conflict (place_id) do update set local_pick = true;
-- To take it off:
--   update public.local_picks set local_pick = false where place_id = 'ChIJ...';
--
-- Closed to every browser key (no policy, no grant): the server reads it with the service role when it draws a list
-- or a place, and shows only the yes or no, never the table.
--
-- Additive: creates one table and its updated_at trigger; changes and deletes nothing.
--
-- Rollback:
--   drop trigger if exists trg_local_picks_updated_at on public.local_picks;
--   drop table if exists public.local_picks;

begin;

create table if not exists public.local_picks (
  -- (length and shape are separate checks: Postgres caps a regex repeat count at 255)
  place_id text primary key check (char_length(place_id) between 10 and 300 and place_id ~ '^[A-Za-z0-9_-]+$'),
  local_pick boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.local_picks enable row level security;
revoke all on public.local_picks from anon, authenticated;

drop trigger if exists trg_local_picks_updated_at on public.local_picks;
create trigger trg_local_picks_updated_at before update on public.local_picks
  for each row execute function public.set_updated_at();

commit;
