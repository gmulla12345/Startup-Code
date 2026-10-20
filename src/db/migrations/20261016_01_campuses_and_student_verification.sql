-- Phase 2: campuses, school-email verification, and the waitlist.
--
--   1. campuses: one row per school, with the email domains that identify it.
--      Adding a school is an insert, not a code change. Readable by anyone (it
--      is a list of school names and domains); writable only by the service role.
--   2. profiles.campus_id / edu_verified_at: set when a user confirms a .edu
--      address, by the confirmation link (an update of auth.users.email_confirmed_at)
--      or, for a Google account that arrives already verified, at account
--      creation. The campus is detected from the email's domain, so a subdomain
--      such as students.example.edu matches example.edu and notexample.edu does not.
--      Any verified .edu address counts as edu_verified, whether or not the school
--      is a campus we serve yet (campus_id stays null for those).
--   3. edu_verified analytics event, recorded once per user, with the campus slug
--      (or "other").
--   4. campus_waitlist: an email, and optionally a school name, from someone whose
--      school is not listed. Server-written only.
--
-- Everything here is wrapped so that it can never stop an account being created
-- or confirmed: a failure in this logic is swallowed, not raised.
--
-- The first school's email domain is seeded below. CONFIRM IT with the school; if
-- students use another domain, add it to campuses.email_domains.
--
-- Rollback (nothing here deletes existing data):
--   drop trigger if exists on_auth_user_email_confirmed on auth.users;
--   drop function if exists public.handle_user_email_confirmed();
--   drop function if exists public.apply_student_verification(uuid, text);
--   drop function if exists public.campus_for_email(text);
--   drop table if exists public.campus_waitlist;
--   alter table public.profiles drop column campus_id, drop column edu_verified_at;
--   drop table if exists public.campuses;
--   (and restore handle_new_user / apply_signup_attribution from migration 20261015_01)

begin;

-- 1. Campuses -------------------------------------------------------------------
create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  short_name text not null,
  email_domains text[] not null check (cardinality(email_domains) > 0),
  active boolean not null default true,
  -- the order schools appear in the selector
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

-- 2. Verification state on the user record ---------------------------------------
alter table public.profiles add column if not exists campus_id uuid references public.campuses(id) on delete set null;
alter table public.profiles add column if not exists edu_verified_at timestamptz;

-- The campus whose email domain this address belongs to, or null. An address on a
-- subdomain (students.example.edu) matches the campus domain (example.edu).
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

-- Attribution patch (from /auth/callback): now also patches edu_verified, which a
-- Google .edu account records at creation, before the callback runs.
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

commit;
