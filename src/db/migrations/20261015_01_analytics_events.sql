-- Phase 1: measurement.
--
-- Why a new table instead of user_events: user_events requires a user_id (so it
-- cannot record a visitor who has not signed up yet, which is exactly what the
-- students page and the start of signup need) and it also feeds the
-- recommendation engine, so marketing events do not belong in it. GA4 already
-- runs on the client but its data lives outside our database.
--
-- What this adds:
--   1. profiles.signup_src / signup_code: where the user came from, saved on the
--      user record at signup (from the ?src= and ?code= URL values).
--   2. analytics_events: one row per event, with src and code on every row.
--      No PII: the only identifier is user_id (null for visitors); `props` holds
--      short allowlisted tokens, never free text (enforced in the application,
--      see src/lib/analytics/events.ts).
--   3. handle_new_user() records attribution and emits signup_completed. The
--      analytics insert is wrapped so it can never block a signup.
--   4. apply_signup_attribution(): lets the auth callback attach attribution to
--      a brand-new account (Google sign-in cannot carry it in user metadata).
--   5. Views for the admin page: signups by src/code, week-2 and week-4 return
--      rate, saves per user, and event counts. Service role only.
--
-- Rollback (nothing here deletes existing data):
--   drop view if exists public.v_events_by_src_code, public.v_event_counts,
--     public.v_saves_by_src_code, public.v_saves_per_user,
--     public.v_return_rates_by_src_code, public.v_signups_by_src_code;
--   drop function if exists public.apply_signup_attribution(uuid, text, text);
--   drop table if exists public.analytics_events;
--   alter table public.profiles drop column signup_src, drop column signup_code;
--   (and restore handle_new_user from migration 20261014_01)

begin;

-- 1. Attribution on the user record ------------------------------------------
alter table public.profiles add column if not exists signup_src text;
alter table public.profiles add column if not exists signup_code text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_signup_src_format') then
    alter table public.profiles
      add constraint profiles_signup_src_format check (signup_src is null or signup_src ~ '^[a-z0-9._-]{1,64}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_signup_code_format') then
    alter table public.profiles
      add constraint profiles_signup_code_format check (signup_code is null or signup_code ~ '^[A-Z0-9._-]{1,64}$');
  end if;
end $$;

-- 2. The event table ------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event text not null check (event in (
    'students_page_view', 'signup_started', 'signup_completed', 'edu_verified',
    'first_place_view', 'place_saved', 'surprise_me_used', 'share_created',
    'share_link_opened', 'share_to_signup', 'promo_redeemed', 'premium_started'
  )),
  -- null for a visitor who has not signed up; set to null if the account is deleted
  user_id uuid references auth.users(id) on delete set null,
  src text check (src is null or src ~ '^[a-z0-9._-]{1,64}$'),
  code text check (code is null or code ~ '^[A-Z0-9._-]{1,64}$'),
  props jsonb not null default '{}'::jsonb,
  -- makes an event idempotent: first_place_view:<user>, premium_started:<subscription>
  dedupe_key text
);

create unique index if not exists uniq_analytics_dedupe on public.analytics_events (dedupe_key) where dedupe_key is not null;
create index if not exists idx_analytics_event_created on public.analytics_events (event, created_at desc);
create index if not exists idx_analytics_src_code on public.analytics_events (src, code, created_at desc);
create index if not exists idx_analytics_user on public.analytics_events (user_id, created_at desc) where user_id is not null;

alter table public.analytics_events enable row level security;
-- No policies: only the service role (which bypasses RLS) reads or writes.
revoke all on public.analytics_events from anon, authenticated;

-- 3. Signup: attribution + signup_completed ---------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_src text := lower(nullif(left(coalesce(new.raw_user_meta_data->>'src', ''), 64), ''));
  v_code text := upper(nullif(left(coalesce(new.raw_user_meta_data->>'code', ''), 64), ''));
begin
  if v_src is not null and v_src !~ '^[a-z0-9._-]{1,64}$' then v_src := null; end if;
  if v_code is not null and v_code !~ '^[A-Z0-9._-]{1,64}$' then v_code := null; end if;

  insert into public.profiles (user_id, first_name, signup_src, signup_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name', ''), v_src, v_code);

  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'none');

  -- Measurement must never be the reason an account cannot be created.
  begin
    insert into public.analytics_events (event, user_id, src, code, props, dedupe_key)
    values (
      'signup_completed', new.id, v_src, v_code,
      jsonb_build_object('method', coalesce(nullif(regexp_replace(lower(new.raw_app_meta_data->>'provider'), '[^a-z0-9_]', '', 'g'), ''), 'email')),
      'signup_completed:' || new.id::text
    )
    on conflict do nothing;
  exception when others then
    null;
  end;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 4. Attach attribution to a new account after the fact -----------------------------
