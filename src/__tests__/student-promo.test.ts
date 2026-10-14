import { beforeEach, describe, expect, it, vi } from "vitest";
import { fail, ok, type Call } from "./helpers/fake-admin";

// The server's decision about a promo code, which Stripe cannot make: is this a
// verified student, a first-time customer, using one code once, on the monthly
// plan, with a code that carries its limit and expiry? Each rule is tested alone,
// and so is the order they are applied in.

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  db: {} as Record<string, (call: Call) => unknown>,
  stripeList: vi.fn(),
  stripeExpire: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", async () => {
  const { createFakeAdmin: make } = await import("./helpers/fake-admin");
  return {
    createAdminClient: () =>
      make((call) => (h.db[call.table] ? (h.db[call.table](call) as never) : { data: null, error: null }), h.calls),
  };
});
vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: () => ({
    promotionCodes: { list: h.stripeList },
    checkout: { sessions: { expire: h.stripeExpire } },
  }),
}));

import {
  PROMO_MESSAGES,
  claimStudentPromo,
  evaluatePromoCode,
  expireCheckoutSession,
  markPromoRedeemed,
  previewPromoCode,
} from "@/lib/stripe/promo";
import { STUDENT_COUPON_ID } from "@/lib/config/promo";

const NOW = new Date("2026-10-20T12:00:00Z");
const inDays = (n: number) => Math.floor(NOW.getTime() / 1000) + n * 86_400;

function stripeCode(over: Record<string, unknown> = {}) {
  return {
    id: "promo_1",
    code: "SCHOOL-CLUB",
    active: true,
    expires_at: inDays(30),
    max_redemptions: 100,
    times_redeemed: 3,
    restrictions: { first_time_transaction: true },
    promotion: { type: "coupon", coupon: STUDENT_COUPON_ID },
    ...over,
  };
}

/** A verified, first-time student with nothing redeemed. Tests change one thing at a time. */
function aStudent(over: { verified?: boolean; subscription?: unknown; payments?: unknown[]; redemption?: unknown } = {}) {
  h.db.profiles = () => ok({ edu_verified_at: over.verified === false ? null : "2026-10-01T00:00:00Z" });
  h.db.subscriptions = () => ok(over.subscription ?? { stripe_subscription_id: null, digistore24_order_id: null });
  h.db.payments = () => ok(over.payments ?? []);
  h.db.promo_redemptions = () => ok(over.redemption ?? null);
}

const evaluate = (code: string, interval: "monthly" | "annual" = "monthly") =>
  evaluatePromoCode({ userId: "u1", code, interval, now: NOW });

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    return err as { status?: number; message: string };
  }
  throw new Error("expected a rejection");
}

beforeEach(() => {
  h.calls.length = 0;
  h.db = {};
  h.stripeList.mockReset().mockResolvedValue({ data: [stripeCode()] });
  h.stripeExpire.mockReset().mockResolvedValue({});
  aStudent();
});

describe("a student code, for someone it is meant for", () => {
  it("is accepted for a verified, first-time student on the monthly plan", async () => {
    expect(await evaluate("SCHOOL-CLUB")).toEqual({ kind: "student", code: "SCHOOL-CLUB", promotionCodeId: "promo_1" });
  });

  it("is looked up in Stripe by the code, whatever case it was typed in", async () => {
    await evaluate("  school-club ");
    expect(h.stripeList).toHaveBeenCalledWith({ code: "SCHOOL-CLUB", limit: 10 });
  });
});

describe("a code that is not a code", () => {
  it("is turned away before Stripe is asked, if it has characters a code cannot have", async () => {
    for (const code of ["free money!", "A_B", "A.B", "<script>", "", "   "]) {
      const err = await rejection(evaluate(code));
      expect(err.status, code).toBe(400);
      expect(err.message).toBe(PROMO_MESSAGES.invalid);
    }
    expect(h.stripeList).not.toHaveBeenCalled();
  });

  it("is not valid if Stripe has never heard of it", async () => {
    h.stripeList.mockResolvedValue({ data: [] });
    expect(await rejection(evaluate("NO-SUCH-CODE"))).toMatchObject({ status: 400, message: PROMO_MESSAGES.invalid });
  });
});

