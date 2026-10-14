-- Phase 0.2: log every external Places / Claude call.
--
-- One row per billable external request: which provider and operation, which
-- feature triggered it, the Claude model and token counts, and an ESTIMATED
-- cost (list price, ignoring Google's monthly free caps). Also the source for
-- the per-user daily limits in src/lib/config/usage.ts.
--
-- Privacy: no email, name, IP, or query text is stored. user_id is the only
-- identifier, and it is set to null if the account is deleted, so the cost
-- history survives while the link to a person does not.
--
-- Access: written only by the server with the service role. A signed-in user
-- may read their own rows (RLS), nobody else's; the logged-out role has no
-- access.

create table if not exists public.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('anthropic', 'google_places', 'google_geocoding')),
  -- 'ai' counts toward the daily Claude limit, 'places' toward the daily Maps limit
  bucket text not null check (bucket in ('ai', 'places')),
  -- messages | nearby_search | place_details | place_photo | geocode | reverse_geocode
  operation text not null,
  -- the product surface that triggered it: surprise_me, home, weekend_plan, ...
  feature text not null default 'unknown',
  model text,
  tokens_in integer,
  tokens_out integer,
  units integer not null default 1,
  est_cost_usd numeric(12, 6) not null default 0,
  -- ok: counted toward limits. error: the provider call failed (not counted).
  -- blocked: refused locally because a daily limit was reached (not counted).
  outcome text not null default 'ok' check (outcome in ('ok', 'error', 'blocked'))
);

create index if not exists idx_api_usage_user_created on public.api_usage_events (user_id, created_at desc);
create index if not exists idx_api_usage_created on public.api_usage_events (created_at desc);

alter table public.api_usage_events enable row level security;

drop policy if exists "read own usage" on public.api_usage_events;
create policy "read own usage" on public.api_usage_events
  for select using (auth.uid() = user_id);

-- No insert/update/delete policy exists, so only the service role can write.
-- Belt and braces: also remove the table privileges.
revoke all on public.api_usage_events from anon;
revoke insert, update, delete, truncate on public.api_usage_events from authenticated;

-- Today's counted units per bucket for one user. Called by the server (service
-- role) before an external call to enforce the daily limits.
create or replace function public.usage_units_since(p_user uuid, p_since timestamptz)
returns table (bucket text, units bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.bucket, coalesce(sum(e.units), 0)::bigint
  from public.api_usage_events e
  where e.user_id = p_user
    and e.created_at >= p_since
    and e.outcome = 'ok'
  group by e.bucket
$$;

revoke all on function public.usage_units_since(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.usage_units_since(uuid, timestamptz) to service_role;
