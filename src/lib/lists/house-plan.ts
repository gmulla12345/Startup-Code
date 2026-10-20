import { LIST_MAX_PLACES, LIST_MIN_PLACES } from "@/lib/config/lists";
import { isDateString } from "./window";

/**
 * What a house list (a list we write ourselves, see lists/house.ts) may contain, checked in one place so
 * the script that creates it and the tests agree. The limits are the database's own (title 80, copy 160,
 * a line under a place 140, three to ten distinct Google place ids), so a list that passes here is one the
 * database will accept; the dates must be real calendar dates and the last day cannot come before the first.
 */

const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

export interface HouseListInput {
  title: string;
  blurb?: string | null;
  places: { placeId: string; why?: string | null }[];
  startsOn?: string | null;
  endsOn?: string | null;
}

export interface HouseListPlan {
  list: { title: string; blurb: string | null; starts_on: string | null; ends_on: string | null };
  places: { position: number; place_id: string; why: string | null }[];
}

const clean = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

export function planHouseList(input: HouseListInput): HouseListPlan {
  const title = clean(input.title);
  if (title.length < 1 || title.length > 80) throw new Error("The title must be 1 to 80 characters.");
  const blurb = clean(input.blurb);
  if (blurb.length > 160) throw new Error("The line of copy must be at most 160 characters.");

  if (input.places.length < LIST_MIN_PLACES || input.places.length > LIST_MAX_PLACES) {
    throw new Error(`A list holds ${LIST_MIN_PLACES} to ${LIST_MAX_PLACES} places, not ${input.places.length}.`);
  }
  const seen = new Set<string>();
  const places = input.places.map((p, i) => {
    const placeId = (p.placeId ?? "").trim();
    if (!PLACE_ID.test(placeId)) throw new Error(`"${placeId}" is not a Google place id (letters, digits, hyphens and underscores, 10 or more).`);
    if (seen.has(placeId)) throw new Error(`The place ${placeId} is in the list twice.`);
    seen.add(placeId);
    const why = clean(p.why);
    if (why.length > 140) throw new Error(`The line under place ${i + 1} must be at most 140 characters.`);
    return { position: i + 1, place_id: placeId, why: why || null };
  });

  const startsOn = input.startsOn ? input.startsOn.trim() : null;
  const endsOn = input.endsOn ? input.endsOn.trim() : null;
  if (startsOn !== null && !isDateString(startsOn)) throw new Error(`"${startsOn}" is not a date. Write it as YYYY-MM-DD.`);
  if (endsOn !== null && !isDateString(endsOn)) throw new Error(`"${endsOn}" is not a date. Write it as YYYY-MM-DD.`);
  if (startsOn && endsOn && endsOn < startsOn) throw new Error("The last day cannot come before the first day.");

  return { list: { title, blurb: blurb || null, starts_on: startsOn, ends_on: endsOn }, places };
}

/** Parses the script's "--place ChIJ...=Our line" into a place and an optional line; the id never contains "=". */
export function parsePlaceArg(arg: string): { placeId: string; why: string | null } {
  const at = arg.indexOf("=");
  return at < 0 ? { placeId: arg.trim(), why: null } : { placeId: arg.slice(0, at).trim(), why: arg.slice(at + 1).trim() || null };
}

/** Words that break the brand's voice, for a warning (not a refusal: they are the owner's own words). */
export function voiceWarnings(texts: (string | null | undefined)[]): string[] {
  const joined = texts.filter(Boolean).join(" ");
  const warnings: string[] = [];
  if (/!/.test(joined)) warnings.push("There is an exclamation point. The brand's voice does not use them.");
  if (/\p{Extended_Pictographic}/u.test(joined)) warnings.push("There is an emoji. The brand's voice does not use them.");
  return warnings;
}