describe("a student code's own limits", () => {
  it("is refused after its expiry date, with that said", async () => {
    h.stripeList.mockResolvedValue({ data: [stripeCode({ expires_at: inDays(-1), active: false })] });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ status: 400, message: PROMO_MESSAGES.expired });
  });

  it("is refused once it has been redeemed as many times as it allows", async () => {
    h.stripeList.mockResolvedValue({ data: [stripeCode({ times_redeemed: 100, max_redemptions: 100 })] });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ status: 400, message: PROMO_MESSAGES.usedUp });
  });

  it("is refused if it has been switched off", async () => {
    h.stripeList.mockResolvedValue({ data: [stripeCode({ active: false })] });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ status: 400, message: PROMO_MESSAGES.invalid });
  });

  it("is refused if it was made without a redemption limit, an expiry, or the first-time restriction", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const broken of [{ max_redemptions: null }, { expires_at: null }, { restrictions: { first_time_transaction: false } }]) {
      h.stripeList.mockResolvedValue({ data: [stripeCode(broken)] });
      expect(await rejection(evaluate("SCHOOL-CLUB")), JSON.stringify(broken)).toMatchObject({
        status: 400,
        message: PROMO_MESSAGES.invalid,
      });
    }
    expect(error).toHaveBeenCalled(); // the owner can see why, in the logs
    error.mockRestore();
  });

  it("prefers the active one when the same code has been made more than once", async () => {
    h.stripeList.mockResolvedValue({ data: [stripeCode({ id: "old", active: false, expires_at: inDays(-5) }), stripeCode({ id: "new" })] });
    expect((await evaluate("SCHOOL-CLUB")).promotionCodeId).toBe("new");
  });
});

describe("the plan", () => {
  it("is monthly only: on the annual price the coupon would take off a whole year", async () => {
    expect(await rejection(evaluate("SCHOOL-CLUB", "annual"))).toMatchObject({ status: 400, message: PROMO_MESSAGES.monthlyOnly });
  });
});

describe("who may use a student code", () => {
  it("only an account with a verified school email address", async () => {
    aStudent({ verified: false });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ status: 403, message: PROMO_MESSAGES.notVerified });
  });

  it("only once: someone who has redeemed a student code cannot redeem another", async () => {
    aStudent({ redemption: { status: "redeemed" }, subscription: { stripe_subscription_id: "sub_1", digistore24_order_id: null } });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ status: 409, message: PROMO_MESSAGES.alreadyUsed });
  });

  it("is still open to someone with only a pending reservation: an abandoned checkout is not a use", async () => {
    aStudent({ redemption: { status: "pending" } });
    expect((await evaluate("SCHOOL-CLUB")).kind).toBe("student");
  });

  it("only first-time customers: not anyone who has already had a Stripe subscription", async () => {
    aStudent({ subscription: { stripe_subscription_id: "sub_old", digistore24_order_id: null } });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ status: 409, message: PROMO_MESSAGES.notFirstTime });
  });

  it("nor anyone who bought Premium through the other seller", async () => {
    aStudent({ subscription: { stripe_subscription_id: null, digistore24_order_id: "ds24_1" } });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ status: 409, message: PROMO_MESSAGES.notFirstTime });
  });

  it("nor anyone who has ever paid", async () => {
    aStudent({ payments: [{ id: "pay_1" }] });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ status: 409, message: PROMO_MESSAGES.notFirstTime });
  });

  it("never grants a code if the account cannot be read: it fails closed", async () => {
    h.db.profiles = () => fail("connection reset");
    const err = await rejection(evaluate("SCHOOL-CLUB"));
    expect(err.status).toBeUndefined(); // not a message for the person: a server error
    expect(err.message).toMatch(/could not check eligibility/);
  });
});

describe("the order the checks are made in", () => {
  it("judges the code before the person, so a dead code is reported as dead, not as an account problem", async () => {
    aStudent({ verified: false });
    h.stripeList.mockResolvedValue({ data: [stripeCode({ expires_at: inDays(-1), active: false })] });
    expect(await rejection(evaluate("SCHOOL-CLUB"))).toMatchObject({ message: PROMO_MESSAGES.expired });
  });

  it("reads nothing about the account until the code itself is usable", async () => {
    h.stripeList.mockResolvedValue({ data: [] });
    await rejection(evaluate("NO-SUCH-CODE"));
    expect(h.calls).toHaveLength(0);
  });
});

describe("a code that is not a student code", () => {
  const other = () => stripeCode({ id: "promo_other", code: "SPRING", promotion: { type: "coupon", coupon: "spring-sale" } });

  it("is passed through for Stripe to judge, with no student checks", async () => {
    aStudent({ verified: false, subscription: { stripe_subscription_id: "sub_old", digistore24_order_id: null } });
    h.stripeList.mockResolvedValue({ data: [other()] });
    expect(await evaluate("SPRING", "annual")).toEqual({ kind: "other", code: "SPRING", promotionCodeId: "promo_other" });
    expect(h.calls).toHaveLength(0);
  });

  it("is still refused if it has been switched off", async () => {
    h.stripeList.mockResolvedValue({ data: [{ ...other(), active: false }] });
    expect(await rejection(evaluate("SPRING"))).toMatchObject({ message: PROMO_MESSAGES.invalid });
  });
});

