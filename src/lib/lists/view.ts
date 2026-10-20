import { cache } from "react";
import { fetchPlacePreview, type PlacePreviewResult } from "@/lib/share/place-preview";
import { isShareToken } from "@/lib/share/token";
import { getPublicList } from "./store";

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
}

export interface ListView {
  token: string;
  title: string;
  blurb: string | null;
  items: ListViewItem[];
}

export const loadListView = cache(async (token: string): Promise<ListView | null> => {
  // A token has one exact shape. Anything else is not a link: no database read, no cache entry.
  if (!isShareToken(token)) return null;

  const list = await getPublicList(token);
  if (!list) return null;

  const items = await Promise.all(
    list.placeIds.map(async (placeId) => ({ placeId, place: await fetchPlacePreview(placeId, "list_preview") }))
  );
  return { token, title: list.title, blurb: list.blurb, items };
});
