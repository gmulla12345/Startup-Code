import { beforeEach, describe, expect, it, vi } from "vitest";

// The public endpoint is the one place a browser can write an event, so it is
// narrow by design. The rest of the events are recorded by the server where the
// thing happens: a save, a Surprise Me pick, a payment.

const h = vi.hoisted(() => ({
  user: null as { id: string } | null,
  track: vi.fn(),
  premium: false,
  saved: vi.fn(),
  tracked: [] as string[],
  getSurpriseMe: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/analytics/server", () => ({ trackAnalytics: h.track, applySignupAttribution: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: async () => h.user,
  createClient: async () => ({}),
}));
vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/auth")>()),
  requireUser: async () => ({ user: { id: "user-w" }, supabase: {} }),
}));
vi.mock("@/lib/repositories/saved", () => ({
  listSaved: vi.fn(),
  saveExperience: async () => ({ id: "s1" }),
  setSavedStatus: vi.fn(),
  unsaveExperience: vi.fn(),
}));
vi.mock("@/lib/repositories/events", () => ({
  trackEvent: async (_c: unknown, _u: string, type: string) => void h.tracked.push(type),
  countEventsSince: async () => 0,
}));
vi.mock("@/services/providers", () => ({ getExperienceProvider: async () => ({}) }));
vi.mock("@/lib/repositories/profile", () => ({ getProfileByUserId: async () => ({ userId: "user-w", onboardingCompleted: true }) }));
vi.mock("@/lib/repositories/subscriptions", () => ({ getSubscription: async () => null, isPremium: () => h.premium }));
vi.mock("@/services/recommendation/engine", () => ({ getSurpriseMe: h.getSurpriseMe }));
vi.mock("@/lib/usage/limits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/usage/limits")>()),
  assertWithinLimit: async () => undefined,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ update: () => ({ eq: h.update }) }) }),
}));

import { POST as publicEvent } from "@/app/api/analytics/event/route";
import { POST as saveRoute } from "@/app/api/saved/route";
import { GET as surpriseGet, POST as surprisePost } from "@/app/api/ai/surprise-me/route";
import { handleStripeEvent } from "@/lib/stripe/webhook-handlers";

