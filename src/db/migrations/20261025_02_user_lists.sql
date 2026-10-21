-- Phase 7b: lists a person makes themselves, private unless they choose otherwise.
--
-- A person can make a list of their own from places they have saved: a title and a line of copy they write, and three
-- to ten places. It is PRIVATE to them by default. If they choose, it becomes a link anyone who has it can open (not
-- listed anywhere, not indexed), and they may also choose to show their first name on it ("By Maya").
--
-- Uses the lists tables as they are (template stays null for these: that is what "a list a person writes themselves"
-- always meant). Two columns say who may see it:
--
--   is_public   may the link open? Default true, because every list that exists today IS a public link (a list made from
--               a Zolo rule is shared by making it, and a house list is public). A list a person makes is saved with it
--               false unless they choose. A private list answers 404 at its address exactly like one that never existed.
--   show_name   show the author's first name on the page. Default false. The first name is read from the profile when the
--               page is built (never stored here), only if this is true and the list is public.
--
-- save_user_list() makes or updates one of the person's own lists and its places in one transaction. It enforces three to
-- ten distinct places, the most own lists one person may keep, and that only the owner may change it. The token (the
-- address) is replaced whenever a list goes from private to public, so a link that was turned off never works again for
-- someone who kept it; the old token is returned so the caller can expire the page cached under it.
--
-- Closed to every browser key, as the tables already are. Additive: two columns with defaults (every row already there
-- keeps working unchanged), one index and one function.
--
-- Rollback:
--   drop function if exists public.save_user_list(uuid, uuid, text, text, text, text[], boolean, boolean, integer);
--   drop index if exists public.idx_lists_user_own;
--   alter table public.lists drop column if exists is_public;
--   alter table public.lists drop column if exists show_name;

begin;

alter table public.lists add column if not exists is_public boolean not null default true;
alter table public.lists add column if not exists show_name boolean not null default false;

create index if not exists idx_lists_user_own on public.lists (user_id, updated_at desc) where template is null and user_id is not null;

create or replace function public.save_user_list(
  p_user uuid,
  p_id uuid,
  p_token text,
  p_title text,
  p_blurb text,
  p_place_ids text[],
  p_public boolean,
  p_show_name boolean,
  p_max_lists integer
)
returns table (out_id uuid, out_token text, out_old_token text, out_created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
  v_old text;
  v_was_public boolean;
  v_count integer;
  v_places integer := coalesce(array_length(p_place_ids, 1), 0);
begin
  if v_places < 3 or v_places > 10 then
    raise exception 'a list holds three to ten places' using errcode = '22023';
  end if;
  if (select count(distinct x) from unnest(p_place_ids) as x) <> v_places then
    raise exception 'a list cannot hold a place twice' using errcode = '22023';
  end if;

  if p_id is null then
    select count(*) into v_count from public.lists where user_id = p_user and template is null;
    if v_count >= p_max_lists then
      raise exception 'list_limit' using errcode = 'P0001';
    end if;
    insert into public.lists (token, user_id, template, title, blurb, is_public, show_name)
    values (p_token, p_user, null, p_title, p_blurb, coalesce(p_public, false), coalesce(p_public, false) and coalesce(p_show_name, false))
    returning id, token into v_id, v_token;
    v_old := null;
    insert into public.list_places (list_id, position, place_id)
    select v_id, t.ord::integer, t.pid from unnest(p_place_ids) with ordinality as t(pid, ord);
    return query select v_id, v_token, v_old, true;
    return;
  end if;

  select l.id, l.token, l.is_public into v_id, v_old, v_was_public
    from public.lists l
   where l.id = p_id and l.user_id = p_user and l.template is null
     for update;
  if not found then
    raise exception 'list_not_found' using errcode = 'P0002';
  end if;

  -- going from private to public: a new address, so an old link can never open it again
  v_token := case when coalesce(p_public, false) and not v_was_public then p_token else v_old end;

  update public.lists
     set title = p_title,
         blurb = p_blurb,
         token = v_token,
         is_public = coalesce(p_public, false),
         show_name = coalesce(p_public, false) and coalesce(p_show_name, false),
         updated_at = now()
   where id = v_id;
  delete from public.list_places where list_id = v_id;
  insert into public.list_places (list_id, position, place_id)
  select v_id, t.ord::integer, t.pid from unnest(p_place_ids) with ordinality as t(pid, ord);

  return query select v_id, v_token, v_old, false;
end;
$$;

revoke all on function public.save_user_list(uuid, uuid, text, text, text, text[], boolean, boolean, integer) from public, anon, authenticated;
grant execute on function public.save_user_list(uuid, uuid, text, text, text, text[], boolean, boolean, integer) to service_role;

commit;