describe("previewing a code for the upgrade page", () => {
  it("says a usable code is usable", async () => {
    expect(await previewPromoCode("u1", "school-club")).toEqual({ ok: true, kind: "student", code: "SCHOOL-CLUB" });
  });

  it("says nothing more than no, for any reason, and never throws", async () => {
    aStudent({ verified: false });
    expect(await previewPromoCode("u1", "SCHOOL-CLUB")).toEqual({ ok: false });
    h.stripeList.mockRejectedValue(new Error("Stripe is down"));
    expect(await previewPromoCode("u1", "SCHOOL-CLUB")).toEqual({ ok: false });
  });
});

describe("reserving the one free month", () => {
  const claim = () => claimStudentPromo({ userId: "u1", code: "SCHOOL-CLUB", promotionCodeId: "promo_1" });

  it("creates a pending reservation for the person", async () => {
    h.db.promo_redemptions = (c) => (c.op === "select" ? ok(null) : ok({ id: "claim_1" }));
    expect(await claim()).toEqual({ id: "claim_1", previousSessionId: null });
    const insert = h.calls.find((c) => c.op === "insert")!;
    expect(insert.values).toEqual({
      user_id: "u1",
      code: "SCHOOL-CLUB",
      stripe_promotion_code_id: "promo_1",
      stripe_checkout_session_id: null,
    });
  });

  it("reuses an abandoned reservation, and hands back its checkout so it can be closed", async () => {
    h.db.promo_redemptions = (c) =>
      c.op === "select" ? ok({ id: "claim_1", status: "pending", stripe_checkout_session_id: "cs_old" }) : ok();
    expect(await claim()).toEqual({ id: "claim_1", previousSessionId: "cs_old" });
    const update = h.calls.find((c) => c.op === "update")!;
    expect(update.filters).toEqual({ id: "claim_1", status: "pending" }); // never touches a redeemed row
    expect(h.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("refuses someone who has already redeemed", async () => {
    h.db.promo_redemptions = () => ok({ id: "claim_1", status: "redeemed", stripe_checkout_session_id: null });
    expect(await rejection(claim())).toMatchObject({ status: 409, message: PROMO_MESSAGES.alreadyUsed });
    expect(h.calls.some((c) => c.op === "insert" || c.op === "update")).toBe(false);
  });

  it("recovers when a parallel request reserved first (the unique person constraint)", async () => {
    let reads = 0;
    h.db.promo_redemptions = (c) => {
      if (c.op === "select") return ++reads === 1 ? ok(null) : ok({ id: "claim_9", status: "pending", stripe_checkout_session_id: null });
      if (c.op === "insert") return fail("duplicate key", "23505");
      return ok();
    };
    expect(await claim()).toEqual({ id: "claim_9", previousSessionId: null });
  });

  it("closes an earlier unfinished checkout, and does not mind if it cannot", async () => {
    await expireCheckoutSession("cs_old");
    expect(h.stripeExpire).toHaveBeenCalledWith("cs_old");
    h.stripeExpire.mockRejectedValue(new Error("already completed"));
    await expect(expireCheckoutSession("cs_done")).resolves.toBeUndefined();
    h.stripeExpire.mockClear();
    await expireCheckoutSession(null);
    expect(h.stripeExpire).not.toHaveBeenCalled();
  });
});

describe("recording the redemption", () => {
  const mark = () => markPromoRedeemed({ claimId: "claim_1", userId: "u1", subscriptionId: "sub_1" });

  it("marks a pending reservation redeemed, with the time and the subscription, and says it was the first time", async () => {
    h.db.promo_redemptions = () => ok([{ id: "claim_1" }]);
    expect(await mark()).toBe(true);
    const update = h.calls.find((c) => c.op === "update")!;
    expect(update.values).toMatchObject({ status: "redeemed", stripe_subscription_id: "sub_1" });
    expect(typeof update.values?.redeemed_at).toBe("string");
    expect(update.filters).toEqual({ id: "claim_1", user_id: "u1", status: "pending" });
  });

  it("says it was not the first time when Stripe resends the same event", async () => {
    h.db.promo_redemptions = () => ok([]);
    expect(await mark()).toBe(false);
  });

  it("lets the error out so Stripe retries the webhook", async () => {
    h.db.promo_redemptions = () => fail("database unavailable");
    await expect(mark()).rejects.toThrow(/could not record the redemption/);
  });
});