let ipCounter = 0;
const send = (body: unknown, headers: Record<string, string> = {}) =>
  publicEvent(
    new Request("http://localhost/api/analytics/event", {
      method: "POST",
      headers: { "x-forwarded-for": `198.51.100.${++ipCounter}`, "user-agent": "Mozilla/5.0 (iPhone)", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

beforeEach(() => {
  h.user = null;
  h.premium = false;
  h.track.mockReset();
  h.tracked.length = 0;
  h.update.mockReset().mockResolvedValue({});
  h.getSurpriseMe.mockReset().mockResolvedValue({ experience: { id: "g-1" }, recommendation: {}, headline: "x" });
});

describe("the public event endpoint", () => {
  it("accepts the events a browser may send", async () => {
    for (const event of ["students_page_view", "signup_started", "share_link_opened"]) {
      expect((await send({ event, props: { campus: "loyola-maryland", kind: "place" } })).status).toBe(200);
    }
    expect(h.track).toHaveBeenCalledTimes(3);
    expect(h.track.mock.calls[0][0]).toBe("students_page_view");
  });

  it("records a shared link being opened with only its kind, and nothing a person typed", async () => {
    await send({ event: "share_link_opened", props: { kind: "plan", token: "T".repeat(22), note: "my address is 1 Main St" } });
    expect(h.track).toHaveBeenCalledTimes(1);
    const [event, options] = h.track.mock.calls[0];
    expect(event).toBe("share_link_opened");
    // The endpoint hands props to trackAnalytics, which keeps only allowlisted tokens
    // (see analytics-events.test.ts): the allowlist for this event is the kind alone.
    const { PROP_ALLOWLIST, sanitizeProps } = await import("@/lib/analytics/events");
    expect(PROP_ALLOWLIST.share_link_opened).toEqual(["kind"]);
    expect(sanitizeProps("share_link_opened", options.props)).toEqual({ kind: "plan" });
  });

  it("refuses every event that belongs to the server, so it cannot be forged", async () => {
    for (const event of ["place_saved", "premium_started", "signup_completed", "first_place_view", "promo_redeemed", "edu_verified", "share_created", "share_to_signup"]) {
      expect((await send({ event })).status).toBe(400);
    }
    expect(h.track).not.toHaveBeenCalled();
  });

  it("refuses an unknown event and an unreadable body", async () => {
    expect((await send({ event: "page_view" })).status).toBe(400);
    expect((await send("not json")).status).toBe(400);
    expect((await send({})).status).toBe(400);
    expect(h.track).not.toHaveBeenCalled();
  });

  it("takes the user from the session, never from the body", async () => {
    h.user = { id: "real-user" };
    await send({ event: "signup_started", userId: "attacker", user_id: "attacker", props: { method: "email" } });
    expect(h.track.mock.calls[0][1]).toMatchObject({ userId: "real-user" });
  });

  it("records an anonymous visitor as a null user", async () => {
    await send({ event: "students_page_view" });
    expect(h.track.mock.calls[0][1]).toMatchObject({ userId: null });
  });

  it("ignores crawlers so page views are not inflated", async () => {
    const res = await send({ event: "students_page_view" }, { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" });
    expect(res.status).toBe(200);
    expect(h.track).not.toHaveBeenCalled();
  });

  it("is rate-limited per IP", async () => {
    let last = 0;
    for (let i = 0; i < 61; i++) {
      last = (
        await publicEvent(
          new Request("http://localhost/api/analytics/event", {
            method: "POST",
            headers: { "x-forwarded-for": "203.0.113.50", "user-agent": "Mozilla/5.0" },
            body: JSON.stringify({ event: "signup_started" }),
          })
        )
      ).status;
    }
    expect(last).toBe(429);
  });
});

describe("events recorded where they happen", () => {
  it("records place_saved when a place is saved, with its category only", async () => {
    await saveRoute(
      new Request("http://localhost/api/saved", {
        method: "POST",
        body: JSON.stringify({ experienceId: "g-place-1", collection: "Saved", tags: ["music"], category: "nightlife" }),
      })
    );
    expect(h.track).toHaveBeenCalledWith("place_saved", { userId: "user-w", props: { category: "nightlife" } });
  });

  it("records surprise_me_used for a first pick and marks a replacement as a reroll", async () => {
    await surpriseGet(new Request("http://localhost/api/ai/surprise-me"));
    expect(h.track).toHaveBeenCalledWith("surprise_me_used", { userId: "user-w", props: { reroll: false } });

    h.track.mockClear();
    await surprisePost(
      new Request("http://localhost/api/ai/surprise-me", {
        method: "POST",
        body: JSON.stringify({ experienceId: "g-1", feedback: "not_for_me", excludeIds: [], tags: [], category: null }),
      })
    );
    expect(h.track).toHaveBeenCalledWith("surprise_me_used", { userId: "user-w", props: { reroll: true } });
  });

  it("does not record a use when 'not for me' produced no new pick", async () => {
    h.getSurpriseMe.mockResolvedValue(null);
    await surprisePost(
      new Request("http://localhost/api/ai/surprise-me", {
        method: "POST",
        body: JSON.stringify({ experienceId: "g-1", feedback: "not_for_me", excludeIds: [], tags: [], category: null }),
      })
    );
    expect(h.track).not.toHaveBeenCalled();
  });
});

describe("premium_started from Stripe", () => {
  const subscriptionEvent = (status: string, interval = "month") =>
    ({
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_1",
          status,
          metadata: { userId: "user-s" },
          cancel_at_period_end: false,
          items: { data: [{ price: { id: "price_1", recurring: { interval } }, current_period_end: 1_900_000_000 }] },
        },
      },
    }) as never;

  it("records it once per subscription, keyed on the Stripe subscription id, so retries do not double count", async () => {
    await handleStripeEvent(subscriptionEvent("trialing"));
    expect(h.track).toHaveBeenCalledWith("premium_started", {
      userId: "user-s",
      dedupeKey: "premium_started:stripe:sub_123",
      props: { interval: "monthly", trial: true },
    });
  });

  it("labels an annual plan, and a paid (not trial) start", async () => {
    await handleStripeEvent(subscriptionEvent("active", "year"));
    expect(h.track.mock.calls[0][1].props).toEqual({ interval: "annual", trial: false });
  });

  it("records nothing when the subscription is not live", async () => {
    await handleStripeEvent(subscriptionEvent("canceled"));
    await handleStripeEvent(subscriptionEvent("incomplete"));
    expect(h.track).not.toHaveBeenCalled();
  });
});
