import { beforeEach, describe, expect, it, vi } from "vitest";

// The checkout endpoint's handling of a promo code: what it accepts, that a person
// cannot guess codes by trying many, and that a refusal reaches them as a message.

const h = vi.hoisted(() => ({ userId: "u1", create: vi.fn() }));

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/auth")>();
  return { ...original, requireUser: async () => ({ user: { id: h.userId, email: "maya@example.edu" } }) };
});
vi.mock("@/lib/stripe/client", () => ({ isStripeConfigured: () => true }));
vi.mock("@/lib/stripe/checkout", () => ({ createCheckoutSession: h.create }));

import { POST } from "@/app/api/stripe/checkout/route";
import { ApiError } from "@/lib/api/auth";

let n = 0;
const post = (body: unknown) =>
  POST(new Request("https://discoverzolo.com/api/stripe/checkout", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  h.userId = `user-${++n}`; // the limiter is per person: a fresh one per test
  h.create.mockReset().mockResolvedValue("https://checkout.stripe.test/cs_1");
});

describe("the code in the request", () => {
  it("is passed on, trimmed, with the plan", async () => {
    const res = await post({ billingInterval: "monthly", promoCode: "  SCHOOL-CLUB " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/cs_1" });
    expect(h.create).toHaveBeenCalledWith(expect.objectContaining({ userId: h.userId, billingInterval: "monthly", promoCode: "SCHOOL-CLUB" }));
  });

  it("is dropped when blank, so the ordinary checkout is untouched", async () => {
    await post({ promoCode: "   " });
    expect(h.create.mock.calls[0][0].promoCode).toBeUndefined();
    await post({});
    expect(h.create.mock.calls[1][0].promoCode).toBeUndefined();
  });

  it("is refused outright if absurdly long", async () => {
    expect((await post({ promoCode: "A".repeat(65) })).status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });
});

describe("trying codes", () => {
  it("is capped per person, so a code cannot be found by guessing", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) statuses.push((await post({ promoCode: `GUESS-${i}` })).status);
    expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(8)).toEqual([429, 429]);
  });

  it("does not limit anyone who is not using a code", async () => {
    for (let i = 0; i < 12; i++) expect((await post({})).status).toBe(200);
  });

  it("is capped for each person separately", async () => {
    for (let i = 0; i < 8; i++) await post({ promoCode: "A-B" });
    expect((await post({ promoCode: "A-B" })).status).toBe(429);
    h.userId = "someone-else";
    expect((await post({ promoCode: "A-B" })).status).toBe(200);
  });
});

describe("a code that cannot be used", () => {
  it("reaches the person as a message with the right status", async () => {
    h.create.mockRejectedValue(new ApiError(403, "Student codes are for verified school email addresses."));
    const res = await post({ promoCode: "SCHOOL-CLUB" });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/verified school email/);
  });
});
