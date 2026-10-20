import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { Call } from "./helpers/fake-admin";
import { ok } from "./helpers/fake-admin";

// The route behind the cancel screen, what the Stripe webhook keeps of a pause, and that a second subscription
// is never started for someone who has one (even in the month they have paused).

const h = vi.hoisted(() => ({
  userId: "u1",
  authed: true,
  configured: true,
  student: vi.fn(),
  pause: vi.fn(),
  unpause: vi.fn(),
  cancel: vi.fn(),
  keep: vi.fn(),
  calls: [] as Call[],
  db: {} as Record<string, (call: Call) => unknown>,
  customerCreate: vi.fn(),
  sessionCreate: vi.fn(),
}));

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/auth")>();
  return {
    ...original,
    requireUser: async () => {
      if (!h.authed) throw new original.ApiError(401, "Authentication required.");
      return { user: { id: h.userId, email: "maya@example.edu" } };
    },
  };
});
vi.mock("@/lib/stripe/client", () => ({
  isStripeConfigured: () => h.configured,
  getStripeClient: () => ({ customers: { create: h.customerCreate }, checkout: { sessions: { create: h.sessionCreate } } }),
}));
vi.mock("@/lib/stripe/cancel-flow", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe/cancel-flow")>()),
  switchToStudent: h.student,
  pauseForMonth: h.pause,
  undoPause: h.unpause,
  cancelAtPeriodEnd: h.cancel,
  keepPremium: h.keep,
}));
vi.mock("@/lib/supabase/admin", async () => {
  const { createFakeAdmin: make } = await import("./helpers/fake-admin");
  return {
    createAdminClient: () =>
      make((call) => (h.db[call.table] ? (h.db[call.table](call) as never) : { data: null, error: null }), h.calls),
  };
});
vi.mock("@/lib/analytics/server", () => ({ trackAnalytics: vi.fn() }));
vi.mock("@/lib/config/pricing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config/pricing")>()),
  premiumPriceId: () => "price_monthly",
  isStudentPriceId: () => false,
}));
vi.mock("@/lib/founding/offer", () => ({ reserveFoundingSlot: vi.fn(), releaseFoundingSlot: vi.fn() }));

import { POST } from "@/app/api/stripe/subscription/route";
import { SUBSCRIPTION_ACTIONS } from "@/lib/validation/schemas";
import { ApiError } from "@/lib/api/auth";
import { handleStripeEvent } from "@/lib/stripe/webhook-handlers";
import { createCheckoutSession } from "@/lib/stripe/checkout";

