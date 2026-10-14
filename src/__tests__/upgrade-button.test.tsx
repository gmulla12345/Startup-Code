import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/analytics/endorsely", () => ({ getEndorselyReferral: () => undefined }));

import { UpgradeButton } from "@/components/profile/upgrade-button";
import { toast } from "sonner";
import { pricing } from "@/lib/config/pricing";

// The upgrade button with a promo code. It only sends what was typed; the server
// decides. What the page must do is say, before anyone continues, what a student
// code does and what happens when the free month ends.

const fetchMock = vi.fn();
const field = () => screen.getByLabelText("Promo code") as HTMLInputElement;
const upgrade = () => fireEvent.click(screen.getByRole("button", { name: /upgrade to premium/i }));
const sent = () => JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ url: "https://checkout.stripe.test/cs_1" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(toast.error).mockClear();
  // jsdom cannot navigate; it reports "not implemented" for the redirect to Stripe, which is not a failure here.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the promo code field", () => {
  it("is out of the way until asked for", () => {
    render(<UpgradeButton billingInterval="monthly" />);
    expect(screen.queryByLabelText("Promo code")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /have a promo code/i }));
    expect(field().value).toBe("");
  });

  it("opens already filled in when the server found a usable code on the account", () => {
    render(<UpgradeButton billingInterval="monthly" initialCode="SCHOOL-CLUB" />);
    expect(field().value).toBe("SCHOOL-CLUB");
  });

  it("uppercases what is typed", () => {
    render(<UpgradeButton billingInterval="monthly" initialCode="X" />);
    fireEvent.change(field(), { target: { value: "school-club" } });
    expect(field().value).toBe("SCHOOL-CLUB");
  });
});

describe("what is said about a student code", () => {
  const price = `$${pricing.premium.priceMonthly}`;

  it("says a card is needed and when it is charged, when a card is required", () => {
    render(<UpgradeButton billingInterval="monthly" initialCode="SCHOOL-CLUB" requireCard />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/one free month/);
    expect(text).toMatch(/A card is needed/);
    expect(text).toContain(`charged ${price} a month when the month ends unless you cancel first`);
  });

  it("says there is no card, and what to do at the end, when none is required", () => {
    render(<UpgradeButton billingInterval="monthly" initialCode="SCHOOL-CLUB" requireCard={false} />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/with no card/);
    expect(text).toMatch(/add a card from your profile to keep Premium/);
  });

  it("asks for a card unless told otherwise", () => {
    render(<UpgradeButton billingInterval="monthly" initialCode="SCHOOL-CLUB" />);
    expect(document.body.textContent).toMatch(/A card is needed/);
  });

  it("says student codes are for the monthly plan when annual is chosen", () => {
    render(<UpgradeButton billingInterval="annual" initialCode="SCHOOL-CLUB" />);
    expect(document.body.textContent).toMatch(/Student codes apply to monthly Premium/);
  });

  it("says nothing until a code is typed", () => {
    render(<UpgradeButton billingInterval="monthly" />);
    fireEvent.click(screen.getByRole("button", { name: /have a promo code/i }));
    expect(document.body.textContent).not.toMatch(/free month/);
  });

  it("keeps to the brand voice: no exclamation points", () => {
    render(<UpgradeButton billingInterval="monthly" initialCode="SCHOOL-CLUB" />);
    expect(document.body.textContent).not.toContain("!");
  });
});

describe("continuing to checkout", () => {
  it("sends the plan and the code", async () => {
    render(<UpgradeButton billingInterval="monthly" initialCode="SCHOOL-CLUB" />);
    upgrade();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/stripe/checkout");
    expect(sent()).toEqual({ billingInterval: "monthly", promoCode: "SCHOOL-CLUB" });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("sends no code at all when the field is empty or never opened", async () => {
    render(<UpgradeButton billingInterval="annual" />);
    upgrade();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sent()).toEqual({ billingInterval: "annual" });
  });

  it("shows the server's reason when a code is refused, and lets them try again", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "That code has expired." }), { status: 400 }));
    render(<UpgradeButton billingInterval="monthly" initialCode="SCHOOL-CLUB" />);
    upgrade();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("That code has expired."));
    expect((screen.getByRole("button", { name: /upgrade to premium/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});
