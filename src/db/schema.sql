-- =========================================================================
-- Zolo — core database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- Idempotent: safe to re-run.
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- profiles — one row per auth.users row
-- -------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text,
  age_range text check (age_range in ('18-20','21-24','25-27','28-30','31-35','36+')),
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  avatar_url text,
  bio text,
  interests text[] not null default '{}',
  lifestyle_goals text[] not null default '{}',
  personality jsonb not null default '{
    "spontaneousVsPlanned": 50,
    "quietVsSocial": 50,
    "adventurousVsComfortable": 50,
    "budgetVsLuxury": 50,
    "familiarVsNovel": 50
  }'::jsonb,
  preferences jsonb not null default '{
    "budgetLevel": "medium",
    "travelFrequency": "sometimes",
    "maxDistanceMiles": 25,
    "preferredDurationMinutes": 120,
    "indoorOutdoor": "either",
    "socialMode": "either",
    "timeOfDay": "any"
  }'::jsonb,
  onboarding_completed boolean not null default false,
  onboarding_step int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);

-- -------------------------------------------------------------------------
-- experience_categories
-- -------------------------------------------------------------------------
create table if not exists public.experience_categories (
  id text primary key,
  label text not null,
  icon text,
  sort_order int not null default 0
);

-- -------------------------------------------------------------------------
-- experiences — the core discoverable catalog
-- -------------------------------------------------------------------------
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  short_description text not null default '',
  category text not null references public.experience_categories(id),
  tags text[] not null default '{}',
  images text[] not null default '{}',
  city text not null,
  region text,
  country text not null default 'USA',
  address text,
  latitude double precision not null,
  longitude double precision not null,
  price_level text not null default 'medium' check (price_level in ('free','low','medium','high','luxury')),
  price_estimate numeric(10,2),
  price_currency text not null default 'USD',
  duration_minutes int,
  indoor_outdoor text not null default 'either' check (indoor_outdoor in ('indoor','outdoor','either')),
  social_mode text not null default 'either' check (social_mode in ('solo','group','either')),
  best_time_of_day text not null default 'any' check (best_time_of_day in ('morning','afternoon','evening','night','any')),
  rating numeric(2,1),
  review_count int not null default 0,
  is_hidden_gem boolean not null default false,
  is_featured boolean not null default false,
  is_premium boolean not null default false,
  external_booking_url text,
  source_provider text not null default 'manual' check (source_provider in ('mock','google_places','manual','eventbrite')),
  source_id text,
  requirements text[] not null default '{}',
  availability text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiences_city on public.experiences(city);
create index if not exists idx_experiences_category on public.experiences(category);
create index if not exists idx_experiences_location on public.experiences(latitude, longitude);
create index if not exists idx_experiences_tags on public.experiences using gin(tags);
create index if not exists idx_experiences_featured on public.experiences(is_featured) where is_featured = true;

-- -------------------------------------------------------------------------
-- reviews
-- -------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  -- text, not uuid: see the migration block further down for why (same
  -- reason as itinerary_items.experience_id above). No write path exists
  -- for this table yet (reviews are read-only today, see
  -- lib/repositories/reviews.ts), so this is currently latent rather than
  -- actively broken — fixed anyway to close out the same bug class
  -- consistently instead of leaving one column behind.
  experience_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Zolo user',
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_experience on public.reviews(experience_id);

-- -------------------------------------------------------------------------
-- saved_experiences
-- -------------------------------------------------------------------------
create table if not exists public.saved_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- text, not uuid: see the migration block further down for why (same
  -- reason as itinerary_items.experience_id above).
  experience_id text not null,
  collection text not null default 'Saved',
  status text not null default 'saved' check (status in ('saved','planned','completed')),
  notes text,
  -- Denormalized from the Experience at save time (not looked up via a join
  -- into public.experiences at read time) so taste-learning works for
  -- Google Places saves too — that table is empty in production, so a join
  -- would silently return nothing for the vast majority of real saves. See
  -- getSavedTagCounts()/getSavedCategoryCounts() in lib/repositories/saved.ts.
  tags text[] not null default '{}',
  category text,
  created_at timestamptz not null default now(),
  unique(user_id, experience_id, collection)
);

create index if not exists idx_saved_user on public.saved_experiences(user_id);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'saved_experiences' and column_name = 'tags'
  ) then
    alter table public.saved_experiences add column tags text[] not null default '{}';
    alter table public.saved_experiences add column category text;
  end if;
end $$;

