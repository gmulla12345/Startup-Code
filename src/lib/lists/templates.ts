import { CLOSE_BY_MILES } from "@/lib/config/lists";
import type { Experience } from "@/types/database";

/**
 * The lists made for a person, each a plain rule over places that are already
 * ranked for them. A rule may only use what we actually know about a place (its
 * price level, whether it is indoors, the time of day it suits, how far it is);
 * nothing here claims a quality we have no data for.
 *
 * A template's id is stored with a shared list; its title and blurb are always
 * read from here, never from the browser, so no one can publish their own words
 * under a Zolo list.
 */

/** A recommended place, with how far it is from the person when we know. */
export interface PoolItem {
  experience: Experience;
  matchScore: number;
  distanceMiles: number | null;
}

export const LIST_TEMPLATE_IDS = ["for-you", "close-by", "after-dark", "easy-on-the-wallet", "indoors", "less-obvious"] as const;
export type ListTemplateId = (typeof LIST_TEMPLATE_IDS)[number];

export interface ListTemplate {
  id: ListTemplateId;
  title: string;
  blurb: string;
  /** The places this list holds, best first. Fewer than LIST_MIN_PLACES means the list is not shown. */
  select: (pool: readonly PoolItem[]) => PoolItem[];
}

const byScore = (a: PoolItem, b: PoolItem) => b.matchScore - a.matchScore;

export const LIST_TEMPLATES: readonly ListTemplate[] = [
  {
    id: "for-you",
    // COPY: title and blurb for the list chosen from what the person said they like
    title: "Chosen for you",
    blurb: "Drawn from what you told us you like.",
    select: (pool) => [...pool].sort(byScore),
  },
  {
    id: "close-by",
    // COPY: title and blurb for the nearest places
    title: "Close by",
    blurb: "The nearest good things, nearest first.",
    select: (pool) =>
      pool
        .filter((p) => p.distanceMiles != null && p.distanceMiles <= CLOSE_BY_MILES)
        .sort((a, b) => (a.distanceMiles as number) - (b.distanceMiles as number)),
  },
  {
    id: "after-dark",
    // COPY: title and blurb for places that suit the evening and night
    title: "After dark",
    blurb: "For when the day is done.",
    select: (pool) => pool.filter((p) => p.experience.bestTimeOfDay === "evening" || p.experience.bestTimeOfDay === "night").sort(byScore),
  },
  {
    id: "easy-on-the-wallet",
    // COPY: title and blurb for free and low-cost places
    title: "Light on the wallet",
    blurb: "Good hours that cost little or nothing.",
    select: (pool) => pool.filter((p) => p.experience.priceLevel === "free" || p.experience.priceLevel === "low").sort(byScore),
  },
  {
    id: "indoors",
    // COPY: title and blurb for places under a roof
    title: "Under a roof",
    blurb: "For when the weather has other plans.",
    select: (pool) => pool.filter((p) => p.experience.indoorOutdoor === "indoor").sort(byScore),
  },
  {
    id: "less-obvious",
    // COPY: title and blurb for the less-known places
    title: "Less obvious",
    blurb: "Quieter than the usual names.",
    select: (pool) => pool.filter((p) => p.experience.isHiddenGem).sort(byScore),
  },
];

export function getListTemplate(id: unknown): ListTemplate | undefined {
  return LIST_TEMPLATES.find((t) => t.id === id);
}

export function isListTemplateId(value: unknown): value is ListTemplateId {
  return typeof value === "string" && (LIST_TEMPLATE_IDS as readonly string[]).includes(value);
}
