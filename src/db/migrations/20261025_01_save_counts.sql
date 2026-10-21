-- Phase 7a: "Saved by N students nearby this week".
--
-- A real count, never an estimate: how many DIFFERENT verified students, living within a radius of the person looking,
-- saved this place in the last days. It is asked for the places a page is about to show and answered only for the places
-- whose count reaches the minimum the owner has set (and never below a floor of three, so a number can never point at one
-- or two people). A place below the minimum is simply not in the answer: no number is given out.
--
-- What counts:
--   - a save (saved_experiences.status = 'saved') made in the window (created_at; unsaving deletes the row),
--   - by an account with a verified school email (profiles.edu_verified_at), because the words are "students",
--   - whose profile has a location within the radius of the viewer's own,
--   - never the viewer's own save, and each person once however many times they saved it.
-- Nothing about WHO is returned: place and count only.
--
-- The function is the only way in: callable by the server only (service role), like every other function that reads
-- across people. The viewer's location is the one on their own profile, passed in by the server.
--
-- Additive: one function and one index; changes and deletes nothing. The index makes "these places, recently" a short
-- lookup instead of a scan of every save.
--
-- Rollback:
--   drop function if exists public.place_save_counts(text[], double precision, double precision, double precision, timestamptz, uuid, integer);
--   drop index if exists public.idx_saved_experience_recent;

begin;

create index if not exists idx_saved_experience_recent on public.saved_experiences (experience_id, created_at desc);

create or replace function public.place_save_counts(
  p_experience_ids text[],
  p_lat double precision,
  p_lng double precision,
  p_radius_miles double precision,
  p_since timestamptz,
  p_viewer uuid,
  p_min integer
)
returns table (out_experience_id text, out_savers integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- A number must never point at one or two people, whatever the caller asks for.
  if p_min is null or p_min < 3 then
    raise exception 'the smallest number that may be shown is three' using errcode = '22023';
  end if;
  if p_lat is null or p_lng is null or p_radius_miles is null or p_radius_miles <= 0 then
    return;
  end if;
  if p_experience_ids is null or coalesce(array_length(p_experience_ids, 1), 0) = 0 or array_length(p_experience_ids, 1) > 200 then
    return;
  end if;

  return query
    select s.experience_id, count(distinct s.user_id)::integer
      from public.saved_experiences s
      join public.profiles p on p.user_id = s.user_id
     where s.experience_id = any (p_experience_ids)
       and s.status = 'saved'
       and s.created_at >= p_since
       and s.user_id is distinct from p_viewer
       and p.edu_verified_at is not null
       and p.latitude is not null
       and p.longitude is not null
       -- great-circle distance in miles (haversine), 3958.8 mi to the earth's radius
       and 3958.8 * 2 * asin(sqrt(
             power(sin(radians(p.latitude - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(p.latitude)) * power(sin(radians(p.longitude - p_lng) / 2), 2)
           )) <= p_radius_miles
     group by s.experience_id
    having count(distinct s.user_id) >= p_min;
end;
$$;

revoke all on function public.place_save_counts(text[], double precision, double precision, double precision, timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.place_save_counts(text[], double precision, double precision, double precision, timestamptz, uuid, integer) to service_role;

commit;