-- -------------------------------------------------------------------------
-- user_events — behavioral tracking that powers personalization
-- -------------------------------------------------------------------------
create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  -- text, not uuid: see the migration block further down for why (same
  -- reason as itinerary_items.experience_id above).
  experience_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_events_user on public.user_events(user_id, created_at desc);
create index if not exists idx_user_events_type on public.user_events(event_type);

-- -------------------------------------------------------------------------
-- recommendations — generated + cached AI/hybrid recommendations
-- -------------------------------------------------------------------------
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete cascade,
  match_score numeric(5,2) not null,
  reasoning text not null default '',
  estimated_cost numeric(10,2),
  estimated_duration_minutes int,
  recommended_time timestamptz,
  confidence numeric(3,2) not null default 0.5,
  surface_context text not null default 'for_you'
    check (surface_context in ('for_you','nearby','weekend','hidden_gem','surprise_me','because_you_like')),
  created_at timestamptz not null default now()
);

create index if not exists idx_recommendations_user on public.recommendations(user_id, created_at desc);

-- -------------------------------------------------------------------------
-- itineraries + itinerary_items — Weekend Planner / Travel Mode output
-- -------------------------------------------------------------------------
create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My Weekend',
  type text not null default 'weekend' check (type in ('weekend','day_trip','travel','custom')),
  start_date date,
  end_date date,
  estimated_cost numeric(10,2),
  is_public boolean not null default false,
  share_slug text unique,
  -- Geo anchor for fetching real swap alternatives on an item — set for AI
  -- Trip Planner itineraries (type "travel"), null for Weekend Planner ones.
  destination_city text,
  destination_country text,
  destination_latitude double precision,
  destination_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'itineraries' and column_name = 'destination_city'
  ) then
    alter table public.itineraries add column destination_city text;
    alter table public.itineraries add column destination_country text;
    alter table public.itineraries add column destination_latitude double precision;
    alter table public.itineraries add column destination_longitude double precision;
  end if;
end $$;

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  -- text, not uuid: an itinerary item can point at a curated catalog row
  -- (real uuid) or a live Google Places result ("g-<place_id>", never
  -- persisted to public.experiences) — see the migration block below for
  -- why this wasn't always text, and lib/repositories/itineraries.ts for how
  -- AI-generated (weekend and multi-day trip) plans populate this.
  experience_id text,
  day_index int not null default 0,
  start_time text not null default '09:00',
  title text not null,
  notes text,
  estimated_cost numeric(10,2),
  order_index int not null default 0,
  images text[] not null default '{}'
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'itinerary_items' and column_name = 'images'
  ) then
    alter table public.itinerary_items add column images text[] not null default '{}';
  end if;
end $$;

create index if not exists idx_itinerary_items_itinerary on public.itinerary_items(itinerary_id);

-- itinerary_items.experience_id was originally a `uuid` FK into
-- public.experiences, which only ever worked for curated catalog rows.
-- Since the catalog is Google Places-only in production (see CLAUDE.md,
-- "Production catalog is Google Places-only"), every AI-generated plan that
-- includes a real place now fails to save with a uuid-syntax error — fixed
-- 2026-08-31 by loosening the column to plain text with no FK. The
-- itinerary detail page already renders items from their own stored
-- title/notes/estimated_cost, never by re-fetching the referenced
-- experience, so this has no UI impact.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'itinerary_items'
      and column_name = 'experience_id' and data_type = 'uuid'
  ) then
    alter table public.itinerary_items drop constraint if exists itinerary_items_experience_id_fkey;
    alter table public.itinerary_items alter column experience_id type text using experience_id::text;
  end if;
end $$;

-- user_events.experience_id, saved_experiences.experience_id, and
-- reviews.experience_id were all `uuid` FKs into public.experiences, the
-- identical bug as itinerary_items.experience_id above — and
-- public.experiences has zero rows in production (the fictional demo
-- catalog was removed, see CLAUDE.md "Production catalog is Google
-- Places-only"). This silently broke behavioral tracking (trackEvent logged
-- an error for every Google-sourced view/dismiss) and completely broke the
-- Save button (every save failed the FK check, since experiences is empty)
-- for effectively all production content; reviews had no write path yet so
-- that one was latent rather than active. Fixed 2026-09-01 the same way:
-- loosen all three to plain text with no FK. getSavedTagCounts() in
-- src/lib/repositories/saved.ts no longer relies on the FK-based embed for
-- this reason — see that file.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_events'
      and column_name = 'experience_id' and data_type = 'uuid'
  ) then
    alter table public.user_events drop constraint if exists user_events_experience_id_fkey;
    alter table public.user_events alter column experience_id type text using experience_id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'saved_experiences'
      and column_name = 'experience_id' and data_type = 'uuid'
  ) then
    alter table public.saved_experiences drop constraint if exists saved_experiences_experience_id_fkey;
    alter table public.saved_experiences alter column experience_id type text using experience_id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reviews'
      and column_name = 'experience_id' and data_type = 'uuid'
  ) then
    alter table public.reviews drop constraint if exists reviews_experience_id_fkey;
    alter table public.reviews alter column experience_id type text using experience_id::text;
  end if;
