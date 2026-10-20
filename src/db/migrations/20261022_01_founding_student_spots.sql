-- Phase 4a: founding student spots. A limited number of people may take the student price.
--
-- The owner sets two numbers, in app_config, and can change them at any time in the Supabase
-- table editor (no deploy needed):
--
--   founding_student_cap         how many students may hold the student price at once. Absent
--                                means no limit: the student plan is open to every verified student.
--   founding_student_show_below  show "N spots left" only when fewer than this many remain.
--                                Absent means the number is never shown.
--
-- A spot is held by an account with a live subscription at the student price (active, trialing
-- or past due). Someone who is checking out also holds one for a short while, so two people
-- cannot both be sold the last spot: reserve_founding_slot() counts and reserves in one step
-- under a lock. A reservation that is never completed simply runs out.
--
-- Private: all three objects are closed to every browser key (no policy, no grants); the server
-- reads and writes with the service role. A reservation stores an account id and a time, nothing
-- else, and goes with the account (on delete cascade).
--
-- Additive: creates two tables and two functions; changes and deletes nothing.
--
-- Rollback:
--   drop function if exists public.reserve_founding_slot(uuid, text, integer, integer);
--   drop function if exists public.founding_counts(text);
--   drop table if exists public.founding_reservations;
--   drop table if exists public.app_config;

begin;

create table if not exists public.app_config (
  key text primary key check (key ~ '^[a-z0-9_]{1,64}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.founding_reservations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
alter table public.founding_reservations enable row level security;
revoke all on public.app_config from anon, authenticated;
revoke all on public.founding_reservations from anon, authenticated;

-- How many spots are held: by subscriptions at the student price, and by checkouts in progress.
create or replace function public.founding_counts(p_price_id text)
returns table (out_holders integer, out_reserved integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::integer from public.subscriptions s
      where s.stripe_price_id = p_price_id and s.status in ('active', 'trialing', 'past_due')),
    (select count(*)::integer from public.founding_reservations r where r.expires_at > now());
$$;

-- Takes a spot for this person for p_minutes if one is free, and says whether it did. Counting and
-- reserving happen under one lock, so the last spot cannot be sold twice. The person's own
-- reservation or subscription never counts against them.
create or replace function public.reserve_founding_slot(p_user uuid, p_price_id text, p_cap integer, p_minutes integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_holders integer;
  v_reserved integer;
begin
  if p_cap is null or p_cap < 1 then
    raise exception 'the cap must be at least 1' using errcode = '22023';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 1440 then
    raise exception 'a reservation lasts 1 to 1440 minutes' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('founding_student_spots'));

  -- Housekeeping: reservations that ran out more than a day ago are of no further use.
  delete from public.founding_reservations where expires_at <= now() - interval '1 day';

  select count(*)::integer into v_holders
    from public.subscriptions s
   where s.stripe_price_id = p_price_id and s.status in ('active', 'trialing', 'past_due') and s.user_id <> p_user;
  select count(*)::integer into v_reserved
    from public.founding_reservations r
   where r.expires_at > now() and r.user_id <> p_user;

  if v_holders + v_reserved >= p_cap then
    return false;
  end if;

  insert into public.founding_reservations (user_id, expires_at)
  values (p_user, now() + make_interval(mins => p_minutes))
  on conflict (user_id) do update set expires_at = excluded.expires_at, created_at = now();
  return true;
end;
$$;

revoke all on function public.founding_counts(text) from public, anon, authenticated;
revoke all on function public.reserve_founding_slot(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.founding_counts(text) to service_role;
grant execute on function public.reserve_founding_slot(uuid, text, integer, integer) to service_role;

commit;
