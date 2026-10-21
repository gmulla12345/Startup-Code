import { ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_OWN_LISTS, listPath } from "@/lib/config/lists";
import { PLACE_ID_PREFIX } from "@/lib/google/place-id";
import { generateShareToken } from "@/lib/share/token";
import type { OwnListInput } from "./own-input";

/**
 * Lists a person makes themselves, read and written on the server with the service role (the tables are closed to every
 * browser key), always for the person asking and never from an id in a request alone. A list is private unless its owner
 * chose otherwise; whether a link opens is decided by lists.is_public (see lib/lists/store.ts), not here.
 */

export interface OwnList {
  id: string;
  /** The address of its page. Only opens when the list is public. */
  token: string;
  title: string;
  blurb: string | null;
  isPublic: boolean;
  showName: boolean;
  /** The Google place ids, in order. */
  placeIds: string[];
  updatedAt: string;
}

function toOwnList(row: Record<string, unknown>, placeIds: string[]): OwnList {
  return {
    id: row.id as string,
    token: row.token as string,
    title: row.title as string,
    blurb: (row.blurb as string | null) ?? null,
    isPublic: Boolean(row.is_public),
    showName: Boolean(row.show_name),
    placeIds,
    updatedAt: row.updated_at as string,
  };
}

/** What the API says about a list: never the token on its own, and a link only while the list is public. */
export function presentOwnList(list: OwnList, origin: string) {
  return {
    id: list.id,
    title: list.title,
    blurb: list.blurb,
    experienceIds: list.placeIds.map((id) => `${PLACE_ID_PREFIX}${id}`),
    isPublic: list.isPublic,
    showName: list.showName,
    // The address exists only while the list is public: a private list has no link to give out.
    url: list.isPublic ? `${origin}${listPath(list.token)}` : null,
    updatedAt: list.updatedAt,
  };
}

const COLUMNS = "id, token, title, blurb, is_public, show_name, updated_at";

/** The person's own lists, newest change first. */
export async function listOwnLists(userId: string): Promise<OwnList[]> {
  const admin = createAdminClient();
  const { data: lists, error } = await admin.from("lists").select(COLUMNS).eq("user_id", userId).is("template", null).order("updated_at", { ascending: false });
  if (error) throw new Error(`[own-lists] could not read the lists: ${error.message}`);
  if (!lists || lists.length === 0) return [];
  const { data: places, error: placesError } = await admin.from("list_places").select("list_id, place_id, position").in("list_id", lists.map((l) => l.id)).order("position", { ascending: true });
  if (placesError) throw new Error(`[own-lists] could not read the places: ${placesError.message}`);
  return lists.map((l) => toOwnList(l, (places ?? []).filter((p) => p.list_id === l.id).map((p) => p.place_id as string)));
}

/** One of the person's own lists, or null when there is none with that id that is theirs. */
export async function getOwnList(userId: string, id: string): Promise<OwnList | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const admin = createAdminClient();
  const { data: list, error } = await admin.from("lists").select(COLUMNS).eq("id", id).eq("user_id", userId).is("template", null).maybeSingle();
  if (error) throw new Error(`[own-lists] could not read the list: ${error.message}`);
  if (!list) return null;
  const { data: places, error: placesError } = await admin.from("list_places").select("place_id, position").eq("list_id", id).order("position", { ascending: true });
  if (placesError) throw new Error(`[own-lists] could not read the places: ${placesError.message}`);
  return toOwnList(list, (places ?? []).map((p) => p.place_id as string));
}

/** A list may hold only places the person has saved (a real save of theirs, from Google), so it cannot be made of arbitrary ids. */
export async function assertPlacesSaved(userId: string, placeIds: readonly string[]): Promise<void> {
  const experienceIds = placeIds.map((id) => `${PLACE_ID_PREFIX}${id}`);
  const { data, error } = await createAdminClient().from("saved_experiences").select("experience_id").eq("user_id", userId).in("experience_id", experienceIds);
  if (error) throw new Error(`[own-lists] could not check the saved places: ${error.message}`);
  const have = new Set((data ?? []).map((r) => r.experience_id as string));
  if (!experienceIds.every((id) => have.has(id))) throw new ApiError(400, "A list can hold only places you have saved.");
}

export interface SavedOwnList {
  list: OwnList;
  created: boolean;
  /** The address it had before this change, when the change gave it a new one (it was private and is now public). */
  replacedToken: string | null;
  /** True when this change is what made it public: a new link now exists. */
  madePublic: boolean;
}

/**
 * Makes a list of the person's own (id null) or changes one of theirs, in one transaction. Going from private to public
 * gives the list a new address, so a link that was turned off never works again for someone who kept it.
 */
export async function saveOwnList(userId: string, id: string | null, input: OwnListInput): Promise<SavedOwnList> {
  await assertPlacesSaved(userId, input.placeIds);
  const before = id ? await getOwnList(userId, id) : null;
  if (id && !before) throw new ApiError(404, "List not found.");

  const admin = createAdminClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin.rpc("save_user_list", {
      p_user: userId,
      p_id: id,
      p_token: generateShareToken(),
      p_title: input.title,
      p_blurb: input.blurb,
      p_place_ids: input.placeIds,
      p_public: input.isPublic,
      p_show_name: input.showName,
      p_max_lists: MAX_OWN_LISTS,
    });
    if (!error) {
      const row = (Array.isArray(data) ? data[0] : data) as { out_id?: string; out_token?: string; out_old_token?: string | null; out_created?: boolean } | null;
      if (!row?.out_id || !row.out_token) throw new Error("[own-lists] the list was saved but nothing came back");
      const list = await getOwnList(userId, row.out_id);
      if (!list) throw new Error("[own-lists] the list was saved but could not be read back");
      const replaced = row.out_old_token && row.out_old_token !== row.out_token ? row.out_old_token : null;
      return { list, created: Boolean(row.out_created), replacedToken: replaced, madePublic: input.isPublic && (Boolean(row.out_created) || before?.isPublic === false) };
    }
    if (error.message?.includes("list_limit")) throw new ApiError(409, `You can keep up to ${MAX_OWN_LISTS} lists. Delete one to make another.`);
    if (error.message?.includes("list_not_found")) throw new ApiError(404, "List not found.");
    if (error.code === "22023") throw new ApiError(400, "A list holds three to ten places, each once.");
    if (error.code !== "23505") throw new Error(`[own-lists] could not save the list: ${error.message}`);
  }
  throw new Error("[own-lists] could not make a unique link");
}

/** Deletes one of the person's own lists. Returns the address it had, so its cached page can be dropped, or null if it was not theirs. */
export async function deleteOwnList(userId: string, id: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await createAdminClient().from("lists").delete().eq("id", id).eq("user_id", userId).is("template", null).select("token");
  if (error) throw new Error(`[own-lists] could not delete the list: ${error.message}`);
  return data && data.length > 0 ? (data[0].token as string) : null;
}
