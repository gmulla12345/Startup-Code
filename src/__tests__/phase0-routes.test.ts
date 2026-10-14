import { beforeEach, describe, expect, it, vi } from "vitest";

// Phase 0.4 and 0.5: the Surprise Me "not for me" path used to have no limit and
// no rate check, and the itinerary chat (two Claude calls per message) was open
// to any signed-in account with an itinerary.

const h = vi.hoisted(() => ({
  userId: "user-a",
  premium: false,
  requestedThisWeek: 0,
  rerollsThisWeek: 0,
  countCalls: [] as string[],
  tracked: [] as { type: string; metadata: unknown }[],
  getSurpriseMe: vi.fn(),
  assertWithinLimit: vi.fn(),
  interpret: vi.fn(),
  pick: vi.fn(),
}));

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/auth")>()),
  requireUser: async () => ({ user: { id: h.userId }, supabase: {} }),
}));
vi.mock("@/lib/repositories/profile", () => ({
  getProfileByUserId: async () => ({ userId: h.userId, onboardingCompleted: true }),
}));
vi.mock("@/lib/repositories/subscriptions", () => ({
  getSubscription: async () => null,
  isPremium: () => h.premium,
}));
vi.mock("@/lib/repositories/events", () => ({
  trackEvent: async (_c: unknown, _u: string, type: string, _e: unknown, metadata: unknown) => {
    h.tracked.push({ type, metadata });
  },
  countEventsSince: async (_c: unknown, _u: string, type: string) => {
    h.countCalls.push(type);
    return type === "surprise_me_requested" ? h.requestedThisWeek : h.rerollsThisWeek;
  },
}));
vi.mock("@/services/recommendation/engine", () => ({ getSurpriseMe: h.getSurpriseMe }));
vi.mock("@/lib/usage/limits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/usage/limits")>()),
  assertWithinLimit: h.assertWithinLimit,
}));
vi.mock("@/ai/client", () => ({ isAIConfigured: () => true }));
vi.mock("@/ai/itinerary-chat", () => ({ interpretItineraryChat: h.interpret, pickSwapCandidate: h.pick }));
vi.mock("@/lib/repositories/itineraries", () => ({
  getItineraryWithItems: async () => ({
    itinerary: { id: "it-1", userId: h.userId, title: "Weekend", destinationCity: null },
    items: [{ id: "item-1", dayIndex: 0, startTime: "10:00", title: "Coffee", notes: null }],
  }),
  getSwapCandidates: async () => [],
  deleteItineraryItem: vi.fn(),
  updateItineraryItem: vi.fn(),
}));

import { GET, POST } from "@/app/api/ai/surprise-me/route";
import { POST as CHAT } from "@/app/api/itineraries/[id]/chat/route";
import { UsageLimitError } from "@/lib/usage/limits";
import { FREE_TIER_LIMITS } from "@/lib/config/pricing";

let counter = 0;
const nextUser = () => `user-${++counter}`;

const feedback = (kind: "not_for_me" | "lets_go" = "not_for_me") =>
  new Request("http://localhost/api/ai/surprise-me", {
    method: "POST",
    body: JSON.stringify({ experienceId: "g-place-1", feedback: kind, excludeIds: [], tags: ["music"], category: "nightlife" }),
  });

beforeEach(() => {
  h.userId = nextUser();
  h.premium = false;
  h.requestedThisWeek = 0;
  h.rerollsThisWeek = 0;
  h.countCalls.length = 0;
  h.tracked.length = 0;
  h.getSurpriseMe.mockReset().mockResolvedValue({ experience: { id: "g-next" }, recommendation: {}, headline: "x" });
  h.assertWithinLimit.mockReset().mockResolvedValue(undefined);
  h.interpret.mockReset().mockResolvedValue({ action: "clarify", itemId: null, preference: null, reply: "Which one?" });
  h.pick.mockReset();
});

