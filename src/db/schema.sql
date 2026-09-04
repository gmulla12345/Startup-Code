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

-- -------------------------------------------------------------------------
-- social — profiles, follows, shares
-- -------------------------------------------------------------------------
create table if not exists public.social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  handle text not null unique,
  is_public boolean not null default true,
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
begin
  insert into public.profiles (user_id, first_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'first_name', ''));

  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'none');

  insert into public.social_profiles (user_id, handle, display_name)
  values (new.id, 'user_' || substr(new.id::text, 1, 8), coalesce(new.raw_user_meta_data->>'first_name', 'Zolo user'));

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

drop policy if exists "own or public itineraries" on public.itineraries;
create policy "own or public itineraries" on public.itineraries for select using (auth.uid() = user_id or is_public = true);
drop policy if exists "manage own itineraries" on public.itineraries;
create policy "manage own itineraries" on public.itineraries for insert with check (auth.uid() = user_id);
drop policy if exists "update own itineraries" on public.itineraries;
create policy "update own itineraries" on public.itineraries for update using (auth.uid() = user_id);
drop policy if exists "delete own itineraries" on public.itineraries;
create policy "delete own itineraries" on public.itineraries for delete using (auth.uid() = user_id);

drop policy if exists "itinerary items via parent" on public.itinerary_items;
create policy "itinerary items via parent" on public.itinerary_items for all using (
  exists (select 1 from public.itineraries i where i.id = itinerary_id and (i.user_id = auth.uid() or i.is_public = true))
) with check (
  exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = auth.uid())
);

drop policy if exists "own trips" on public.trips;
create policy "own trips" on public.trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own subscription" on public.subscriptions;
create policy "own subscription" on public.subscriptions for select using (auth.uid() = user_id);

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments for select using (auth.uid() = user_id);

drop policy if exists "public social profiles" on public.social_profiles;
create policy "public social profiles" on public.social_profiles for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "manage own social profile" on public.social_profiles;
create policy "manage own social profile" on public.social_profiles for update using (auth.uid() = user_id);

drop policy if exists "read follows" on public.follows;
create policy "read follows" on public.follows for select using (true);
drop policy if exists "manage own follows" on public.follows;
create policy "manage own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

drop policy if exists "own shares" on public.shares;
create policy "own shares" on public.shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
