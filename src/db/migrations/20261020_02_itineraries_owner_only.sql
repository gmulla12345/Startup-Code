-- Phase 4: close the old way of sharing a plan.
--
-- Until now a plan was shared by setting itineraries.is_public = true, and the
-- row-level-security policies let ANYONE holding the public database key read
-- every public itinerary and its items. That means shared plans could be listed
-- and read without knowing any link, which is the opposite of "unguessable". Plan
-- sharing now goes through share_links (migration 20261020_01), which the server
-- reads with its own key, so these policies no longer need to expose anything.
--
-- This changes who can READ itineraries and itinerary_items to their owner only.
-- No row is changed or deleted. At the time of writing there are no itineraries at
-- all (0 rows, 0 public), so no existing link stops working. The is_public and
-- share_slug columns are left in place, unused, so nothing else has to change.
--
-- Rollback (restores the old public-read behaviour; not recommended):
--   drop policy if exists "own itineraries" on public.itineraries;
--   create policy "own or public itineraries" on public.itineraries for select using (auth.uid() = user_id or is_public = true);
--   drop policy if exists "itinerary items via parent" on public.itinerary_items;
--   create policy "itinerary items via parent" on public.itinerary_items for all using (
--     exists (select 1 from public.itineraries i where i.id = itinerary_id and (i.user_id = auth.uid() or i.is_public = true))
--   ) with check (
--     exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = auth.uid())
--   );

begin;

drop policy if exists "own or public itineraries" on public.itineraries;
drop policy if exists "own itineraries" on public.itineraries;
create policy "own itineraries" on public.itineraries for select using (auth.uid() = user_id);

drop policy if exists "itinerary items via parent" on public.itinerary_items;
create policy "itinerary items via parent" on public.itinerary_items for all using (
  exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = auth.uid())
) with check (
  exists (select 1 from public.itineraries i where i.id = itinerary_id and i.user_id = auth.uid())
);

commit;