let n = 0;
const post = (body: unknown) =>
  POST(new Request("https://discoverzolo.com/api/stripe/subscription", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(() => {
  h.userId = `user-${++n}`; // the limiter is per person
  h.authed = true;
  h.configured = true;
  h.calls.length = 0;
  h.db = {};
  h.student.mockReset().mockResolvedValue({ priceMonthly: 9.99 });
  h.pause.mockReset().mockResolvedValue({ from: "2026-11-20T17:53:00.000Z", until: "2026-12-20T17:53:00.000Z" });
  h.unpause.mockReset().mockResolvedValue(undefined);
  h.cancel.mockReset().mockResolvedValue({ endsOn: "2026-11-20T17:53:00.000Z" });
  h.keep.mockReset().mockResolvedValue(undefined);
  h.customerCreate.mockReset().mockResolvedValue({ id: "cus_new" });
  h.sessionCreate.mockReset().mockResolvedValue({ id: "cs_1", url: "https://stripe.example/pay" });
});

describe("POST /api/stripe/subscription", () => {
  it("does one thing per action, for the person asking, and returns what the screen says", async () => {
    expect(await (await post({ action: "student" })).json()).toEqual({ action: "student", priceMonthly: 9.99 });
    expect(await (await post({ action: "pause" })).json()).toEqual({ action: "pause", from: "2026-11-20T17:53:00.000Z", until: "2026-12-20T17:53:00.000Z" });
    expect(await (await post({ action: "cancel" })).json()).toEqual({ action: "cancel", endsOn: "2026-11-20T17:53:00.000Z" });
    expect(await (await post({ action: "keep" })).json()).toEqual({ action: "keep" });
    expect(await (await post({ action: "unpause" })).json()).toEqual({ action: "unpause" });
    for (const fn of [h.student, h.pause, h.cancel, h.keep, h.unpause]) {
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(h.userId); // the caller's own id, and nothing the request said
    }
  });

  it("accepts exactly the five actions the cancel screen and profile use", () => {
    expect([...SUBSCRIPTION_ACTIONS]).toEqual(["student", "pause", "cancel", "keep", "unpause"]);
  });

  it("needs a signed-in person", async () => {
    h.authed = false;
    expect((await post({ action: "cancel" })).status).toBe(401);
    expect(h.cancel).not.toHaveBeenCalled();
  });

  it("refuses an unknown action, a missing one, and a body that is not JSON, and does nothing", async () => {
    for (const body of [{ action: "refund" }, { action: "cancel_now" }, {}, "not json", { action: ["cancel"] }]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    for (const fn of [h.student, h.pause, h.cancel, h.keep, h.unpause]) expect(fn).not.toHaveBeenCalled();
  });

  it("ignores anything else in the request, such as another person's id or a subscription id", async () => {
    await post({ action: "cancel", userId: "someone-else", subscriptionId: "sub_other" });
    expect(h.cancel).toHaveBeenCalledWith(h.userId);
  });

  it("passes on the refusal in words fit to show, with its status", async () => {
    h.pause.mockRejectedValue(new ApiError(409, "Your subscription is already paused."));
    const res = await post({ action: "pause" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Your subscription is already paused.");
  });

  it("answers 503 when billing is not set up, before doing anything", async () => {
    h.configured = false;
    expect((await post({ action: "cancel" })).status).toBe(503);
    expect(h.cancel).not.toHaveBeenCalled();
  });

  it("limits one person to ten changes a minute", async () => {
    let last = 200;
    for (let i = 0; i < 12; i++) last = (await post({ action: "keep" })).status;
    expect(last).toBe(429);
  });
});

// ---------------------------------------------------------------------------------------------------

describe("what the webhook keeps of a pause", () => {
  const WINDOW = { pause_from: "2026-11-20T17:53:00.000Z", pause_until: "2026-12-20T17:53:00.000Z" };
  const event = (over: Record<string, unknown>): Stripe.Event =>
    ({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          cancel_at_period_end: false,
          metadata: { userId: "u1" },
          pause_collection: null,
          items: { data: [{ price: { id: "price_monthly", recurring: { interval: "month" } }, current_period_end: 1_800_000_000 }] },
          ...over,
        },
      },
    }) as unknown as Stripe.Event;
  const written = () => h.calls.find((c) => c.table === "subscriptions" && c.op === "update")!.values!;

  it("keeps the two dates while Stripe says collection is paused", async () => {
    await handleStripeEvent(event({ pause_collection: { behavior: "void", resumes_at: 1 }, metadata: { userId: "u1", ...WINDOW } }));
    expect(written()).toMatchObject({ paused_from: WINDOW.pause_from, paused_until: WINDOW.pause_until });
  });

  it("keeps the person a Premium subscriber while paused: the plan and status are not changed, only the dates are set", async () => {
    await handleStripeEvent(event({ pause_collection: { behavior: "void", resumes_at: 1 }, metadata: { userId: "u1", ...WINDOW } }));
    expect(written()).toMatchObject({ plan_id: "premium", status: "active", cancel_at_period_end: false });
  });

  it("clears the dates once collection is no longer paused (resumed, undone, or resumed by hand), even if the metadata is still there", async () => {
    await handleStripeEvent(event({ pause_collection: null, metadata: { userId: "u1", ...WINDOW } }));
    expect(written()).toMatchObject({ paused_from: null, paused_until: null });
  });

  it("records no window for a pause set by hand in the Dashboard, which has no dates of ours", async () => {
    await handleStripeEvent(event({ pause_collection: { behavior: "void", resumes_at: 1 }, metadata: { userId: "u1" } }));
    expect(written()).toMatchObject({ paused_from: null, paused_until: null });
  });

  it("records no window from dates that are broken or backwards", async () => {
    await handleStripeEvent(event({ pause_collection: { behavior: "void", resumes_at: 1 }, metadata: { userId: "u1", pause_from: WINDOW.pause_until, pause_until: WINDOW.pause_from } }));
    expect(written()).toMatchObject({ paused_from: null, paused_until: null });
  });
});

// ---------------------------------------------------------------------------------------------------

describe("a second subscription", () => {
  const base = { userId: "u1", email: "maya@example.edu", successUrl: "https://z/ok", cancelUrl: "https://z/no" };

  it("is never started for someone who has one, including one whose paused month is under way", async () => {
    h.db.subscriptions = () => ok({ plan_id: "premium", status: "active", stripe_customer_id: "cus_1" });
    const error = await createCheckoutSession(base).then(() => null, (e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect(h.customerCreate).not.toHaveBeenCalled();
    expect(h.sessionCreate).not.toHaveBeenCalled();
  });

  it("is also refused during a trial", async () => {
    h.db.subscriptions = () => ok({ plan_id: "premium", status: "trialing", stripe_customer_id: "cus_1" });
    await expect(createCheckoutSession(base)).rejects.toMatchObject({ status: 409 });
    expect(h.sessionCreate).not.toHaveBeenCalled();
  });

  it("still starts one for a free account, and for someone whose subscription ended", async () => {
    h.db.subscriptions = () => ok({ plan_id: "free", status: "none", stripe_customer_id: null });
    await createCheckoutSession(base);
    expect(h.sessionCreate).toHaveBeenCalledTimes(1);

    h.sessionCreate.mockClear();
    h.db.subscriptions = () => ok({ plan_id: "free", status: "canceled", stripe_customer_id: "cus_1" });
    await createCheckoutSession(base);
    expect(h.sessionCreate).toHaveBeenCalledTimes(1);
  });
});
