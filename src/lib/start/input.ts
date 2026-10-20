import { isBudgetId, isOutingId, type BudgetId, type OutingId } from "./questions";
import { isExperienceId } from "./picks";
import { LIST_MAX_PLACES, LIST_MIN_PLACES } from "@/lib/config/lists";

/** What a request for a first list may contain, checked before anything is asked of Google. */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function answers(body: Record<string, unknown>): { outing: OutingId; budget: BudgetId } | null {
  return isOutingId(body.outing) && isBudgetId(body.budget) ? { outing: body.outing, budget: body.budget } : null;
}

/** Real coordinates only: finite numbers on the globe. (0, 0) is the middle of the sea, never a person. */
function coordinates(body: Record<string, unknown>): { latitude: number; longitude: number } | null {
  const { latitude, longitude } = body;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

export function parseListRequest(raw: unknown): Parsed<{ outing: OutingId; budget: BudgetId; latitude: number; longitude: number }> {
  if (!raw || typeof raw !== "object") return fail("Tell us what you are after, and where.");
  const body = raw as Record<string, unknown>;
  const a = answers(body);
  if (!a) return fail("Choose a kind of outing and a budget.");
  const where = coordinates(body);
  if (!where) return fail("We need to know where you are.");
  return { ok: true, value: { ...a, ...where } };
}

export function parseRestoreRequest(raw: unknown): Parsed<{ outing: OutingId; budget: BudgetId; ids: string[] }> {
  if (!raw || typeof raw !== "object") return fail("Nothing to restore.");
  const body = raw as Record<string, unknown>;
  const a = answers(body);
  if (!a) return fail("Choose a kind of outing and a budget.");
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length < LIST_MIN_PLACES || ids.length > LIST_MAX_PLACES) return fail("That is not a list.");
  const clean: string[] = [];
  for (const id of ids) {
    if (!isExperienceId(id) || clean.includes(id)) return fail("That is not a list.");
    clean.push(id);
  }
  return { ok: true, value: { ...a, ids: clean } };
}
