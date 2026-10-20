import { beforeEach, describe, expect, it, vi } from "vitest";

// The founding student offer: a limited number of students may hold the student price. The rule is
// tested with no database (what the owner has set, how many spots are held), then the parts that talk
// to it: reading the owner's settings, taking a spot, giving one back. The principles under test: nothing
// is shown that is not the real count; the number is given out only when the owner says to; and a setting
// that cannot be understood closes the offer rather than opening it to everyone.

const h = vi.hoisted(() => ({
  config: [] as { key: string; value: unknown }[],
  configError: null as { message: string } | null,
  rpc: vi.fn(),
  deleted: [] as string[],
  deleteError: null as { message: string } | null,
  configured: true,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "app_config") {
        return { select: () => ({ in: async () => ({ data: h.config, error: h.configError }) }) };
      }
      return { delete: () => ({ eq: async (_col: string, id: string) => { h.deleted.push(id); return { error: h.deleteError }; } }) };
    },
    rpc: h.rpc,
  }),
}));
vi.mock("@/lib/config/pricing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config/pricing")>()),
  isStudentPlanConfigured: () => h.configured,
  studentPriceId: () => "price_student",
}));

import {
  computeFoundingStatus,
  getFoundingStatus,
  parseCount,
  publicFoundingStatus,
  readSetting,
  releaseFoundingSlot,
  reserveFoundingSlot,
} from "@/lib/founding/offer";
import { FOUNDING_RESERVATION_MINUTES, FOUNDING_SESSION_MINUTES } from "@/lib/config/founding";
import { STUDENT_PLAN_MESSAGES } from "@/lib/stripe/student-plan";

const set = (value: number) => ({ kind: "set" as const, value });
const absent = { kind: "absent" as const };
const invalid = { kind: "invalid" as const };
const counts = (holders: number, reserved = 0) => ({ holders, reserved });

beforeEach(() => {
  h.config = [];
  h.configError = null;
  h.deleted.length = 0;
  h.deleteError = null;
  h.configured = true;
  h.rpc.mockReset().mockResolvedValue({ data: [{ out_holders: 0, out_reserved: 0 }], error: null });
});

describe("what the owner may type", () => {
  it("is a whole number of at least 1, as a number or as digits", () => {
    expect(parseCount(100)).toBe(100);
    expect(parseCount("100")).toBe(100);
    expect(parseCount(" 20 ")).toBe(20);
    expect(parseCount(1)).toBe(1);
  });

  it("is nothing else: not zero, negative, fractional, text, empty, or absurd", () => {
    for (const bad of [0, -5, 2.5, "ten", "", "1e3", "12.5", "-3", NaN, Infinity, true, {}, [], 1_000_001, "99999999"]) {
      expect(parseCount(bad), String(bad)).toBeNull();
    }
  });

  it("is read as absent, a usable number, or present but unusable", () => {
    expect(readSetting(undefined)).toEqual(absent);
    expect(readSetting(null)).toEqual(absent);
    expect(readSetting(50)).toEqual(set(50));
    expect(readSetting("many")).toEqual(invalid);
    expect(readSetting(0)).toEqual(invalid);
  });
});

describe("the offer's status", () => {
  it("is open to every verified student, with no number anywhere, when no limit is set", () => {
    expect(computeFoundingStatus(absent, set(20), counts(500))).toEqual({ capped: false, cap: null, available: null, open: true, showRemaining: false });
  });

  it("counts the spots left as the limit less the students holding the price and the checkouts in progress", () => {
    const status = computeFoundingStatus(set(100), absent, counts(60, 5));
    expect(status).toMatchObject({ capped: true, cap: 100, available: 35, open: true });
  });

  it("is open while a spot is left, and closed when none is, never going below zero", () => {
    expect(computeFoundingStatus(set(10), absent, counts(9)).open).toBe(true);
    expect(computeFoundingStatus(set(10), absent, counts(10)).open).toBe(false);
    expect(computeFoundingStatus(set(10), absent, counts(8, 4))).toMatchObject({ available: 0, open: false });
  });

  it("shows how many are left only when FEWER than the owner's number remain", () => {
    const show = (available: number, below: number) => computeFoundingStatus(set(100), set(below), counts(100 - available)).showRemaining;
    expect(show(19, 20)).toBe(true);
    expect(show(20, 20)).toBe(false); // "below", not "at or below"
    expect(show(21, 20)).toBe(false);
    expect(show(1, 20)).toBe(true);
  });

  it("never shows a number when none is left (the offer is simply gone), or when the owner set no threshold", () => {
    expect(computeFoundingStatus(set(10), set(20), counts(10)).showRemaining).toBe(false);
    expect(computeFoundingStatus(set(10), absent, counts(9)).showRemaining).toBe(false);
  });

  it("closes the offer when the limit is set to something unreadable, instead of opening it to everyone", () => {
    expect(computeFoundingStatus(invalid, set(20), counts(0))).toMatchObject({ capped: true, open: false, showRemaining: false });
  });

  it("never shows a number when the threshold is set to something unreadable", () => {
    expect(computeFoundingStatus(set(10), invalid, counts(9)).showRemaining).toBe(false);
  });
});

