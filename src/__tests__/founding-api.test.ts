import { beforeEach, describe, expect, it, vi } from "vitest";

// The public status the pricing page asks for, and the webhook's giving back of a founding spot.

const h = vi.hoisted(() => ({
  configured: true,
  status: null as unknown,
  statusError: null as Error | null,
  release: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@/lib/config/pricing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config/pricing")>()),
  isStudentPlanConfigured: () => h.configured,
  isStudentPriceId: (id: string | null | undefined) => id === "price_student",
}));
vi.mock("@/lib/founding/offer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/founding/offer")>()),
  getFoundingStatus: async () => {
    if (h.statusError) throw h.statusError;
    return h.status;
  },
  releaseFoundingSlot: h.release,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: () => ({ eq: async () => ({ error: null }) }),
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: "u1" } }) }) }),
    }),
  }),
}));
vi.mock("@/lib/analytics/server", () => ({ trackAnalytics: h.track }));

import { GET } from "@/app/api/pricing/founding/route";
import { computeFoundingStatus } from "@/lib/founding/offer";
import { FOUNDING_STATUS_LIMIT } from "@/lib/config/founding";
import { handleStripeEvent } from "@/lib/stripe/webhook-handlers";

let n = 0;
const get = (ip?: string) => GET(new Request("https://discoverzolo.com/api/pricing/founding", { headers: { "x-forwarded-for": ip ?? `10.7.0.${++n}` } }));
const set = (value: number) => ({ kind: "set" as const, value });
const absent = { kind: "absent" as const };

beforeEach(() => {
  h.configured = true;
  h.statusError = null;
  h.status = computeFoundingStatus(absent, absent, { holders: 0, reserved: 0 });
  h.release.mockReset().mockResolvedValue(undefined);
  h.track.mockReset().mockResolvedValue(undefined);
});

describe("GET /api/pricing/founding", () => {
  it("says the offer is open with no limit and no number when none is set", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ open: true, capped: false, remaining: null });
  });

  it("gives out the spots left only when the owner's threshold says to", async () => {
    h.status = computeFoundingStatus(set(100), set(20), { holders: 90, reserved: 0 });
    expect(await (await get()).json()).toEqual({ open: true, capped: true, remaining: 10 });
    h.status = computeFoundingStatus(set(100), set(20), { holders: 50, reserved: 0 });
    expect(await (await get()).json()).toEqual({ open: true, capped: true, remaining: null });
  });

  it("says the offer is over once the spots are gone", async () => {
    h.status = computeFoundingStatus(set(100), set(20), { holders: 100, reserved: 0 });
    expect(await (await get()).json()).toEqual({ open: false, capped: true, remaining: null });
  });

  it("never returns the limit or the raw count", async () => {
    h.status = computeFoundingStatus(set(137), set(20), { holders: 60, reserved: 0 });
    const body = await (await get()).json();
    expect(Object.keys(body).sort()).toEqual(["capped", "open", "remaining"]);
    expect(JSON.stringify(body)).not.toMatch(/137|77/);
  });

  it("says it is not on sale, without a database read, while the student plan is not configured", async () => {
    h.configured = false;
    h.statusError = new Error("should not be read");
    expect(await (await get()).json()).toEqual({ open: false, capped: false, remaining: null });
  });

  it("shows the offer without a number, rather than failing, when the count cannot be read (checkout still decides)", async () => {
    h.statusError = new Error("database down");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ open: true, capped: false, remaining: null });
    log.mockRestore();
  });

  it("is cached by the CDN for half a minute, so asking on every visit costs no database read each time", async () => {
    const res = await get();
    expect(res.headers.get("cache-control")).toBe("public, s-maxage=30, stale-while-revalidate=60");
  });

  it("is limited per visitor address", async () => {
    const ip = `10.8.0.${++n}`;
    for (let i = 0; i < FOUNDING_STATUS_LIMIT.max; i++) expect((await get(ip)).status).toBe(200);
    expect((await get(ip)).status).toBe(429);
  });
});

describe("the webhook and the founding spot", () => {
  const subscription = (priceId: string, status: string) =>
    ({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status,
          metadata: { userId: "u1" },
          cancel_at_period_end: false,
          items: { data: [{ price: { id: priceId, recurring: { interval: "month" } }, current_period_end: 1_900_000_000 }] },
        },
      },
    }) as never;
  const expired = (metadata: Record<string, string>) => ({ type: "checkout.session.expired", data: { object: { metadata } } }) as never;

  it("gives back the spot held for a checkout once a student subscription is live, because it now holds one itself", async () => {
    await handleStripeEvent(subscription("price_student", "trialing"));
    expect(h.release).toHaveBeenCalledWith("u1");
    h.release.mockClear();
    await handleStripeEvent(subscription("price_student", "active"));
    expect(h.release).toHaveBeenCalledWith("u1");
  });

  it("does nothing about a spot for a Premium subscription, or a student one that is not live", async () => {
    await handleStripeEvent(subscription("price_premium", "active"));
    await handleStripeEvent(subscription("price_student", "incomplete"));
    expect(h.release).not.toHaveBeenCalled();
  });

  it("gives the spot back when a founding checkout closes unpaid", async () => {
    await handleStripeEvent(expired({ plan: "student", userId: "u1" }));
    expect(h.release).toHaveBeenCalledWith("u1");
  });

  it("leaves everything alone when a Premium checkout closes, or one with no account on it", async () => {
    await handleStripeEvent(expired({ userId: "u1" }));
    await handleStripeEvent(expired({ plan: "student" }));
    expect(h.release).not.toHaveBeenCalled();
  });
});