end $$;

-- -------------------------------------------------------------------------
-- destinations — Travel Mode metadata
-- -------------------------------------------------------------------------
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  city text not null,
  country text not null,
  description text,
  cover_image text,
  latitude double precision,
  longitude double precision,
  best_months text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- trips
-- -------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination_city text not null,
  destination_country text not null,
  start_date date,
  end_date date,
  status text not null default 'planning' check (status in ('planning','upcoming','active','completed')),
  cover_image text,
  created_at timestamptz not null default now()
);

create index if not exists idx_trips_user on public.trips(user_id);

-- -------------------------------------------------------------------------
-- subscriptions + payments — Stripe state mirror
-- -------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status text not null default 'none',
  plan_id text not null default 'free' check (plan_id in ('free','premium')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_customer on public.subscriptions(stripe_customer_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_invoice_id text unique,
  amount numeric(10,2) not null,
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('paid','failed','pending','refunded')),
  created_at timestamptz not null default now()
);

-- Added after initial launch — `if not exists` on create table above won't
-- retroactively add this to an already-existing table, so add it explicitly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_stripe_invoice_id_key'
  ) then
    alter table public.payments add constraint payments_stripe_invoice_id_key unique (stripe_invoice_id);
  end if;
end $$;

-- Digistore24 (affiliate-sold Premium, alongside direct Stripe checkout) —
-- added 2026-09-18. digistore24_order_id is the stable anchor a webhook
-- upserts against across an order's whole lifecycle (payment, missed
-- payment, cancellation, last paid day); digistore24_manage_url is DS24's
-- own buyer-support URL (there's no Stripe customer for these subscriptions,
-- so /api/stripe/portal doesn't apply — see subscription-card.tsx).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'digistore24_order_id'
  ) then
    alter table public.subscriptions add column digistore24_order_id text;
    alter table public.subscriptions add column digistore24_manage_url text;
    alter table public.subscriptions add constraint subscriptions_digistore24_order_id_key unique (digistore24_order_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'digistore24_transaction_id'
  ) then
    alter table public.payments add column digistore24_transaction_id text;
    alter table public.payments add constraint payments_digistore24_transaction_id_key unique (digistore24_transaction_id);
  end if;
end $$;

-- -------------------------------------------------------------------------
-- social — profiles, follows, shares
-- -------------------------------------------------------------------------
create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  handle text not null unique,
  -- Default is private. Nothing in the app reads this table yet; see
  -- migrations/20261014_01_restrict_social_exposure.sql for why.
  is_public boolean not null default false,
  experiences_completed int not null default 0,
  follower_count int not null default 0,
  following_count int not null default 0
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('experience','itinerary','trip')),
  entity_id uuid not null,
  channel text not null default 'link',
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- admin_users — explicit allowlist in addition to ADMIN_EMAIL env fallback
-- -------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- job_applications — submissions from the public Careers page
-- -------------------------------------------------------------------------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  full_name text not null,
  email text not null,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  cover_letter text not null,
  status text not null default 'new' check (status in ('new','reviewing','contacted','rejected','hired')),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'job_applications' and column_name = 'resume_url'
  ) then
    alter table public.job_applications add column resume_url text;
  end if;
end $$;

create index if not exists idx_job_applications_role on public.job_applications(role);

-- Storage bucket for uploaded resumes/portfolios. Public so the stored URL
-- works directly (like the existing avatars/experience-photos pattern) —
-- files are only reachable via their random UUID-prefixed path, never listed.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

-- Storage bucket for user profile photos, uploaded via /api/profile/avatar
-- (using the service-role client, same as resumes above — not user-scoped
-- storage RLS). Public so the stored URL works directly in <img>/next/image.
-- Paths are namespaced under the uploader's own user id
-- (avatars/<user_id>/<uuid>.<ext>), so nothing is guessable/listable in a way
-- that matters even though the bucket itself is public.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- =========================================================================
-- updated_at triggers
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_experiences_updated_at on public.experiences;
create trigger trg_experiences_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();

