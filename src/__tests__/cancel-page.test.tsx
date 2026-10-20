import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Subscription } from "@/types/database";

// Who is shown the cancel screen, and who is sent back to their profile instead. Only a Premium subscription
// bought through Stripe that is neither ending nor paused has anything to decide here.

const h = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  subscription: null as unknown,
  eduVerified: true,
  founding: { open: true, capped: false, remaining: null } as unknown,
  foundingError: null as Error | null,
  onSale: true,
}));

class Redirect extends Error {
  constructor(public readonly to: string) {
    super(`REDIRECT ${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { edu_verified_at: h.eduVerified ? "2026-09-01T00:00:00Z" : null } }) }) }) }),
  }),
  getCurrentUser: async () => h.user,
}));
vi.mock("@/lib/repositories/subscriptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/repositories/subscriptions")>()),
  getSubscription: async () => h.subscription,
}));
vi.mock("@/lib/founding/offer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/founding/offer")>()),
  getFoundingStatus: async () => {
    if (h.foundingError) throw h.foundingError;
    return h.founding;
  },
  publicFoundingStatus: (s: { open: boolean }) => s,
}));
vi.mock("@/lib/config/pricing", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/config/pricing")>();
  return {
    ...original,
    pricing: { ...original.pricing, premium: { ...original.pricing.premium, priceId: "price_standard" } },
    isStudentPlanConfigured: () => h.onSale,
    isStudentPriceId: (id: string | null | undefined) => id === "price_student",
  };
});

import CancelPremiumPage from "@/app/(app)/profile/cancel/page";

const day = 86_400_000;
const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: "s1",
  userId: "u1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_1",
  stripePriceId: "price_standard",
  status: "active",
  planId: "premium",
  currentPeriodEnd: new Date(Date.now() + 20 * day).toISOString(),
  cancelAtPeriodEnd: false,
  pausedFrom: null,
  pausedUntil: null,
  digistore24OrderId: null,
  digistore24ManageUrl: null,
  createdAt: "2026-10-20T00:00:00Z",
  updatedAt: "2026-10-20T00:00:00Z",
  ...over,
});
const render = async () => renderToStaticMarkup(await CancelPremiumPage());
const redirectTo = async () => ((await render().then(() => null, (e: unknown) => e)) as Redirect | null)?.to ?? null;

beforeEach(() => {
  h.user = { id: "u1" };
  h.subscription = sub();
  h.eduVerified = true;
  h.founding = { open: true, capped: false, remaining: null };
  h.foundingError = null;
  h.onSale = true;
});

describe("the cancel page", () => {
  it("shows a Stripe-backed Premium subscriber the screen, with both alternatives when they apply", async () => {
    const html = await render();
    expect(html).toContain("Cancel Premium");
    expect(html).toContain("Switch to Student");
    expect(html).toContain("Pause for a month");
  });

  it("sends someone who is not signed in to log in", async () => {
    h.user = null;
    expect(await redirectTo()).toBe("/login");
  });

  it("sends back to the profile anyone with nothing to decide: free, lapsed, Digistore24, already ending, already paused", async () => {
    const cases: unknown[] = [
      null,
      sub({ status: "canceled", planId: "free" }),
      sub({ stripeSubscriptionId: null, digistore24OrderId: "ds-1", digistore24ManageUrl: "https://ds24.example" }),
      sub({ cancelAtPeriodEnd: true }),
      sub({ pausedFrom: new Date(Date.now() - day).toISOString(), pausedUntil: new Date(Date.now() + 20 * day).toISOString() }),
      sub({ pausedFrom: new Date(Date.now() + 5 * day).toISOString(), pausedUntil: new Date(Date.now() + 35 * day).toISOString() }),
    ];
    for (const s of cases) {
      h.subscription = s;
      expect(await redirectTo(), JSON.stringify(s)).toBe("/profile");
    }
  });

  it("does not offer the student price to an account without a verified school email, or when the spots are gone, or when it is not on sale", async () => {
    h.eduVerified = false;
    expect(await render()).not.toContain("Switch to Student");
    h.eduVerified = true;
    h.founding = { open: false, capped: true, remaining: 0 };
    expect(await render()).not.toContain("Switch to Student");
    h.founding = { open: true, capped: false, remaining: null };
    h.onSale = false;
    const html = await render();
    expect(html).not.toContain("Switch to Student");
    expect(html).toContain("Pause for a month"); // the pause does not depend on the student plan
  });

  it("does not offer the student price when the spots cannot be read (it would be offered and then refused)", async () => {
    h.foundingError = new Error("db down");
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await render()).not.toContain("Switch to Student");
    quiet.mockRestore();
  });
});
