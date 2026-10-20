import type { Experience, Profile } from "@/types/database";

/**
 * The one line under a place in a list: why it is there. It is built from facts
 * we actually hold about the place and the person, never from a quality we cannot
 * know ("quiet" needs data we do not have, so it is never claimed). At most three
 * facts, strongest first, as a calm fragment: "Matches your taste for music, low
 * cost, highly rated".
 *
 * Computed when the list is drawn and never stored: part of it comes from Google's
 * data (price level, rating), which we may not keep.
 */

/** Joins ["a", "b", "c"] as "a, b and c" for the interest phrase. */
function andList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Whether a place is rated well by enough people for "highly rated" to be fair. */
export function isHighlyRated(experience: Pick<Experience, "rating" | "reviewCount">): boolean {
  return experience.rating != null && experience.rating >= 4.5 && experience.reviewCount >= 50;
}

export function whyThisPick(experience: Experience, profile: Pick<Profile, "interests">): string | null {
  const facts: string[] = [];

  // COPY: the clause that names what the person likes, when the place matches it
  const shared = experience.tags.filter((t) => profile.interests.includes(t)).slice(0, 2);
  if (shared.length > 0) facts.push(`Matches your taste for ${andList(shared)}`);

  // COPY: the clauses for price, rating and setting
  if (experience.priceLevel === "free") facts.push("free");
  else if (experience.priceLevel === "low") facts.push("low cost");

  if (isHighlyRated(experience)) facts.push("highly rated");
  else if (experience.isHiddenGem) facts.push("off the usual path");

  if (experience.bestTimeOfDay === "night" || experience.bestTimeOfDay === "evening") facts.push("best after dark");
  else if (experience.indoorOutdoor === "indoor") facts.push("indoors");

  if (facts.length === 0) return null;
  const line = facts.slice(0, 3).join(", ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}
