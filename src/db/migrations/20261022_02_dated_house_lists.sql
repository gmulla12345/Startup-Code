-- Phase 4b: lists with a start and an end. This week's lists.
--
-- A "house list" is a list we write ourselves: it has no owner (user_id is null), no template, a
-- title and a line of copy, and places with a line of our own under each (list_places.why). It can
-- have a window: starts_on and ends_on, calendar dates. Outside the window it is not shown: the
-- Home screen leaves it out the day after it ends, and its public page says that it has ended.
-- A list with no dates is always open.
--
-- Lists made for a person (a template, with an owner) never have dates: they are made for today.
--
-- Closed to every browser key, as the table already was. House lists are written by the owner
-- (see scripts/create-house-list.ts) with the service role.
--
-- Changes lists: user_id may now be null, two date columns are added, and three checks keep the
-- shapes straight. No row changes. Existing lists all have an owner and no dates, so all three
-- checks hold for every row already there.
--
-- Rollback (only if no house list has been made, as it needs user_id to be set on every row):
--   alter table public.lists drop constraint if exists lists_window;
--   alter table public.lists drop constraint if exists lists_house_shape;
--   alter table public.lists drop constraint if exists lists_dates_house_only;
--   drop index if exists public.idx_lists_house_window;
--   alter table public.lists drop column if exists starts_on;
--   alter table public.lists drop column if exists ends_on;
--   alter table public.lists alter column user_id set not null;

begin;

alter table public.lists alter column user_id drop not null;
alter table public.lists add column if not exists starts_on date;
alter table public.lists add column if not exists ends_on date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lists_window') then
    alter table public.lists add constraint lists_window
      check (starts_on is null or ends_on is null or ends_on >= starts_on);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lists_house_shape') then
    alter table public.lists add constraint lists_house_shape
      check (user_id is not null or template is null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lists_dates_house_only') then
    alter table public.lists add constraint lists_dates_house_only
      check (user_id is null or (starts_on is null and ends_on is null));
  end if;
end $$;

create index if not exists idx_lists_house_window on public.lists (starts_on, ends_on) where user_id is null;

commit;
