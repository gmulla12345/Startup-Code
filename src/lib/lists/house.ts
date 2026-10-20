import { createAdminClient } from "@/lib/supabase/admin";
import { HOUSE_LISTS_ON_HOME, LIST_MIN_PLACES, LIST_TIMEZONE } from "@/lib/config/lists";
import { PLACE_ID_PREFIX } from "@/lib/google/place-id";
import { usageContext } from "@/lib/usage/context";
import { distanceMiles } from "@/lib/utils/geo";
import { getExperienceProvider } from "@/services/providers";
import type { Profile } from "@/types/database";
import type { HomeList } from "./build";
import { whyThisPick } from "./reasons";
import { isDateString, throughLine, todayIn } from "./window";

/**
 * "This week's lists": lists we write ourselves (a title, a line of copy, places, and our own
 * line under each), optionally with a first and last day. Home shows the ones open today, newest
 * first, above the lists made for the person, and drops one the day after it ends with no one
 * lifting a finger: it is simply no longer found. They are written with
 * scripts/create-house-list.ts and read here with the service role.
 */

export interface HouseListRow {
  token: string;
  title: string;
  blurb: string | null;
  startsOn: string | null;
  endsOn: string | null;
  places: { placeId: string; why: string | null }[];
}

/** The house lists whose window includes `today`, newest first. A list with no dates is always included. */
export async function getActiveHouseLists(today: string, limit: number = HOUSE_LISTS_ON_HOME): Promise<HouseListRow[]> {
  // `today` is interpolated into a filter below: it must be a real date, never anything else.
  if (!isDateString(today)) throw new Error("[house-lists] today must be a date");
  const admin = createAdminClient();

  const { data: lists, error } = await admin
    .from("lists")
    .select("id, token, title, blurb, starts_on, ends_on")
    .is("user_id", null)
    .or(`starts_on.is.null,starts_on.lte.${today}`)
    .or(`ends_on.is.null,ends_on.gte.${today}`)
    .order("starts_on", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(`[house-lists] could not read the lists: ${error.message}`);
  if (!lists || lists.length === 0) return [];

  const { data: places, error: placesError } = await admin
    .from("list_places")
    .select("list_id, position, place_id, why")
    .in("list_id", lists.map((l) => l.id as string))
    .order("position", { ascending: true });
  if (placesError) throw new Error(`[house-lists] could not read the places: ${placesError.message}`);

  return lists.map((l) => ({
    token: l.token as string,
    title: l.title as string,
    blurb: (l.blurb as string | null) ?? null,
    startsOn: (l.starts_on as string | null) ?? null,
    endsOn: (l.ends_on as string | null) ?? null,
    places: (places ?? [])
      .filter((p) => p.list_id === l.id)
      .map((p) => ({ placeId: p.place_id as string, why: (p.why as string | null) ?? null })),
  }));
}

/**
 * The house lists open today, as Home draws them: each place asked for live (Google's details are
 * not ours to keep), with our own line under it, or the usual fact-based line when we wrote none.
 * A list is left out if fewer than a list's minimum of its places can be found, and a failure here
 * never breaks Home: it just shows without them.
 */
export async function loadHouseHomeLists(profile: Profile, today: string = todayIn(LIST_TIMEZONE)): Promise<HomeList[]> {
  try {
    const rows = await getActiveHouseLists(today);
    if (rows.length === 0) return [];
    const provider = await getExperienceProvider(usageContext(profile.userId, "home"));

    const lists = await Promise.all(
      rows.map(async (row): Promise<HomeList | null> => {
        const found = await Promise.all(
          row.places.map(async (p) => ({ experience: await provider.getById(`${PLACE_ID_PREFIX}${p.placeId}`).catch(() => null), why: p.why }))
        );
        const places = found.flatMap((f) =>
          f.experience
            ? [
                {
                  experience: f.experience,
                  matchScore: 0,
                  distanceMiles:
                    profile.latitude != null && profile.longitude != null
                      ? distanceMiles(profile.latitude, profile.longitude, f.experience.latitude, f.experience.longitude)
                      : null,
                  why: f.why ?? whyThisPick(f.experience, profile),
                },
              ]
            : []
        );
        if (places.length < LIST_MIN_PLACES) return null;
        return {
          key: `house-${row.token}`,
          template: "house",
          title: row.title,
          blurb: row.blurb ?? "",
          through: row.endsOn ? throughLine(row.endsOn, today) : null,
          places,
          shareIds: [],
        };
      })
    );
    return lists.filter((l): l is HomeList => l !== null);
  } catch (err) {
    console.error("[house-lists] left out of Home:", err);
    return [];
  }
}
