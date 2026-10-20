import { ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStudentPlanConfigured, studentPriceId } from "@/lib/config/pricing";
import { FOUNDING_CAP_KEY, FOUNDING_RESERVATION_MINUTES, FOUNDING_SHOW_BELOW_KEY } from "@/lib/config/founding";
import { STUDENT_PLAN_MESSAGES } from "@/lib/stripe/student-plan";

/**
 * The founding student offer: a limited number of students may hold the student price. The
 * owner sets the limit, and when to start showing how many spots are left, in app_config
 * (see config/founding.ts). Everything shown to a visitor comes from these real counts:
 * a spot is held by an account with a live subscription at the student price, or by someone
 * who is checking out for one right now.
 */

/** A whole number of at least 1, as the owner may have typed it (a number, or digits in text); anything else is null. */
export function parseCount(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) && value >= 1 && value <= 1_000_000 ? value : null;
  if (typeof value === "string" && /^\d{1,7}$/.test(value.trim())) {
    const n = Number(value.trim());
    return n >= 1 && n <= 1_000_000 ? n : null;
  }
  return null;
}

/** What is in app_config for the two settings: absent, a usable number, or present but unusable. */
export type Setting = { kind: "absent" } | { kind: "set"; value: number } | { kind: "invalid" };

export function readSetting(raw: unknown): Setting {
  if (raw === undefined || raw === null) return { kind: "absent" };
  const n = parseCount(raw);
  return n === null ? { kind: "invalid" } : { kind: "set", value: n };
}

export interface FoundingStatus {
  /** Whether the founding price has a limit at all. */
  capped: boolean;
  /** The limit, when there is one the owner has set correctly. */
  cap: number | null;
  /** Spots free right now (never below zero); null when there is no limit. */
  available: number | null;
  /** Whether the student price can be bought now. */
  open: boolean;
  /** Whether the number of spots left should be shown: only when a limit exists, spots remain, and fewer than the threshold do. */
  showRemaining: boolean;
}

/** The whole rule, with no database: what the owner has set, and how many spots are held. */
export function computeFoundingStatus(
  cap: Setting,
  showBelow: Setting,
  counts: { holders: number; reserved: number }
): FoundingStatus {
  // An unreadable cap closes the offer rather than opening it to everyone.
  if (cap.kind === "invalid") return { capped: true, cap: null, available: 0, open: false, showRemaining: false };
  if (cap.kind === "absent") return { capped: false, cap: null, available: null, open: true, showRemaining: false };

  const available = Math.max(0, cap.value - counts.holders - counts.reserved);
  const open = available > 0;
  return {
    capped: true,
    cap: cap.value,
    available,
    open,
    showRemaining: open && showBelow.kind === "set" && available < showBelow.value,
  };
}

export interface PublicFoundingStatus {
  open: boolean;
  capped: boolean;
  /** Spots left, only when the owner's threshold says to show it. Otherwise null: the number is not given out. */
  remaining: number | null;
}

/** What a visitor may be told. The limit itself and the spots left above the threshold are not given out. */
export function publicFoundingStatus(status: FoundingStatus): PublicFoundingStatus {
  return { open: status.open, capped: status.capped, remaining: status.showRemaining ? status.available : null };
}

async function readSettings(): Promise<{ cap: Setting; showBelow: Setting }> {
  const { data, error } = await createAdminClient().from("app_config").select("key, value").in("key", [FOUNDING_CAP_KEY, FOUNDING_SHOW_BELOW_KEY]);
  if (error) throw new Error(`[founding] could not read the settings: ${error.message}`);
  const byKey = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  return { cap: readSetting(byKey.get(FOUNDING_CAP_KEY)), showBelow: readSetting(byKey.get(FOUNDING_SHOW_BELOW_KEY)) };
}

/** The offer as it stands now, from the owner's settings and the real counts. Throws if either cannot be read. */
export async function getFoundingStatus(): Promise<FoundingStatus> {
  const { cap, showBelow } = await readSettings();
  // With no limit set there is nothing to count.
  if (cap.kind !== "set") return computeFoundingStatus(cap, showBelow, { holders: 0, reserved: 0 });

  const { data, error } = await createAdminClient().rpc("founding_counts", { p_price_id: studentPriceId() });
  if (error) throw new Error(`[founding] could not count the spots: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as { out_holders?: number; out_reserved?: number } | null;
  return computeFoundingStatus(cap, showBelow, { holders: row?.out_holders ?? 0, reserved: row?.out_reserved ?? 0 });
}

/**
 * Takes a spot for this person while they check out, if the price has a limit. With no limit
 * it does nothing and says so (capped: false). If the limit is reached (or unreadable), it
 * throws, with words fit to show the person, and nothing is held. Fails closed on any error.
 */
export async function reserveFoundingSlot(userId: string): Promise<{ capped: boolean }> {
  if (!isStudentPlanConfigured()) throw new ApiError(503, STUDENT_PLAN_MESSAGES.unavailable);
  const { cap } = await readSettings();
  if (cap.kind === "absent") return { capped: false };
  if (cap.kind === "invalid") throw new ApiError(409, STUDENT_PLAN_MESSAGES.full);

  const { data, error } = await createAdminClient().rpc("reserve_founding_slot", {
    p_user: userId,
    p_price_id: studentPriceId(),
    p_cap: cap.value,
    p_minutes: FOUNDING_RESERVATION_MINUTES,
  });
  if (error) throw new Error(`[founding] could not reserve a spot: ${error.message}`);
  if (data !== true) throw new ApiError(409, STUDENT_PLAN_MESSAGES.full);
  return { capped: true };
}

/** Gives a spot back (a checkout that failed, expired, or became a subscription, which then holds it itself). */
export async function releaseFoundingSlot(userId: string): Promise<void> {
  const { error } = await createAdminClient().from("founding_reservations").delete().eq("user_id", userId);
  if (error) console.error("[founding] could not release a spot:", error.message);
}
