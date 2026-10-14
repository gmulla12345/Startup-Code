-- Phase 4: share links. A public, unguessable page for one place or one plan.
--
-- A person shares a place or a plan, optionally adds a short note, and chooses
-- whether their first name appears. The result is a link anyone who has it can
-- open. They can turn it off at any time, which DELETES the row, so a turned-off
-- link and one that never existed are the same 404 and nothing is kept.
--
--   token        16 random bytes from the server, as 22 URL-safe characters. It is
--                the only way to find a link: not derived from anything, so it
--                cannot be guessed or enumerated.
--   place_id     the ONLY Google Places value stored (Google allows place_id to be
--                kept; names, photos, ratings and addresses are fetched live when a
--                page is built and are never stored here).
--   itinerary_id the person's own plan. The page reads the plan on the server.
--   note         the sharer's own words, up to 140 characters.
--   show_name    false unless the sharer ticks the box. Only their first name is
--                ever shown, never a surname, email or id.
--
-- Private by default: closed to every browser key (no policy, no grants), read and
-- written only by the server with the service role, which checks ownership. The
-- link is removed with the account (on delete cascade). One live link per person per
-- target, so sharing the same thing twice updates the link instead of making more.
--
-- Also adds usage_units_for_feature_since(), which lets the server count Google
-- calls made for visitors with no account (a shared link opened by a non-user), so a
-- daily ceiling can protect the bill from a spike of strangers.
--
-- Additive: creates one table, one function and two indexes; changes and deletes nothing.
--
-- Rollback:
--   drop function if exists public.usage_units_for_feature_since(text, timestamptz);
--   drop index if exists public.idx_api_usage_feature_created;
--   drop table if exists public.share_links;

begin;

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{22}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('place', 'plan')),
  -- (length and shape are separate checks: Postgres caps a regex repeat count at 255)
  place_id text check (place_id is null or (char_length(place_id) between 10 and 300 and place_id ~ '^[A-Za-z0-9_-]+$')),
  itinerary_id uuid references public.itineraries(id) on delete cascade,
  note text check (note is null or char_length(note) between 1 and 140),
  show_name boolean not null default false,
  created_at timestamptz not null default now(),
  constraint share_links_one_target check (
    (kind = 'place' and place_id is not null and itinerary_id is null)
    or (kind = 'plan' and itinerary_id is not null and place_id is null)
  )
);

create unique index if not exists uniq_share_links_place on public.share_links (user_id, place_id) where kind = 'place';
create unique index if not exists uniq_share_links_plan on public.share_links (user_id, itinerary_id) where kind = 'plan';
create index if not exists idx_share_links_user on public.share_links (user_id);

alter table public.share_links enable row level security;
revoke all on public.share_links from anon, authenticated;

-- Google calls (units) made for one feature today, across everyone, signed in or not.
create index if not exists idx_api_usage_feature_created on public.api_usage_events (feature, created_at);

create or replace function public.usage_units_for_feature_since(p_feature text, p_since timestamptz)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(e.units), 0)::bigint
  from public.api_usage_events e
  where e.feature = p_feature
    and e.bucket = 'places'
    and e.created_at >= p_since
    and e.outcome = 'ok'
$$;

revoke all on function public.usage_units_for_feature_since(text, timestamptz) from public, anon, authenticated;
grant execute on function public.usage_units_for_feature_since(text, timestamptz) to service_role;

commit;
