import type { BudgetLevel, ExperienceCategory, InterestTag } from "@/types/database";

/** The few things a list row needs to show a place. Both a Google place and a curated one can be drawn from this. */
export interface ListPlaceExperience {
  id: string;
  slug: string;
  title: string;
  category: ExperienceCategory;
  tags: InterestTag[];
  images: string[];
  city: string;
  priceLevel: BudgetLevel;
  priceEstimate: number | null;
  isHiddenGem: boolean;
}

/** A place in the first list, as the page draws it. Built when asked, never stored. */
export interface StartPlace extends ListPlaceExperience {
  /** Miles from the visitor, when we know where they are (not after a reload: that is not kept). */
  distanceMiles: number | null;
  /** The line under the place: why it is here. Null when we hold nothing worth saying. */
  why: string | null;
  /** The owner has marked this place as a local pick (see lib/local-picks). */
  localPick?: boolean;
}

export interface FirstList {
  title: string;
  blurb: string;
  places: StartPlace[];
}
