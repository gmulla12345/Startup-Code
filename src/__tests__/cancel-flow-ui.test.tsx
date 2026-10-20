import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Subscription } from "@/types/database";

// What a subscriber sees when they begin to cancel, and on their profile afterwards. The rules:
// one calm screen, each choice one click, no second confirmation, no guilt; only the alternatives
// that apply are shown; and the profile says plainly what state a subscription is in.

const h = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), fetch: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, refresh: h.refresh }) }));
vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/lib/config/pricing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config/pricing")>()),
  isStudentPriceId: (id: string | null | undefined) => id === "price_student",
  isStudentPlanConfigured: () => false,
}));

import { CancelScreen } from "@/components/profile/cancel-screen";
import { SubscriptionCard } from "@/components/profile/subscription-card";

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const ENDS = "2026-11-20T17:53:00.000Z";
const NEXT = "2026-12-20T17:53:00.000Z";

const screenWith = (over: Partial<{ student: boolean; pause: boolean }> = {}) =>
  render(<CancelScreen endsOn={ENDS} student={over.student ?? true} pause={over.pause ?? true} studentPrice={9.99} />);

beforeEach(() => {
  // The page names dates; without "today" the year shown (only when it is not this year) would depend on the day the tests run.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
  h.push.mockReset();
  h.refresh.mockReset();
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  h.fetch.mockReset().mockResolvedValue(reply(200, { endsOn: ENDS, until: NEXT, priceMonthly: 9.99 }));
  vi.stubGlobal("fetch", h.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const posted = () => h.fetch.mock.calls.map(([url, init]) => [url, JSON.parse((init as RequestInit).body as string)]);

describe("the cancel screen", () => {
  it("says what cancelling does, plainly: when Premium ends, and that everything saved stays", () => {
    screenWith();
    expect(screen.getByRole("heading", { name: "Cancel Premium", level: 1 })).toBeTruthy();
    expect(document.body.textContent).toContain("Premium stays with you until November 20.");
    expect(document.body.textContent).toContain("every place and list you have saved stays exactly where it is");
  });

  it("offers the student price and the pause when they apply, each with what it means", () => {
    screenWith();
    expect(screen.getByRole("heading", { name: "Switch to Student" })).toBeTruthy();
    expect(document.body.textContent).toContain("Everything in Premium for $9.99 a month, from your next payment");
    expect(screen.getByRole("heading", { name: "Pause for a month" })).toBeTruthy();
    expect(document.body.textContent).toContain("Premium continues until November 20. The month after costs nothing and rests on Free");
  });

  it("shows only the alternatives that apply, and none at all when none does", () => {
    screenWith({ student: false });
    expect(screen.queryByRole("heading", { name: "Switch to Student" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Pause for a month" })).toBeTruthy();
    cleanup();
    screenWith({ student: false, pause: false });
    expect(screen.queryByRole("heading", { name: "Pause for a month" })).toBeNull();
    expect(document.body.textContent).not.toContain("If one of these suits you better");
    expect(screen.getByRole("button", { name: "Cancel Premium" })).toBeTruthy(); // the way through is always there
  });

  it("cancels with ONE click: one request, no confirmation step, then back to the profile with one line said", async () => {
    screenWith();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Premium" }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/profile"));
    expect(posted()).toEqual([["/api/stripe/subscription", { action: "cancel" }]]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(h.toast.success).toHaveBeenCalledWith("Premium ends on November 20. Everything you saved stays.");
    expect(h.refresh).toHaveBeenCalled();
  });

  it("pauses with one click, and says when Premium returns", async () => {
    screenWith();
    fireEvent.click(screen.getByRole("button", { name: "Pause for a month" }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/profile"));
    expect(posted()).toEqual([["/api/stripe/subscription", { action: "pause" }]]);
    expect(h.toast.success).toHaveBeenCalledWith("Paused. Premium returns on December 20.");
  });

  it("switches to Student with one click, and says what the next payment is", async () => {
    screenWith();
    fireEvent.click(screen.getByRole("button", { name: "Switch to Student" }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/profile"));
    expect(posted()).toEqual([["/api/stripe/subscription", { action: "student" }]]);
    expect(h.toast.success).toHaveBeenCalledWith("You are on the Student plan. Your next payment is $9.99.");
  });

  it("goes back to the profile, doing nothing, from 'Keep Premium'", () => {
    screenWith();
    const link = screen.getByRole("link", { name: "Keep Premium" });
    expect(link.getAttribute("href")).toBe("/profile");
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("cannot be double-clicked into two requests: every choice is disabled while one is under way", async () => {
    let release: (r: Response) => void = () => {};
    h.fetch.mockReturnValue(new Promise<Response>((resolve) => (release = resolve)));
    screenWith();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Premium" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Pause for a month" }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole("button", { name: /Switch to Student/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Pause for a month" }));
    expect(h.fetch).toHaveBeenCalledTimes(1);
    release(reply(200, { endsOn: ENDS }));
    await waitFor(() => expect(h.push).toHaveBeenCalled());
  });

  it("stays put, says why in the server's words, and lets them try again when it does not go through", async () => {
    h.fetch.mockResolvedValue(reply(409, { error: "Your subscription is already paused." }));
    screenWith();
    fireEvent.click(screen.getByRole("button", { name: "Pause for a month" }));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith("Your subscription is already paused."));
    expect(h.push).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Cancel Premium" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("speaks in the product's voice: no exclamation points, no emoji, no pleading, no reasons asked", () => {
    screenWith();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(text).not.toMatch(/sorry|are you sure|miss you|before you go|don.t go|we.d hate|why are you|tell us why|feedback/i);
    expect(document.querySelectorAll("textarea, select, input[type=radio], input[type=checkbox]").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: "s1",
  userId: "u1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_1",
  stripePriceId: "price_standard",
  status: "active",
  planId: "premium",
  currentPeriodEnd: ENDS,
  cancelAtPeriodEnd: false,
  pausedFrom: null,
  pausedUntil: null,
  digistore24OrderId: null,
  digistore24ManageUrl: null,
  createdAt: "2026-10-20T00:00:00Z",
  updatedAt: "2026-10-20T00:00:00Z",
  ...over,
});
const day = 86_400_000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

describe("the profile card, in each state", () => {
  it("free: offers Premium and nothing about cancelling", () => {
    render(<SubscriptionCard subscription={null} />);
    expect(screen.getByRole("button", { name: "Upgrade to Premium" })).toBeTruthy();
    expect(screen.queryByText("Cancel Premium")).toBeNull();
  });

  it("Premium: Manage subscription, and a quiet way to begin cancelling that leads to the cancel screen", () => {
    render(<SubscriptionCard subscription={sub()} />);
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cancel Premium" }).getAttribute("href")).toBe("/profile/cancel");
    expect(screen.queryByRole("button", { name: "Upgrade to Premium" })).toBeNull();
  });

  it("Premium bought through Digistore24: managed there, with no cancel screen of ours", () => {
    render(<SubscriptionCard subscription={sub({ stripeSubscriptionId: null, digistore24OrderId: "ds-1", digistore24ManageUrl: "https://ds24.example/manage" })} />);
    expect(screen.getByRole("button", { name: "Manage subscription" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Cancel Premium" })).toBeNull();
  });

  it("student: the title says so", () => {
    render(<SubscriptionCard subscription={sub({ stripePriceId: "price_student" })} />);
    expect(screen.getByRole("heading", { name: /Premium · Student/ })).toBeTruthy();
  });

  it("ending: says when, and that what is saved stays; offers to keep Premium, and no longer to cancel", async () => {
    render(<SubscriptionCard subscription={sub({ cancelAtPeriodEnd: true })} />);
    expect(document.body.textContent).toContain("Premium ends on November 20. Everything you saved stays.");
    expect(screen.queryByRole("link", { name: "Cancel Premium" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Keep Premium" }));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("Premium continues."));
    expect(posted()).toEqual([["/api/stripe/subscription", { action: "keep" }]]);
    expect(h.refresh).toHaveBeenCalled();
  });

  it("ending, on Digistore24: no button of ours to take it back", () => {
    render(<SubscriptionCard subscription={sub({ stripeSubscriptionId: null, cancelAtPeriodEnd: true, digistore24OrderId: "ds-1", digistore24ManageUrl: "https://ds24.example/manage" })} />);
    expect(screen.queryByRole("button", { name: "Keep Premium" })).toBeNull();
  });

  it("a pause not yet begun: says when it starts and when Premium returns, and offers to undo it", async () => {
    render(<SubscriptionCard subscription={sub({ pausedFrom: iso(5 * day), pausedUntil: iso(35 * day) })} />);
    expect(document.body.textContent).toMatch(/Premium pauses on [A-Z][a-z]+ \d+\. The month after costs nothing, and Premium returns on [A-Z][a-z]+ \d+/);
    fireEvent.click(screen.getByRole("button", { name: "Undo pause" }));
    await waitFor(() => expect(h.toast.success).toHaveBeenCalledWith("The pause is undone."));
    expect(posted()).toEqual([["/api/stripe/subscription", { action: "unpause" }]]);
  });

  it("a month paused: rests on Free but is not offered Premium again, since the subscription is theirs", () => {
    render(<SubscriptionCard subscription={sub({ pausedFrom: iso(-5 * day), pausedUntil: iso(25 * day) })} />);
    expect(screen.getByRole("heading", { name: /Premium · Paused/ })).toBeTruthy();
    expect(document.body.textContent).toMatch(/Premium is paused\. It returns on [A-Z][a-z]+ \d+, and nothing is charged until then\./);
    expect(screen.queryByRole("button", { name: "Upgrade to Premium" })).toBeNull();
  });

  it("a pause that is over reads as Premium again", () => {
    render(<SubscriptionCard subscription={sub({ pausedFrom: iso(-40 * day), pausedUntil: iso(-10 * day) })} />);
    expect(screen.getByRole("link", { name: "Cancel Premium" })).toBeTruthy();
  });
});
