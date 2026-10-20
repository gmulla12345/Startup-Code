import { cache } from "react";
import { fetchPlacePreview, type PlacePreviewResult } from "@/lib/share/place-preview";
import { isShareToken } from "@/lib/share/token";
import { LIST_TIMEZONE } from "@/lib/config/lists";
import { getPublicList } from "./store";
import { throughLine, todayIn, windowState } from "./window";

/**
 * Everything the shared-list page is built from, for one token. The list itself
 * (its title, its line of copy, the place ids) is cached and tagged, so turning a
 * list off expires it; each place's Google details are cached by place id (the same
 * entries share links use), so every list and every viewer shares one call per place
 * per hour. React's cache() makes the page and its metadata one lookup per request.
 */

export interface ListViewItem {
  placeId: string;
  place: PlacePreviewResult;
  /** Our own line under the place (a house list's), never Google's. */
  why: string | null;
}

export interface ListView {
  token: string;
  title: string;
  blurb: string | null;
  items: ListViewItem[];
  /** "Through Sunday", for a list with an end date that is still open. */
  through: string | null;
  /** The list's last day has passed: nothing of it is shown, and Google is not asked about its places. */
  ended: boolean;
}

export const loadListView = cache(async (token: string): Promise<ListView | null> => {
  // A token has one exact shape. Anything else is not a link: no database read, no cache entry.
  if (!isShareToken(token)) return null;

  const list = await getPublicList(token);
  if (!list) return null;

  // A list with dates is shown only inside them: not before it opens (it does not exist yet), and, once it is over, only as
  // a notice that it has ended. Computed here, from today's date, not stored with the cached list.
  const today = todayIn(LIST_TIMEZONE);
  const state = windowState(list, today);
  if (state === "upcoming") return null;
  if (state === "ended") return { token, title: list.title, blurb: list.blurb, items: [], through: null, ended: true };

  const items = await Promise.all(
    list.placeIds.map(async (placeId, i) => ({ placeId, place: await fetchPlacePreview(placeId, "list_preview"), why: list.whys[i] ?? null }))
  );
  return { token, title: list.title, blurb: list.blurb, items, through: list.endsOn ? throughLine(list.endsOn, today) : null, ended: false };
});
