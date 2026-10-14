import { unstable_cache } from "next/cache";
import { ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_ACTIVE_SHARE_LINKS, SHARE_CACHE_SECONDS, type ShareKind } from "@/lib/config/share";
import { cleanFirstName } from "./input";
import { generateShareToken, shareTag } from "./token";

/**
 * Share links, read and written on the server with the service role. The table is
 * closed to every browser key, so nothing here can be done from a browser without
 * passing through a route that has checked who is asking.
 */

export type ShareTarget = { kind: "place"; placeId: string } | { kind: "plan"; itineraryId: string };

export interface ShareLink {
  token: string;
  kind: ShareKind;
  placeId: string | null;
  itineraryId: string | null;
  note: string | null;
  showName: boolean;
}

/** What a share page needs to render: never an id of a person. */
export interface PublicShare {
  kind: ShareKind;
  placeId: string | null;
  itineraryId: string | null;
  note: string | null;
  /** The sharer's first name, present ONLY if they ticked the box. */
  sharerName: string | null;
}

const COLUMNS = "token, kind, place_id, itinerary_id, note, show_name";

function rowToLink(row: Record<string, unknown>): ShareLink {
  return {
    token: row.token as string,
    kind: row.kind as ShareKind,
    placeId: (row.place_id as string | null) ?? null,
    itineraryId: (row.itinerary_id as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    showName: Boolean(row.show_name),
  };
}

/** The person's live link for this exact target, if they have one. */
export async function findShareLink(userId: string, target: ShareTarget): Promise<ShareLink | null> {
  const query = createAdminClient().from("share_links").select(COLUMNS).eq("user_id", userId).eq("kind", target.kind);
  const { data, error } =
    target.kind === "place"
      ? await query.eq("place_id", target.placeId).maybeSingle()
      : await query.eq("itinerary_id", target.itineraryId).maybeSingle();
  if (error) throw new Error(`[share] could not look up the link: ${error.message}`);
  return data ? rowToLink(data) : null;
}

/** Whether this plan belongs to this person. A plan that is not theirs is reported as not found. */
export async function userOwnsItinerary(userId: string, itineraryId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from("itineraries").select("id").eq("id", itineraryId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`[share] could not check the plan: ${error.message}`);
  return Boolean(data);
}

/**
 * Makes the person's link for this target, or updates the one they already have
 * (sharing the same thing twice never makes a second link). Returns whether a new
 * link was made, so the caller records the event once.
 */
export async function saveShareLink(params: {
  userId: string;
  target: ShareTarget;
  note: string | null;
  showName: boolean;
}): Promise<{ link: ShareLink; created: boolean }> {
  const admin = createAdminClient();
  const { userId, target, note, showName } = params;

  const existing = await findShareLink(userId, target);
  if (existing) {
    const { data, error } = await admin
      .from("share_links")
      .update({ note, show_name: showName })
      .eq("token", existing.token)
      .eq("user_id", userId)
      .select(COLUMNS)
      .single();
    if (error) throw new Error(`[share] could not update the link: ${error.message}`);
    return { link: rowToLink(data), created: false };
  }

  const { count, error: countError } = await admin.from("share_links").select("token", { count: "exact", head: true }).eq("user_id", userId);
  if (countError) throw new Error(`[share] could not count links: ${countError.message}`);
  if ((count ?? 0) >= MAX_ACTIVE_SHARE_LINKS) {
    throw new ApiError(409, "You have reached the limit of shared links. Turn one off to share another.");
  }

  // A second pass covers the two rare collisions: a token that already exists
  // (2^-128) and a parallel request that made this person's link first.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin
      .from("share_links")
      .insert({
        token: generateShareToken(),
        user_id: userId,
        kind: target.kind,
        place_id: target.kind === "place" ? target.placeId : null,
        itinerary_id: target.kind === "plan" ? target.itineraryId : null,
        note,
        show_name: showName,
      })
      .select(COLUMNS)
      .single();
    if (!error) return { link: rowToLink(data), created: true };
    if (error.code !== "23505") throw new Error(`[share] could not make the link: ${error.message}`);

    const raced = await findShareLink(userId, target);
    if (raced) return { link: raced, created: false };
  }
  throw new Error("[share] could not make a unique link");
}

/** Turns a link off by deleting it. True if it was this person's and is now gone. */
export async function deleteShareLink(userId: string, token: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from("share_links").delete().eq("token", token).eq("user_id", userId).select("token");
  if (error) throw new Error(`[share] could not turn the link off: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

class ShareNotFound extends Error {}

async function loadPublicShare(token: string): Promise<PublicShare> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("share_links")
    .select("kind, place_id, itinerary_id, note, show_name, user_id")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(`[share] could not read the link: ${error.message}`);
  if (!data) throw new ShareNotFound();

  let sharerName: string | null = null;
  if (data.show_name) {
    const { data: profile } = await admin.from("profiles").select("first_name").eq("user_id", data.user_id).maybeSingle();
    sharerName = cleanFirstName(profile?.first_name);
  }
  return {
    kind: data.kind as ShareKind,
    placeId: data.place_id ?? null,
    itineraryId: data.itinerary_id ?? null,
    note: data.note ?? null,
    sharerName,
  };
}

/**
 * The public face of a link, or null when there is none (never made, or turned off:
 * the same answer for both). A hit is reused for SHARE_CACHE_SECONDS and carries the
 * link's tag, so turning the link off, or changing its note or name, expires it
 * (and the pages built from it) at once. A miss throws inside the cache and is
 * therefore never stored, so guessing tokens cannot fill the cache.
 */
export async function getPublicShare(token: string): Promise<PublicShare | null> {
  try {
    return await unstable_cache(() => loadPublicShare(token), ["share-link", token], {
      tags: [shareTag(token)],
      revalidate: SHARE_CACHE_SECONDS,
    })();
  } catch (err) {
    if (err instanceof ShareNotFound) return null;
    throw err;
  }
}