drop trigger if exists trg_itineraries_updated_at on public.itineraries;
create trigger trg_itineraries_updated_at before update on public.itineraries
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Auto-create a profile + free subscription row when a new auth user signs up.
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

  -- Measurement and verification must never be the reason an account cannot be created.
  begin
    insert into public.analytics_events (event, user_id, src, code, props, dedupe_key)
    values (
      'signup_completed', new.id, v_src, v_code,
      jsonb_build_object('method', coalesce(nullif(regexp_replace(lower(new.raw_app_meta_data->>'provider'), '[^a-z0-9_]', '', 'g'), ''), 'email')),
      'signup_completed:' || new.id::text
    )
    on conflict do nothing;

    if new.email_confirmed_at is not null then
      perform public.apply_student_verification(new.id, new.email);
    end if;
  exception when others then
    null;
  end;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_categories enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_experiences enable row level security;
alter table public.user_events enable row level security;
alter table public.recommendations enable row level security;
alter table public.itineraries enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.destinations enable row level security;
alter table public.trips enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.social_profiles enable row level security;
alter table public.follows enable row level security;
alter table public.shares enable row level security;
alter table public.admin_users enable row level security;
alter table public.job_applications enable row level security;

-- Public read-only catalog data
drop policy if exists "public read experiences" on public.experiences;
create policy "public read experiences" on public.experiences for select using (true);

drop policy if exists "public read categories" on public.experience_categories;
create policy "public read categories" on public.experience_categories for select using (true);

drop policy if exists "public read destinations" on public.destinations;
create policy "public read destinations" on public.destinations for select using (true);

drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select using (true);

drop policy if exists "users insert own reviews" on public.reviews;
create policy "users insert own reviews" on public.reviews for insert with check (auth.uid() = user_id);

-- Owner-only tables
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own saved" on public.saved_experiences;
create policy "own saved" on public.saved_experiences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own events" on public.user_events;
create policy "own events" on public.user_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own recommendations" on public.recommendations;
create policy "own recommendations" on public.recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Owner only. Plans are shared through share_links (migrations/20261020_02), which the
-- server reads with its own key: a public-read policy here would let anyone with the
-- public database key list every shared plan.
drop policy if exists "own or public itineraries" on public.itineraries;
drop policy if exists "own itineraries" on public.itineraries;
create policy "own itineraries" on public.itineraries for select using (auth.uid() = user_id);
drop policy if exists "manage own itineraries" on public.itineraries;
create policy "manage own itineraries" on public.itineraries for insert with check (auth.uid() = user_id);
drop policy if exists "update own itineraries" on public.itineraries;
create policy "update own itineraries" on public.itineraries for update using (auth.uid() = user_id);
drop policy if exists "delete own itineraries" on public.itineraries;
create policy "delete own itineraries" on public.itineraries for delete using (auth.uid() = user_id);

drop policy if exists "itinerary items via parent" on public.itinerary_items;
create policy "itinerary items via parent" on public.itinerary_items for all using (
  exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = auth.uid())
) with check (
  exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = auth.uid())
);

drop policy if exists "own trips" on public.trips;
create policy "own trips" on public.trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own subscription" on public.subscriptions;
create policy "own subscription" on public.subscriptions for select using (auth.uid() = user_id);

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments for select using (auth.uid() = user_id);

-- Social tables are owner-only. They used to be world-readable (a public
-- handle + first name per user, and the whole follow graph); that was closed by
-- migrations/20261014_01_restrict_social_exposure.sql. Do not re-open without
-- reading it.
drop policy if exists "public social profiles" on public.social_profiles;
drop policy if exists "own social profile" on public.social_profiles;
create policy "own social profile" on public.social_profiles for select using (auth.uid() = user_id);
drop policy if exists "manage own social profile" on public.social_profiles;
create policy "manage own social profile" on public.social_profiles for update using (auth.uid() = user_id);

drop policy if exists "read follows" on public.follows;
drop policy if exists "read own follows" on public.follows;
create policy "read own follows" on public.follows for select using (auth.uid() = follower_id or auth.uid() = following_id);
drop policy if exists "manage own follows" on public.follows;
create policy "manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

drop policy if exists "own shares" on public.shares;
create policy "own shares" on public.shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The logged-out role has no business on any of the three social tables.
revoke all on public.social_profiles from anon;
revoke all on public.follows from anon;
revoke all on public.shares from anon;

