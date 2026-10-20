-- Phase 5: pausing a subscription for a month.
--
-- A person who would rather not cancel can pause a monthly Premium subscription. The paid period they are
-- in continues; the month after it is skipped (Stripe voids that month's invoice, nothing is charged, the
-- account rests on Free); then billing resumes on its own. Stripe keeps the pause (pause_collection, and the two
-- dates in the subscription's metadata). These two columns are our mirror of the dates, written only by the
-- Stripe webhook and the server, so the app can tell at any moment, without asking Stripe, whether the skipped
-- month is under way:
--
--   paused_from   the end of the paid period: Premium continues until then
--   paused_until  the end of the skipped month: Premium returns, and the payment is taken
--
-- Both are null when there is no pause. They are set together or not at all, and the month ends after it begins.
-- The subscriptions table is unchanged otherwise: a paused subscription is still plan_id 'premium', status
-- 'active', so it is never mistaken for a lapsed one (and a second checkout is refused). Whether Premium is in
-- effect right now is decided by the app from these dates (see isPremium).
--
-- Additive: two nullable columns and one check. No row changes, so the check holds for every row already there.
-- The table's policy is unchanged (a person may read their own row; only the server writes).
--
-- Rollback:
--   alter table public.subscriptions drop constraint if exists subscriptions_pause_window;
--   alter table public.subscriptions drop column if exists paused_from;
--   alter table public.subscriptions drop column if exists paused_until;

begin;

alter table public.subscriptions add column if not exists paused_from timestamptz;
alter table public.subscriptions add column if not exists paused_until timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_pause_window') then
    alter table public.subscriptions add constraint subscriptions_pause_window
      check (
        (paused_from is null and paused_until is null)
        or (paused_from is not null and paused_until is not null and paused_until > paused_from)
      );
  end if;
end $$;

commit;
