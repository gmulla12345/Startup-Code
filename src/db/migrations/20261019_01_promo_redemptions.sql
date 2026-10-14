-- Phase 3: student promo codes. The record of who redeemed which code, and when.
--
-- A student code is a Stripe promotion code worth one free month of Premium.
-- Stripe keeps each code's redemption limit and expiry; this table is ours:
--   1. a row is created, as 'pending', when the server decides a verified student
--      may use a code and sends them to Checkout, and
--   2. it becomes 'redeemed', with the time, when Stripe tells us Checkout
--      completed (the webhook).
-- One row per person (unique user_id) is what makes the code "one use per
-- person". An abandoned Checkout leaves a pending row that the next attempt
-- reuses, so it never blocks anyone.
--
-- Server-written and server-read only: no browser key can see it. user_id is set
-- to null when an account is deleted, so what remains cannot be tied to a person
-- (same as analytics_events). The admin page reads v_promo_redemptions_by_code.
--
-- Additive: creates one table and one view, changes and deletes nothing.
--
-- Rollback:
--   drop view if exists public.v_promo_redemptions_by_code;
--   drop table if exists public.promo_redemptions;

begin;

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

commit;
