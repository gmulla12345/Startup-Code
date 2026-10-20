import { unstable_cache } from "next/cache";
import { ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIST_CACHE_SECONDS, MAX_SHARED_LISTS } from "@/lib/config/lists";
import { generateShareToken, isShareToken } from "@/lib/share/token";
import type { ListTemplate } from "./templates";

/**
 * Shared lists, read and written on the server with the service role. The tables are
 * closed to every browser key, so nothing here can be done from a browser without
 * passing through a route that has checked who is asking.
 */

/** What a public list page needs: never an id of a person. */
export interface PublicList {
  title: string;
  blurb: string | null;
  /** Google place ids, in order. The only Google value we keep. */
  placeIds: string[];
}

/** The cache tag for everything a list page is built from; turning a list off expires it. */
export function listTag(token: string): string {
  return `list:${token}`;
}

/** The person's live link for this template, if they have one. */
export async function findSharedList(userId: string, templateId: string): Promise<{ token: string } | null> {
  const { data, error } = await createAdminClient().from("lists").select("token").eq("user_id", userId).eq("template", templateId).maybeSingle();
  if (error) throw new Error(`[lists] could not look up the list: ${error.message}`);
  return data ? { token: data.token as string } : null;
}

/**
 * Makes the person's link for this list, or updates the one they already have for
 * the same template (sharing the same list again never makes a second link; the
 * places are replaced with the ones they are looking at now). Returns whether a new
 * link was made, so the caller records the event once.
 */
export async function saveSharedList(params: {
  userId: string;
  template: ListTemplate;
  placeIds: string[];
}): Promise<{ token: string; created: boolean }> {
  const admin = createAdminClient();
  const { userId, template, placeIds } = params;

  // A second pass covers the rare collisions: a token that already exists (2^-128) and a
  // parallel request that made this person's list first (the unique index refuses the
  // second insert, and asking again finds the first).
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin.rpc("save_shared_list", {
      p_user: userId,
      p_token: generateShareToken(),
      p_template: template.id,
      p_title: template.title,
      p_blurb: template.blurb,
      p_place_ids: placeIds,
      p_max_lists: MAX_SHARED_LISTS,
    });
    if (!error) {
      const row = (Array.isArray(data) ? data[0] : data) as { out_token?: string; out_created?: boolean } | null;
      if (!row?.out_token) throw new Error("[lists] the list was saved but no link came back");
      return { token: row.out_token, created: Boolean(row.out_created) };
    }
    if (error.message?.includes("list_limit")) {
      throw new ApiError(409, "You have reached the limit of shared lists. Turn one off to share another.");
    }
    if (error.code !== "23505") throw new Error(`[lists] could not save the list: ${error.message}`);
  }
  throw new Error("[lists] could not make a unique link");
}

/** Turns a list off by deleting it. True if it was this person's and is now gone. */
export async function deleteSharedList(userId: string, token: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from("lists").delete().eq("token", token).eq("user_id", userId).select("token");
  if (error) throw new Error(`[lists] could not turn the list off: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

class ListNotFound extends Error {}

async function loadPublicList(token: string): Promise<PublicList> {
  const admin = createAdminClient();
  const { data: list, error } = await admin.from("lists").select("id, title, blurb").eq("token", token).maybeSingle();
  if (error) throw new Error(`[lists] could not read the list: ${error.message}`);
  if (!list) throw new ListNotFound();

  const { data: places, error: placesError } = await admin.from("list_places").select("place_id, position").eq("list_id", list.id).order("position", { ascending: true });
  if (placesError) throw new Error(`[lists] could not read the places: ${placesError.message}`);

  return {
    title: list.title as string,
    blurb: (list.blurb as string | null) ?? null,
    placeIds: (places ?? []).map((p) => p.place_id as string),
  };
}

/**
 * The list behind a token, or null when there is none (never made, or turned off).
 * Reused across requests and tagged, so turning a list off or changing it drops the
 * cached page at once instead of an hour later.
 */
export async function getPublicList(token: string): Promise<PublicList | null> {
  if (!isShareToken(token)) return null;
  try {
    return await unstable_cache(() => loadPublicList(token), ["list", token], {
      tags: [listTag(token)],
      revalidate: LIST_CACHE_SECONDS,
    })();
  } catch (e) {
    if (e instanceof ListNotFound) return null;
    throw e;
  }
}
