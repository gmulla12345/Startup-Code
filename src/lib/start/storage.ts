import { FIRST_LIST_MAX_AGE_DAYS, FIRST_LIST_STORAGE_KEY } from "@/lib/config/start";
import { cleanPicks, type FirstListPick } from "./picks";
import { isBudgetId, isOutingId, type BudgetId, type OutingId } from "./questions";

/**
 * What the browser keeps of a visitor's first list, so it is still there when they
 * come back, tap into a place and return, or make an account (see ClaimFirstList):
 * the two answers, the ids of the places with their tags and category, and when. It
 * keeps no name, photo, rating, address, price or location: Google's terms do not
 * let us keep those, and the person's whereabouts are used once and not kept.
 *
 * Every read and write is wrapped, because storage can be missing or throw (a private
 * window, blocked site data, a full disk), and nothing here may break the page: when
 * storage does not work the list simply is not remembered.
 */

export interface StoredFirstList {
  v: 1;
  outing: OutingId;
  budget: BudgetId;
  picks: FirstListPick[];
  /** ISO time the list was made. */
  savedAt: string;
}

function parse(raw: string | null, now: number): StoredFirstList | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<StoredFirstList> | null;
    if (!data || data.v !== 1 || !isOutingId(data.outing) || !isBudgetId(data.budget) || typeof data.savedAt !== "string") return null;
    const age = now - Date.parse(data.savedAt);
    if (!Number.isFinite(age) || age < -60_000 || age > FIRST_LIST_MAX_AGE_DAYS * 86_400_000) return null;
    const picks = cleanPicks(data.picks);
    if (!picks) return null;
    return { v: 1, outing: data.outing, budget: data.budget, picks, savedAt: data.savedAt };
  } catch {
    return null;
  }
}

export function readFirstList(now: number = Date.now()): StoredFirstList | null {
  try {
    return parse(window.localStorage.getItem(FIRST_LIST_STORAGE_KEY), now);
  } catch {
    return null;
  }
}

export function writeFirstList(list: Omit<StoredFirstList, "v" | "savedAt">, now: number = Date.now()): void {
  try {
    // Cleaned on the way in, not trusted: only an id, tags and a category can ever be written,
    // whatever a caller hands over, so no Google content can reach the browser's storage.
    const picks = cleanPicks(list.picks);
    if (!picks) return;
    const value: StoredFirstList = { v: 1, outing: list.outing, budget: list.budget, picks, savedAt: new Date(now).toISOString() };
    window.localStorage.setItem(FIRST_LIST_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* not remembered: the list still shows this time */
  }
}

export function clearFirstList(): void {
  try {
    window.localStorage.removeItem(FIRST_LIST_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