-- Used by /auth/callback: a Google sign-in cannot carry src/code in user
-- metadata, so the callback reads the attribution cookie and calls this. It only
-- touches an account that is brand new (30 minutes) and has no attribution yet,
-- so it cannot be used to rewrite an existing user's history.
create or replace function public.apply_signup_attribution(p_user uuid, p_src text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src text := lower(nullif(left(coalesce(p_src, ''), 64), ''));
  v_code text := upper(nullif(left(coalesce(p_code, ''), 64), ''));
  v_updated integer;
begin
  if v_src is not null and v_src !~ '^[a-z0-9._-]{1,64}$' then v_src := null; end if;
  if v_code is not null and v_code !~ '^[A-Z0-9._-]{1,64}$' then v_code := null; end if;
  if v_src is null and v_code is null then return false; end if;

  update public.profiles
     set signup_src = v_src, signup_code = v_code
   where user_id = p_user
     and signup_src is null and signup_code is null
     and created_at > now() - interval '30 minutes';
  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    update public.analytics_events
       set src = v_src, code = v_code
     where event = 'signup_completed' and user_id = p_user and src is null and code is null;
  end if;
  return v_updated > 0;
end;
$$;

revoke all on function public.apply_signup_attribution(uuid, text, text) from public, anon, authenticated;
grant execute on function public.apply_signup_attribution(uuid, text, text) to service_role;

-- 5. Views for the admin page ---------------------------------------------------------
-- "(none)" stands for an account or event with no src or code.

-- Signups by source and code (the user record is the source of truth).
create or replace view public.v_signups_by_src_code as
select
  coalesce(p.signup_src, '(none)') as src,
  coalesce(p.signup_code, '(none)') as code,
  count(*) as signups,
  count(*) filter (where p.created_at > now() - interval '7 days') as signups_7d,
  count(*) filter (where p.created_at > now() - interval '30 days') as signups_30d,
  min(p.created_at) as first_signup_at,
  max(p.created_at) as last_signup_at
from public.profiles p
group by 1, 2;

-- Return rate. A user "returned" in week 2 if they did something (viewed a place,
-- saved, used Surprise Me, shared, redeemed) 7 to 14 days after signing up, and
-- in week 4 if they did 21 to 28 days after. Only users whose window has fully
-- passed count (14 days for week 2, 28 for week 4), so a recent cohort shows
-- "not yet eligible" instead of a misleadingly low rate. A visit that only
-- scrolls a feed is not an action and is not counted (see the admin page note).
create or replace view public.v_return_rates_by_src_code as
with cohort as (
  select user_id, created_at as signup_at,
         coalesce(signup_src, '(none)') as src, coalesce(signup_code, '(none)') as code
  from public.profiles
),
activity as (
  select user_id, created_at from public.user_events
  union all
  select user_id, created_at from public.analytics_events
  where user_id is not null
    and event in ('first_place_view', 'place_saved', 'surprise_me_used', 'share_created', 'promo_redeemed')
),
flags as (
  select c.src, c.code,
    (c.signup_at <= now() - interval '14 days') as w2_eligible,
    (c.signup_at <= now() - interval '28 days') as w4_eligible,
    exists (select 1 from activity a where a.user_id = c.user_id
              and a.created_at >= c.signup_at + interval '7 days'
              and a.created_at <  c.signup_at + interval '14 days') as w2_returned,
    exists (select 1 from activity a where a.user_id = c.user_id
              and a.created_at >= c.signup_at + interval '21 days'
              and a.created_at <  c.signup_at + interval '28 days') as w4_returned
  from cohort c
)
select
  src, code,
  count(*) as users,
  count(*) filter (where w2_eligible) as week2_eligible,
  count(*) filter (where w2_eligible and w2_returned) as week2_returned,
  round(100.0 * count(*) filter (where w2_eligible and w2_returned)
        / nullif(count(*) filter (where w2_eligible), 0), 1) as week2_return_pct,
  count(*) filter (where w4_eligible) as week4_eligible,
  count(*) filter (where w4_eligible and w4_returned) as week4_returned,
  round(100.0 * count(*) filter (where w4_eligible and w4_returned)
        / nullif(count(*) filter (where w4_eligible), 0), 1) as week4_return_pct
from flags
group by src, code;

-- Saves per user: one row per user (for SQL; the admin page shows the summary).
create or replace view public.v_saves_per_user as
select
  p.user_id,
  coalesce(p.signup_src, '(none)') as src,
  coalesce(p.signup_code, '(none)') as code,
  p.created_at as signup_at,
  count(s.id) as saves,
  min(s.created_at) as first_save_at
from public.profiles p
left join public.saved_experiences s on s.user_id = p.user_id
group by p.user_id, p.signup_src, p.signup_code, p.created_at;

create or replace view public.v_saves_by_src_code as
select
  src, code,
  count(*) as users,
  count(*) filter (where saves > 0) as users_with_save,
  round(100.0 * count(*) filter (where saves > 0) / nullif(count(*), 0), 1) as users_with_save_pct,
  sum(saves) as total_saves,
  round(avg(saves), 2) as saves_per_user,
  percentile_cont(0.5) within group (order by saves) as median_saves
from public.v_saves_per_user
group by src, code;

create or replace view public.v_event_counts as
select
  event,
  count(*) filter (where created_at > now() - interval '7 days') as last_7d,
  count(*) filter (where created_at > now() - interval '30 days') as last_30d,
  count(*) as total
from public.analytics_events
group by event;

create or replace view public.v_events_by_src_code as
select
  coalesce(src, '(none)') as src, coalesce(code, '(none)') as code, event, count(*) as events
from public.analytics_events
group by 1, 2, 3;

-- Aggregates only, but they describe users: service role only.
revoke all on public.v_signups_by_src_code, public.v_return_rates_by_src_code, public.v_saves_per_user,
  public.v_saves_by_src_code, public.v_event_counts, public.v_events_by_src_code from anon, authenticated;
grant select on public.v_signups_by_src_code, public.v_return_rates_by_src_code, public.v_saves_per_user,
  public.v_saves_by_src_code, public.v_event_counts, public.v_events_by_src_code to service_role;

commit;