drop policy if exists "read admin allowlist" on public.admin_users;
create policy "read admin allowlist" on public.admin_users for select using (auth.uid() = user_id);

-- Anyone (including logged-out visitors) can submit a job application, but
-- only admins (via the service-role client) can read submissions back.
drop policy if exists "anyone can apply" on public.job_applications;
create policy "anyone can apply" on public.job_applications for insert with check (true);

-- Note: writes to experiences/categories/destinations and all admin
-- mutations happen exclusively through server routes using the service-role
-- client (src/lib/supabase/admin.ts), which bypasses RLS after an explicit
-- admin check in application code.

-- =========================================================================
-- api_usage_events: every external Places / Claude call (see the migration
-- file below for the full comments; kept identical so a fresh database matches)
-- =========================================================================
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

-- =========================================================================
-- Phase 1: measurement (see migrations/20261015_01_analytics_events.sql for the
-- reasoning; kept identical so a fresh database matches)
-- =========================================================================

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
-- (handle_new_user() is defined above, next to its trigger, so it exists before the trigger that uses it.)

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
     where event in ('signup_completed', 'edu_verified')
       and user_id = p_user and src is null and code is null;
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

-- =========================================================================
-- Phase 2: campuses, school-email verification, waitlist (see
-- migrations/20261016_01_campuses_and_student_verification.sql for the reasoning)
-- =========================================================================

-- 1. Campuses -------------------------------------------------------------------
create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  short_name text not null,
  email_domains text[] not null check (cardinality(email_domains) > 0),
  active boolean not null default true,
  -- breaks a tie when an email matches two schools (the selector itself is alphabetical)
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.campuses enable row level security;
drop policy if exists "public read active campuses" on public.campuses;
create policy "public read active campuses" on public.campuses for select using (active);
revoke insert, update, delete, truncate on public.campuses from anon, authenticated;

insert into public.campuses (slug, name, short_name, email_domains, sort_order)
values ('loyola-maryland', 'Loyola University Maryland', 'Loyola', array['loyola.edu'], 10)
on conflict (slug) do nothing;

