-- Waitlist retention: an entry is deleted 24 months after it was added.
--
-- The privacy policy promises this limit, so it is enforced here, in the
-- database, by a daily scheduled job (pg_cron). Nothing else is touched: only
-- campus_waitlist rows older than 24 months. A person can also be removed at any
-- time on request (they write to support; the row is deleted by hand).
--
-- pg_cron is a standard Supabase extension. If it cannot be enabled (a database
-- that is not Supabase, or a plan without it) this block logs a notice instead of
-- failing, and the job is simply not scheduled: the policy would then not be
-- true, so check the notice.
--
-- Rollback: select cron.unschedule('campus-waitlist-retention');

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