describe("Surprise Me, the 'not for me' path", () => {
  it("gives a free account its weekly replacements, then stops", async () => {
    h.rerollsThisWeek = FREE_TIER_LIMITS.surpriseMeRerollsPerWeek - 1;
    const allowed = await POST(feedback());
    expect(allowed.status).toBe(200);
    expect(h.getSurpriseMe).toHaveBeenCalledTimes(1);

    h.rerollsThisWeek = FREE_TIER_LIMITS.surpriseMeRerollsPerWeek;
    h.getSurpriseMe.mockClear();
    const blocked = await POST(feedback());
    expect(blocked.status).toBe(402);
    expect(h.getSurpriseMe).not.toHaveBeenCalled();
  });

  it("still records the rejection as a taste signal when it refuses another pick", async () => {
    h.rerollsThisWeek = FREE_TIER_LIMITS.surpriseMeRerollsPerWeek;
    await POST(feedback());
    expect(h.tracked).toEqual([
      { type: "surprise_me_feedback", metadata: { feedback: "not_for_me", tags: ["music"], category: "nightlife" } },
    ]);
  });

  it("counts replacements in the database, so a client cannot reset them", async () => {
    h.rerollsThisWeek = FREE_TIER_LIMITS.surpriseMeRerollsPerWeek;
    // The body below claims nothing has been excluded yet; it changes nothing.
    const res = await POST(feedback());
    expect(res.status).toBe(402);
    expect(h.countCalls).toContain("surprise_me_feedback");
  });

  it("never blocks Premium on the weekly replacements", async () => {
    h.premium = true;
    h.rerollsThisWeek = 999;
    const res = await POST(feedback());
    expect(res.status).toBe(200);
    expect(h.countCalls).not.toContain("surprise_me_feedback");
  });

  it("never blocks 'let's go', which fetches nothing", async () => {
    h.rerollsThisWeek = 999;
    const res = await POST(feedback("lets_go"));
    expect(res.status).toBe(200);
    expect(h.getSurpriseMe).not.toHaveBeenCalled();
  });

  it("rate-limits the path per user, like the GET", async () => {
    h.premium = true;
    let last = 0;
    for (let i = 0; i < 21; i++) last = (await POST(feedback())).status;
    expect(last).toBe(429);
  });

  it("answers 429 with a plain message when the daily Places allowance is spent", async () => {
    h.assertWithinLimit.mockRejectedValue(new UsageLimitError("places", 100));
    const res = await POST(feedback());
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/today's limit/);
  });

  it("attributes the pick to the user and the surprise_me feature", async () => {
    await POST(feedback());
    expect(h.getSurpriseMe.mock.calls[0][3]).toMatchObject({ userId: h.userId, feature: "surprise_me" });
  });
});

describe("Surprise Me, the first pick", () => {
  it("still enforces the weekly allowance for free accounts", async () => {
    h.requestedThisWeek = FREE_TIER_LIMITS.surpriseMePerWeek;
    const res = await GET(new Request("http://localhost/api/ai/surprise-me"));
    expect(res.status).toBe(402);
    expect(h.getSurpriseMe).not.toHaveBeenCalled();
  });
});

describe("Itinerary chat", () => {
  const chat = () =>
    CHAT(new Request("http://localhost/api/itineraries/it-1/chat", { method: "POST", body: JSON.stringify({ message: "swap lunch" }) }), {
      params: Promise.resolve({ id: "it-1" }),
    });

  it("is a Premium feature: a free account is refused before any Claude call", async () => {
    h.premium = false;
    const res = await chat();
    expect(res.status).toBe(402);
    expect(h.interpret).not.toHaveBeenCalled();
    expect(h.pick).not.toHaveBeenCalled();
  });

  it("lets Premium through, attributed to itinerary_chat, within the daily AI allowance", async () => {
    h.premium = true;
    const res = await chat();
    expect(res.status).toBe(200);
    expect(h.assertWithinLimit).toHaveBeenCalledWith(expect.objectContaining({ feature: "itinerary_chat" }), "ai");
    expect(h.interpret.mock.calls[0][3]).toMatchObject({ userId: h.userId, feature: "itinerary_chat" });
  });

  it("answers 429 when a Premium account has used its daily AI allowance", async () => {
    h.premium = true;
    h.assertWithinLimit.mockRejectedValue(new UsageLimitError("ai", 60));
    const res = await chat();
    expect(res.status).toBe(429);
    expect(h.interpret).not.toHaveBeenCalled();
  });
});