-- The other schools in the /students selector (migrations/20261018_01_seed_campuses.sql).
insert into public.campuses (slug, name, short_name, email_domains)
values
  ('american-university', 'American University', 'American', array['american.edu']),
  ('arizona-state-university', 'Arizona State University', 'Arizona State', array['asu.edu']),
  ('auburn-university', 'Auburn University', 'Auburn', array['auburn.edu']),
  ('baylor-university', 'Baylor University', 'Baylor', array['baylor.edu']),
  ('boston-college', 'Boston College', 'Boston College', array['bc.edu']),
  ('boston-university', 'Boston University', 'Boston University', array['bu.edu']),
  ('brown-university', 'Brown University', 'Brown', array['brown.edu']),
  ('carnegie-mellon-university', 'Carnegie Mellon University', 'Carnegie Mellon', array['cmu.edu']),
  ('catholic-university-of-america', 'Catholic University of America', 'Catholic University', array['cua.edu']),
  ('clemson-university', 'Clemson University', 'Clemson', array['clemson.edu']),
  ('college-of-the-holy-cross', 'College of the Holy Cross', 'Holy Cross', array['holycross.edu']),
  ('college-of-william-and-mary', 'College of William & Mary', 'William & Mary', array['wm.edu']),
  ('columbia-university', 'Columbia University', 'Columbia', array['columbia.edu']),
  ('cornell-university', 'Cornell University', 'Cornell', array['cornell.edu']),
  ('dartmouth-college', 'Dartmouth College', 'Dartmouth', array['dartmouth.edu']),
  ('drexel-university', 'Drexel University', 'Drexel', array['drexel.edu']),
  ('duke-university', 'Duke University', 'Duke', array['duke.edu']),
  ('emory-university', 'Emory University', 'Emory', array['emory.edu']),
  ('fairfield-university', 'Fairfield University', 'Fairfield', array['fairfield.edu']),
  ('florida-state-university', 'Florida State University', 'Florida State', array['fsu.edu']),
  ('fordham-university', 'Fordham University', 'Fordham', array['fordham.edu']),
  ('george-washington-university', 'George Washington University', 'George Washington', array['gwu.edu']),
  ('georgetown-university', 'Georgetown University', 'Georgetown', array['georgetown.edu']),
  ('georgia-tech', 'Georgia Tech', 'Georgia Tech', array['gatech.edu']),
  ('gonzaga-university', 'Gonzaga University', 'Gonzaga', array['gonzaga.edu']),
  ('harvard-university', 'Harvard University', 'Harvard', array['harvard.edu']),
  ('howard-university', 'Howard University', 'Howard', array['howard.edu']),
  ('indiana-university-bloomington', 'Indiana University Bloomington', 'Indiana', array['iu.edu']),
  ('james-madison-university', 'James Madison University', 'James Madison', array['jmu.edu']),
  ('johns-hopkins-university', 'Johns Hopkins University', 'Johns Hopkins', array['jhu.edu', 'jh.edu']),
  ('louisiana-state-university', 'Louisiana State University', 'LSU', array['lsu.edu']),
  ('marquette-university', 'Marquette University', 'Marquette', array['marquette.edu']),
  ('massachusetts-institute-of-technology', 'Massachusetts Institute of Technology', 'MIT', array['mit.edu']),
  ('michigan-state-university', 'Michigan State University', 'Michigan State', array['msu.edu']),
  ('morgan-state-university', 'Morgan State University', 'Morgan State', array['morgan.edu']),
  ('nc-state-university', 'NC State University', 'NC State', array['ncsu.edu']),
  ('new-york-university', 'New York University', 'NYU', array['nyu.edu']),
  ('northeastern-university', 'Northeastern University', 'Northeastern', array['northeastern.edu']),
  ('northwestern-university', 'Northwestern University', 'Northwestern', array['northwestern.edu']),
  ('ohio-state-university', 'Ohio State University', 'Ohio State', array['osu.edu']),
  ('penn-state-university', 'Penn State University', 'Penn State', array['psu.edu']),
  ('princeton-university', 'Princeton University', 'Princeton', array['princeton.edu']),
  ('purdue-university', 'Purdue University', 'Purdue', array['purdue.edu']),
  ('rice-university', 'Rice University', 'Rice', array['rice.edu']),
  ('rutgers-university', 'Rutgers University', 'Rutgers', array['rutgers.edu']),
  ('saint-josephs-university', 'Saint Joseph’s University', 'Saint Joseph’s', array['sju.edu']),
  ('saint-louis-university', 'Saint Louis University', 'Saint Louis', array['slu.edu']),
  ('santa-clara-university', 'Santa Clara University', 'Santa Clara', array['scu.edu']),
  ('southern-methodist-university', 'Southern Methodist University', 'SMU', array['smu.edu']),
  ('stanford-university', 'Stanford University', 'Stanford', array['stanford.edu']),
  ('syracuse-university', 'Syracuse University', 'Syracuse', array['syr.edu']),
  ('temple-university', 'Temple University', 'Temple', array['temple.edu']),
  ('texas-am-university', 'Texas A&M University', 'Texas A&M', array['tamu.edu']),
  ('texas-christian-university', 'Texas Christian University', 'TCU', array['tcu.edu']),
  ('texas-tech-university', 'Texas Tech University', 'Texas Tech', array['ttu.edu']),
  ('towson-university', 'Towson University', 'Towson', array['towson.edu']),
  ('tufts-university', 'Tufts University', 'Tufts', array['tufts.edu']),
  ('tulane-university', 'Tulane University', 'Tulane', array['tulane.edu']),
  ('uc-berkeley', 'UC Berkeley', 'Berkeley', array['berkeley.edu']),
  ('uc-davis', 'UC Davis', 'UC Davis', array['ucdavis.edu']),
  ('uc-san-diego', 'UC San Diego', 'UC San Diego', array['ucsd.edu']),
  ('uc-santa-barbara', 'UC Santa Barbara', 'UC Santa Barbara', array['ucsb.edu']),
  ('ucla', 'UCLA', 'UCLA', array['ucla.edu']),
  ('unc-chapel-hill', 'UNC Chapel Hill', 'UNC', array['unc.edu']),
  ('university-of-alabama', 'University of Alabama', 'Alabama', array['ua.edu']),
  ('university-of-arizona', 'University of Arizona', 'Arizona', array['arizona.edu']),
  ('university-of-central-florida', 'University of Central Florida', 'UCF', array['ucf.edu']),
  ('university-of-chicago', 'University of Chicago', 'UChicago', array['uchicago.edu']),
  ('university-of-colorado-boulder', 'University of Colorado Boulder', 'CU Boulder', array['colorado.edu']),
  ('university-of-connecticut', 'University of Connecticut', 'UConn', array['uconn.edu']),
  ('university-of-delaware', 'University of Delaware', 'Delaware', array['udel.edu']),
  ('university-of-florida', 'University of Florida', 'Florida', array['ufl.edu']),
  ('university-of-georgia', 'University of Georgia', 'Georgia', array['uga.edu']),
  ('university-of-illinois-urbana-champaign', 'University of Illinois Urbana-Champaign', 'Illinois', array['illinois.edu']),
  ('university-of-iowa', 'University of Iowa', 'Iowa', array['uiowa.edu']),
  ('university-of-kentucky', 'University of Kentucky', 'Kentucky', array['uky.edu']),
  ('university-of-maryland-baltimore-county', 'University of Maryland, Baltimore County', 'UMBC', array['umbc.edu']),
  ('university-of-maryland-college-park', 'University of Maryland, College Park', 'Maryland', array['umd.edu']),
  ('university-of-miami', 'University of Miami', 'Miami', array['miami.edu']),
  ('university-of-michigan', 'University of Michigan', 'Michigan', array['umich.edu']),
  ('university-of-minnesota', 'University of Minnesota', 'Minnesota', array['umn.edu']),
  ('university-of-notre-dame', 'University of Notre Dame', 'Notre Dame', array['nd.edu']),
  ('university-of-oregon', 'University of Oregon', 'Oregon', array['uoregon.edu']),
  ('university-of-pennsylvania', 'University of Pennsylvania', 'Penn', array['upenn.edu']),
  ('university-of-pittsburgh', 'University of Pittsburgh', 'Pitt', array['pitt.edu']),
  ('university-of-richmond', 'University of Richmond', 'Richmond', array['richmond.edu']),
  ('university-of-south-carolina', 'University of South Carolina', 'South Carolina', array['sc.edu']),
  ('university-of-southern-california', 'University of Southern California', 'USC', array['usc.edu']),
  ('university-of-tennessee', 'University of Tennessee', 'Tennessee', array['utk.edu']),
  ('university-of-texas-at-austin', 'University of Texas at Austin', 'UT Austin', array['utexas.edu']),
  ('university-of-virginia', 'University of Virginia', 'UVA', array['virginia.edu']),
  ('university-of-washington', 'University of Washington', 'UW', array['uw.edu', 'washington.edu']),
  ('university-of-wisconsin-madison', 'University of Wisconsin–Madison', 'Wisconsin', array['wisc.edu']),
  ('vanderbilt-university', 'Vanderbilt University', 'Vanderbilt', array['vanderbilt.edu']),
  ('villanova-university', 'Villanova University', 'Villanova', array['villanova.edu']),
  ('virginia-tech', 'Virginia Tech', 'Virginia Tech', array['vt.edu']),
  ('wake-forest-university', 'Wake Forest University', 'Wake Forest', array['wfu.edu']),
  ('washington-university-in-st-louis', 'Washington University in St. Louis', 'WashU', array['wustl.edu']),
  ('yale-university', 'Yale University', 'Yale', array['yale.edu'])
