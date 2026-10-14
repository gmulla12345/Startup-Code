import { cache } from "react";
import { unstable_cache } from "next/cache";
import { SHARE_CACHE_SECONDS } from "@/lib/config/share";
import { getPublicShare } from "./links";
import { loadPlanPreview, type PlanPreview } from "./plan-preview";
import { fetchPlacePreview, type PlacePreviewResult } from "./place-preview";
import { isShareToken, shareTag } from "./token";

/**
 * Everything the share page, its metadata and its preview image are built from,
 * for one token. Called by all three in the same request; React's cache() makes
 * that one lookup, and the pieces underneath are cached across requests (the link
 * and the plan, tagged so turning a link off expires them; the Google details,
 * by place id, so every share of one place shares one call).
 */

export type ShareView =
  | { kind: "place"; token: string; note: string | null; sharerName: string | null; place: PlacePreviewResult }
  | { kind: "plan"; token: string; note: string | null; sharerName: string | null; plan: PlanPreview };

export const loadShareView = cache(async (token: string): Promise<ShareView | null> => {
  // A token has one exact shape. Anything else is not a link: no database read, no cache entry.
  if (!isShareToken(token)) return null;

  const share = await getPublicShare(token);
  if (!share) return null;

  if (share.kind === "place" && share.placeId) {
    return { kind: "place", token, note: share.note, sharerName: share.sharerName, place: await fetchPlacePreview(share.placeId) };
  }

  if (share.kind === "plan" && share.itineraryId) {
    const itineraryId = share.itineraryId;
    const plan = await unstable_cache(() => loadPlanPreview(itineraryId), ["share-plan", itineraryId], {
      tags: [shareTag(token)],
      revalidate: SHARE_CACHE_SECONDS,
    })();
    if (!plan) return null;
    return { kind: "plan", token, note: share.note, sharerName: share.sharerName, plan };
  }

  return null;
});