describe("what a visitor may be told", () => {
  it("is whether it is open, whether it has a limit, and the spots left only when the owner's threshold says to", () => {
    expect(publicFoundingStatus(computeFoundingStatus(set(100), set(20), counts(90)))).toEqual({ open: true, capped: true, remaining: 10 });
    expect(publicFoundingStatus(computeFoundingStatus(set(100), set(20), counts(50)))).toEqual({ open: true, capped: true, remaining: null });
    expect(publicFoundingStatus(computeFoundingStatus(set(100), set(20), counts(100)))).toEqual({ open: false, capped: true, remaining: null });
    expect(publicFoundingStatus(computeFoundingStatus(absent, absent, counts(0)))).toEqual({ open: true, capped: false, remaining: null });
  });

  it("never gives out the limit itself, or the count while it is above the threshold", () => {
    const status = publicFoundingStatus(computeFoundingStatus(set(137), set(20), counts(50)));
    expect(Object.keys(status).sort()).toEqual(["capped", "open", "remaining"]);
    expect(JSON.stringify(status)).not.toMatch(/137|87/);
    expect(status.remaining).toBeNull();
  });
});

describe("reading the offer from the database", () => {
  it("reads the owner's two settings and the real count", async () => {
    h.config = [{ key: "founding_student_cap", value: 100 }, { key: "founding_student_show_below", value: "20" }];
    h.rpc.mockResolvedValue({ data: [{ out_holders: 85, out_reserved: 3 }], error: null });
    const status = await getFoundingStatus();
    expect(status).toMatchObject({ capped: true, cap: 100, available: 12, open: true, showRemaining: true });
    expect(h.rpc).toHaveBeenCalledWith("founding_counts", { p_price_id: "price_student" });
  });

  it("counts nothing when there is no limit, so there is nothing to ask the database", async () => {
    expect(await getFoundingStatus()).toMatchObject({ capped: false, open: true });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("fails loudly, rather than guessing, when the settings or the count cannot be read", async () => {
    h.configError = { message: "boom" };
    await expect(getFoundingStatus()).rejects.toThrow(/could not read the settings/);
    h.configError = null;
    h.config = [{ key: "founding_student_cap", value: 10 }];
    h.rpc.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(getFoundingStatus()).rejects.toThrow(/could not count the spots/);
  });
});

describe("taking a spot", () => {
  it("does nothing, and says the price has no limit, when none is set", async () => {
    expect(await reserveFoundingSlot("u1")).toEqual({ capped: false });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("asks the database to count and hold one in a single step, for the length of a checkout", async () => {
    h.config = [{ key: "founding_student_cap", value: 100 }];
    h.rpc.mockResolvedValue({ data: true, error: null });
    expect(await reserveFoundingSlot("u1")).toEqual({ capped: true });
    expect(h.rpc).toHaveBeenCalledWith("reserve_founding_slot", { p_user: "u1", p_price_id: "price_student", p_cap: 100, p_minutes: FOUNDING_RESERVATION_MINUTES });
  });

  it("holds a spot a little longer than the checkout page stays open, so a spot is never given away while it can still be paid", () => {
    expect(FOUNDING_SESSION_MINUTES).toBeGreaterThanOrEqual(31); // Stripe's minimum is 30
    expect(FOUNDING_RESERVATION_MINUTES).toBeGreaterThan(FOUNDING_SESSION_MINUTES);
  });

  it("refuses, in plain words, when the spots are gone", async () => {
    h.config = [{ key: "founding_student_cap", value: 1 }];
    h.rpc.mockResolvedValue({ data: false, error: null });
    await expect(reserveFoundingSlot("u1")).rejects.toMatchObject({ status: 409, message: STUDENT_PLAN_MESSAGES.full });
  });

  it("refuses, without asking the database, when the limit is set to something unreadable", async () => {
    h.config = [{ key: "founding_student_cap", value: "lots" }];
    await expect(reserveFoundingSlot("u1")).rejects.toMatchObject({ status: 409 });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("fails closed when the settings or the database cannot be reached: no spot is sold", async () => {
    h.configError = { message: "boom" };
    await expect(reserveFoundingSlot("u1")).rejects.toThrow();
    h.configError = null;
    h.config = [{ key: "founding_student_cap", value: 5 }];
    h.rpc.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(reserveFoundingSlot("u1")).rejects.toThrow(/could not reserve/);
  });

  it("refuses while the plan is not on sale, before looking at anything", async () => {
    h.configured = false;
    await expect(reserveFoundingSlot("u1")).rejects.toMatchObject({ status: 503, message: STUDENT_PLAN_MESSAGES.unavailable });
    expect(h.rpc).not.toHaveBeenCalled();
  });
});

describe("giving a spot back", () => {
  it("removes the person's reservation", async () => {
    await releaseFoundingSlot("u1");
    expect(h.deleted).toEqual(["u1"]);
  });

  it("never throws: giving a spot back is housekeeping, and the reservation runs out by itself anyway", async () => {
    h.deleteError = { message: "boom" };
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(releaseFoundingSlot("u1")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