on conflict (slug) do nothing;

-- 2. Verification state on the user record ---------------------------------------
alter table public.profiles add column if not exists campus_id uuid references public.campuses(id) on delete set null;
alter table public.profiles add column if not exists edu_verified_at timestamptz;

-- The campus whose email domain this address belongs to, or null. An address on a
-- subdomain (students.loyola.edu) matches the campus domain (loyola.edu).
create or replace function public.campus_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.campuses c
  where c.active
    and exists (
      select 1 from unnest(c.email_domains) d
      where lower(split_part(p_email, '@', 2)) = lower(d)
         or lower(split_part(p_email, '@', 2)) like '%.' || lower(d)
    )
  order by c.sort_order
  limit 1
$$;

-- Marks a user as a verified student if (and only if) their confirmed address is a
-- .edu address. Idempotent: the first verification time is kept.
create or replace function public.apply_student_verification(p_user uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(split_part(coalesce(p_email, ''), '@', 2));
  v_campus uuid;
  v_slug text;
  v_src text;
  v_code text;
begin
  if v_domain !~ '\.edu$' then
    return;
  end if;

  v_campus := public.campus_for_email(p_email);

  update public.profiles
     set edu_verified_at = coalesce(edu_verified_at, now()),
         campus_id = coalesce(campus_id, v_campus)
   where user_id = p_user
  returning signup_src, signup_code into v_src, v_code;
  if not found then
    return;
  end if;

  select slug into v_slug from public.campuses where id = v_campus;

  begin
    insert into public.analytics_events (event, user_id, src, code, props, dedupe_key)
    values ('edu_verified', p_user, v_src, v_code, jsonb_build_object('campus', coalesce(v_slug, 'other')), 'edu_verified:' || p_user::text)
    on conflict do nothing;
  exception when others then
    null;
  end;
end;
$$;

revoke all on function public.apply_student_verification(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_student_verification(uuid, text) to service_role;

-- 3. Triggers: when the confirmation link is clicked ---------------------------------
create or replace function public.handle_user_email_confirmed()
returns trigger as $$
begin
  begin
    perform public.apply_student_verification(new.id, new.email);
  exception when others then
    null;
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_email_confirmed();

-- A Google account arrives already verified (email_confirmed_at is set on insert),
-- so the update trigger above never fires for it: handle that at creation.
-- (handle_new_user() is defined above, next to its trigger.)

-- Attribution patch (from /auth/callback): now also patches edu_verified, which a
-- Google .edu account records at creation, before the callback runs.
-- (apply_signup_attribution() is defined in the Phase 1 section above.)

-- 4. Waitlist -----------------------------------------------------------------------
-- An email (and optionally a school name) from someone whose school is not listed.
-- The email is stored lowercased and is unique, so a repeat submission is a no-op.
-- Written only by the server; no client can read or write it.
create table if not exists public.campus_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null check (email = lower(email) and length(email) between 5 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  school text check (school is null or length(school) between 1 and 100),
  src text check (src is null or src ~ '^[a-z0-9._-]{1,64}$'),
  code text check (code is null or code ~ '^[A-Z0-9._-]{1,64}$')
);
create unique index if not exists uniq_campus_waitlist_email on public.campus_waitlist (email);
alter table public.campus_waitlist enable row level security;
revoke all on public.campus_waitlist from anon, authenticated;

-- =========================================================================
-- Waitlist retention: delete entries 24 months after they were added (see
-- migrations/20261017_01_waitlist_retention.sql)
-- =========================================================================
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'campus-waitlist-retention',
    '17 4 * * *',
    $job$delete from public.campus_waitlist where created_at < now() - interval '24 months'$job$
  );
exception when others then
  raise notice 'pg_cron is unavailable (%); the waitlist retention job was NOT scheduled.', sqlerrm;
end $$;

-- =========================================================================
-- Phase 3: student promo codes, the record of who redeemed which code (see
-- migrations/20261019_01_promo_redemptions.sql for the reasoning)
-- =========================================================================
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  code text not null check (code ~ '^[A-Z0-9-]{2,64}$'),
  stripe_promotion_code_id text not null,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  status text not null default 'pending' check (status in ('pending', 'redeemed')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  constraint promo_redemptions_redeemed_at check ((status = 'redeemed') = (redeemed_at is not null))
);

create index if not exists idx_promo_redemptions_code on public.promo_redemptions (code);

alter table public.promo_redemptions enable row level security;
revoke all on public.promo_redemptions from anon, authenticated;

-- Per code: how many started Checkout, how many completed it, and whether the
-- ones whose free month is over went on to pay. A redemption counts as "month
-- ended" 35 days after it happened (a 30-day month plus time for the first
-- charge to settle), so a recent group shows "not yet" instead of a falsely low
-- rate, the same rule as the return-rate view.
create or replace view public.v_promo_redemptions_by_code as
with r as (
  select
    pr.code,
    pr.status,
    pr.redeemed_at,
    (pr.status = 'redeemed' and pr.redeemed_at <= now() - interval '35 days') as month_ended,
    exists (
      select 1 from public.payments p
      where p.user_id = pr.user_id
        and p.status = 'paid'
        and p.amount > 0
        and pr.redeemed_at is not null
        and p.created_at > pr.redeemed_at
    ) as paid_after
  from public.promo_redemptions pr
)
select
  code,
  count(*) as started,
  count(*) filter (where status = 'redeemed') as redeemed,
  count(*) filter (where status = 'redeemed' and redeemed_at > now() - interval '7 days') as redeemed_7d,
  max(redeemed_at) as last_redeemed_at,
  count(*) filter (where month_ended) as month_ended,
  count(*) filter (where month_ended and paid_after) as paid_after,
  round(100.0 * count(*) filter (where month_ended and paid_after)
        / nullif(count(*) filter (where month_ended), 0), 1) as paid_after_pct
from r
group by code;

revoke all on public.v_promo_redemptions_by_code from anon, authenticated;
grant select on public.v_promo_redemptions_by_code to service_role;

-- =========================================================================
-- Phase 4: share links, a public unguessable page for one place or plan (see
-- migrations/20261020_01_share_links.sql for the reasoning)
-- =========================================================================
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
