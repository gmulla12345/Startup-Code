-- Lists, phase 1. A public, unguessable page for a list of three to ten places.
--
-- A person looking at one of their lists on Home can turn it into a link anyone who
-- has it can open. They can turn it off at any time, which DELETES the rows, so a
-- turned-off link and one that never existed are the same 404 and nothing is kept.
--
--   lists.token      16 random bytes from the server, as 22 URL-safe characters. The
--                    only way to find a list: not derived from anything, so it cannot
--                    be guessed or enumerated.
--   lists.template   which of Zolo's own list rules made it ("for-you", "close-by", ...).
--                    The title and blurb are written by the server from the template,
--                    never taken from a browser, so nobody can publish their own words
--                    under a Zolo list. NULL is reserved for lists a person writes
--                    themselves, which a later phase adds.
--   list_places      the Google place ids, in order, and nothing else from Google
--                    (Google allows place_id to be kept; names, photos, ratings and
--                    addresses are fetched live when a page is built and never stored).
--   list_places.why  a line WE wrote for a place (a later phase). Never copied from
--                    Google, never generated from Google data.
--
-- Private by default: both tables are closed to every browser key (no policy, no
-- grants); the server reads and writes them with the service role after checking who
-- is asking. A list is removed with the account (on delete cascade). One live list
-- per person per template, so sharing the same list again updates it instead of
-- making another.
--
-- save_shared_list() makes or updates a list and its places in one transaction (so a
-- failure cannot leave a list with half its places), and enforces 3 to 10 distinct
-- places and the most lists one person may keep.
--
-- Additive: creates two tables, one function and two indexes; changes and deletes nothing.
--
-- Rollback:
--   drop function if exists public.save_shared_list(uuid, text, text, text, text, text[], integer);
--   drop table if exists public.list_places;
--   drop table if exists public.lists;

begin;

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{22}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text check (template is null or template ~ '^[a-z0-9-]{1,40}$'),
  title text not null check (char_length(title) between 1 and 80),
  blurb text check (blurb is null or char_length(blurb) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_lists_user_template on public.lists (user_id, template) where template is not null;
create index if not exists idx_lists_user on public.lists (user_id);

create table if not exists public.list_places (
  list_id uuid not null references public.lists(id) on delete cascade,
  position integer not null check (position between 1 and 10),
  -- (length and shape are separate checks: Postgres caps a regex repeat count at 255)
  place_id text not null check (char_length(place_id) between 10 and 300 and place_id ~ '^[A-Za-z0-9_-]+$'),
  why text check (why is null or char_length(why) between 1 and 140),
  primary key (list_id, position),
  unique (list_id, place_id)
);

alter table public.lists enable row level security;
alter table public.list_places enable row level security;
revoke all on public.lists from anon, authenticated;
revoke all on public.list_places from anon, authenticated;

create or replace function public.save_shared_list(
  p_user uuid,
  p_token text,
  p_template text,
  p_title text,
  p_blurb text,
  p_place_ids text[],
  p_max_lists integer
)
returns table (out_token text, out_created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
  v_created boolean;
  v_count integer;
  v_places integer := coalesce(array_length(p_place_ids, 1), 0);
begin
  if v_places < 3 or v_places > 10 then
    raise exception 'a list holds three to ten places' using errcode = '22023';
  end if;
  if (select count(distinct x) from unnest(p_place_ids) as x) <> v_places then
    raise exception 'a list cannot hold a place twice' using errcode = '22023';
  end if;

  select l.id, l.token into v_id, v_token
    from public.lists l
   where l.user_id = p_user and l.template = p_template
     for update;

  if found then
    update public.lists set title = p_title, blurb = p_blurb, updated_at = now() where id = v_id;
    delete from public.list_places where list_id = v_id;
    v_created := false;
  else
    select count(*) into v_count from public.lists where user_id = p_user;
    if v_count >= p_max_lists then
      raise exception 'list_limit' using errcode = 'P0001';
    end if;
    insert into public.lists (token, user_id, template, title, blurb)
    values (p_token, p_user, p_template, p_title, p_blurb)
    returning id, token into v_id, v_token;
    v_created := true;
  end if;

  insert into public.list_places (list_id, position, place_id)
  select v_id, t.ord::integer, t.pid
    from unnest(p_place_ids) with ordinality as t(pid, ord);

  return query select v_token, v_created;
end;
$$;

revoke all on function public.save_shared_list(uuid, text, text, text, text, text[], integer) from public, anon, authenticated;
grant execute on function public.save_shared_list(uuid, text, text, text, text, text[], integer) to service_role;

commit;
