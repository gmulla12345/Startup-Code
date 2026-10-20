import { CLOSE_BY_MILES } from "@/lib/config/lists";
import type { Experience, Profile } from "@/types/database";
import type { ListTemplateId } from "./templates";

/**
 * The one line under a place in a list: why it is there. It is built from facts
 * we actually hold about the place and the person, never from a quality we cannot
 * know ("quiet" needs data we do not have, so it is never claimed). At most three
 * facts, as a calm fragment: "Close to you, free, highly rated".
 *
 * Under a list made by a rule, the fact that put the place on that list leads, so
 * the line always says why it is in THIS list (a place under "After dark" begins
 * "Best after dark"). The rest follow in a fixed order: what the person likes,
 * price, quality, setting.
 *
 * Computed when the list is drawn and never stored: part of it comes from Google's
 * data (price level, rating), which we may not keep. Nothing here calls a model: every
 * phrase is a fixed one backed by a field, which costs nothing and cannot be wrong
 * about a place in the way a written sentence could.
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

/** What else is known when the line is drawn: which rule made the list, and how far the place is from the person. */
export interface WhyContext {
  list?: ListTemplateId;
  distanceMiles?: number | null;
}

// COPY: the clauses for each fact, in the order they are said
const CLAUSE = {
  close: "close to you",
  afterDark: "best after dark",
  free: "free",
  lowCost: "low cost",
  highlyRated: "highly rated",
  offThePath: "off the usual path",
  indoors: "indoors",
} as const;

export function whyThisPick(experience: Experience, profile: Pick<Profile, "interests">, context: WhyContext = {}): string | null {
  const facts: string[] = [];
  const add = (fact: string) => {
    if (!facts.includes(fact)) facts.push(fact);
  };

  const evening = experience.bestTimeOfDay === "night" || experience.bestTimeOfDay === "evening";
  const price = experience.priceLevel === "free" ? CLAUSE.free : experience.priceLevel === "low" ? CLAUSE.lowCost : null;

  // The fact that put the place on this list leads: the line then always explains the list it sits under.
  switch (context.list) {
    case "close-by":
      if (context.distanceMiles != null && context.distanceMiles <= CLOSE_BY_MILES) add(CLAUSE.close);
      break;
    case "after-dark":
      if (evening) add(CLAUSE.afterDark);
      break;
    case "easy-on-the-wallet":
      if (price) add(price);
      break;
    case "indoors":
      if (experience.indoorOutdoor === "indoor") add(CLAUSE.indoors);
      break;
    case "less-obvious":
      if (experience.isHiddenGem) add(CLAUSE.offThePath);
      break;
  }

  // COPY: the clause that names what the person likes, when the place matches it
  const shared = experience.tags.filter((t) => profile.interests.includes(t)).slice(0, 2);
  if (shared.length > 0) add(`matches your taste for ${andList(shared)}`);

  if (price) add(price);
  if (isHighlyRated(experience)) add(CLAUSE.highlyRated);
  if (experience.isHiddenGem) add(CLAUSE.offThePath);
  if (evening) add(CLAUSE.afterDark);
  else if (experience.indoorOutdoor === "indoor") add(CLAUSE.indoors);

  if (facts.length === 0) return null;
  const line = facts.slice(0, 3).join(", ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}
