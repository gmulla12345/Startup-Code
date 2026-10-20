import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

// What a visitor sees of the Student plan: the card beside Premium, the choice a signed-in
// student makes, the answers in the FAQ and the Terms. The rule behind all of it: nothing is
// said about a price we cannot charge, so every mention depends on the plan being on sale
// (its Stripe price id set). The numbers are read from the config, never typed twice.

const h = vi.hoisted(() => ({ push: vi.fn(), fetch: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: h.toast }));

/** The modules read the plan's price id from the environment when they load, so load them fresh for each case. */
async function load(onSale: boolean) {
  vi.resetModules();
  if (onSale) vi.stubEnv("NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID", "price_student_test");
  else vi.stubEnv("NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID", "");
  const [{ PricingCards }, { PRICING_FAQ_ITEMS }, terms, { PremiumPlanCard }, { SubscriptionCard }, config] = await Promise.all([
    import("@/components/marketing/pricing-cards"),
    import("@/lib/content/pricing-faq"),
    import("@/app/(marketing)/terms/page"),
    import("@/components/profile/premium-plan-card"),
    import("@/components/profile/subscription-card"),
    import("@/lib/config/pricing"),
  ]);
  return { PricingCards, PRICING_FAQ_ITEMS, TermsPage: terms.default, PremiumPlanCard, SubscriptionCard, config };
}

beforeEach(() => {
  window.localStorage.clear();
  h.push.mockReset();
  h.fetch.mockReset().mockResolvedValue(new Response(JSON.stringify({ url: "https://checkout.stripe.test/cs" }), { status: 200 }));
  vi.stubGlobal("fetch", h.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the pricing page, with the Student plan not on sale", () => {
  it("says nothing about a student price: no card, no FAQ answer, no Terms paragraph", async () => {
    const { PricingCards, PRICING_FAQ_ITEMS, TermsPage } = await load(false);
    const cards = renderToStaticMarkup(<PricingCards />);
    expect(cards).not.toMatch(/Verify your school email|Everything in Premium/);
    expect(cards).toContain("Start Premium");
    expect(PRICING_FAQ_ITEMS.map((i) => i.q)).not.toContain("Is there a student price?");
    expect(renderToStaticMarkup(<TermsPage />)).not.toContain("Student plan.");
  });
});

describe("the pricing page, with the Student plan on sale", () => {
  it("shows Free, then Premium, then Student beside it, in that order", async () => {
    const { PricingCards } = await load(true);
    const html = renderToStaticMarkup(<PricingCards />);
    const at = (s: string) => html.indexOf(s);
    expect(at("Get started")).toBeGreaterThan(-1);
    expect(at("Start Premium")).toBeGreaterThan(at("Get started"));
    expect(at("Verify your school email")).toBeGreaterThan(at("Start Premium"));
  });

  it("puts the student price beside the regular one so it reads against it, both real numbers from the config", async () => {
    const { PricingCards, config } = await load(true);
    const html = renderToStaticMarkup(<PricingCards />);
    expect(config.studentPricing.priceMonthly).toBe(9.99);
    expect(html).toContain(`Regular Premium is $${config.pricing.premium.priceMonthly} a month.`);
    expect(html).toMatch(/line-through[^>]*>\$19\.99<\/span><span[^>]*>\$9\.99<\/span>/);
  });

  it("says what a student needs and gets, and where to go: verify with a school email, or choose it in the profile", async () => {
    const { PricingCards } = await load(true);
    const html = renderToStaticMarkup(<PricingCards />);
    expect(html).toContain("Everything in Premium");
    expect(html).toContain("Verified once, with your school email");
    expect(html).toContain("Your rate stays the same while you stay subscribed");
    expect(html).toContain('href="/students"');
    expect(html).toContain('href="/profile/upgrade"');
    expect(html).toContain("7-day free trial, then $9.99 a month.");
  });

  it("keeps the Free plan visible and useful beside them", async () => {
    const { PricingCards } = await load(true);
    const html = renderToStaticMarkup(<PricingCards />);
    expect(html).toContain("Free");
    expect(html).toContain("Unlimited saves");
    expect(html).toContain("No credit card required");
  });

  it("names no school", async () => {
    const { PricingCards } = await load(true);
    expect(renderToStaticMarkup(<PricingCards />)).not.toMatch(/loyola/i);
  });

  it("is worded in the brand's voice: no exclamation points, no emoji", async () => {
    const { PricingCards, PRICING_FAQ_ITEMS } = await load(true);
    const text = renderToStaticMarkup(<PricingCards />).replace(/<[^>]+>/g, " ") + PRICING_FAQ_ITEMS.map((i) => i.q + i.a).join(" ");
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("answers the student question in the pricing FAQ, with the numbers and the rules", async () => {
    const { PRICING_FAQ_ITEMS } = await load(true);
    const item = PRICING_FAQ_ITEMS.find((i) => i.q === "Is there a student price?");
    expect(item?.a).toContain("$9.99 a month");
    expect(item?.a).toMatch(/monthly only/);
    expect(item?.a).toMatch(/check your school email once/);
    expect(item?.a).toMatch(/your rate stays the same for as long as you stay subscribed/);
    expect(item?.a).toMatch(/free month comes first, then the student price/);
  });

  it("states the plan in the Terms: the price, who, the one-time check, what happens after school, and the code", async () => {
    const { TermsPage } = await load(true);
    const text = renderToStaticMarkup(<TermsPage />).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("Student plan. The Student plan is Premium at $9.99/month");
    expect(text).toMatch(/billed monthly only, for accounts with a verified school email address/);
    expect(text).toMatch(/We check the school email once, when you start/);
    expect(text).toMatch(/not re-checked and does not end because you leave school/);
    expect(text).toMatch(/If you cancel and later return, the terms and price in force then apply/);
    expect(text).toMatch(/the free month comes first, and your card is charged the student price when it ends/);
  });
});

describe("the choice a signed-in person makes", () => {
  it("shows only Premium, as before, when the Student plan is not on sale", async () => {
    const { PremiumPlanCard } = await load(false);
    render(<PremiumPlanCard />);
    expect(screen.queryByRole("button", { name: "Student" })).toBeNull();
    expect(screen.getByText("Annual")).toBeTruthy();
  });

  it("offers Premium and Student to a verified student, with the regular price struck beside the student one", async () => {
    const { PremiumPlanCard } = await load(true);
    render(<PremiumPlanCard student={{ eligible: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Student" }));
    expect(screen.getByText("$9.99")).toBeTruthy();
    expect(screen.getByText("$19.99").className).toMatch(/line-through/);
    expect(screen.getByText(/Your rate stays the same while you stay subscribed/)).toBeTruthy();
    expect(screen.queryByText("Annual")).toBeNull(); // the student price is monthly only
  });

  it("asks checkout for the student plan, monthly, and for nothing else about the price", async () => {
    const { PremiumPlanCard } = await load(true);
    render(<PremiumPlanCard student={{ eligible: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Student" }));
    fireEvent.click(screen.getByRole("button", { name: "Start the Student plan" }));
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    const body = JSON.parse(h.fetch.mock.calls[0][1].body);
    expect(body.plan).toBe("student");
    expect(body.billingInterval).toBe("monthly");
    expect(JSON.stringify(body)).not.toMatch(/price_|unit_amount|9\.99/);
  });

  it("asks for Premium exactly as it always did when Premium is chosen: no plan named", async () => {
    const { PremiumPlanCard } = await load(true);
    render(<PremiumPlanCard student={{ eligible: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Premium" }));
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    expect(JSON.parse(h.fetch.mock.calls[0][1].body)).not.toHaveProperty("plan");
  });

  it("tells an account without a verified school email what it needs, offers nothing to buy, and points to the students page", async () => {
    const { PremiumPlanCard } = await load(true);
    render(<PremiumPlanCard student={{ eligible: false }} />);
    fireEvent.click(screen.getByRole("button", { name: "Student" }));
    expect(screen.getByText(/The student price is for accounts with a verified school email/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Make an account with your school email" }).getAttribute("href")).toBe("/students");
    expect(screen.queryByRole("button", { name: /Student plan|Upgrade to Premium/ })).toBeNull();
    expect(screen.queryByText("$9.99")).toBeNull();
  });

  it("words the student code's note for the student plan: the free month, then the student price", async () => {
    const { PremiumPlanCard } = await load(true);
    render(<PremiumPlanCard student={{ eligible: true }} requireCard />);
    fireEvent.click(screen.getByRole("button", { name: "Student" }));
    fireEvent.click(screen.getByText("Have a promo code?"));
    fireEvent.change(screen.getByLabelText("Promo code"), { target: { value: "school-club" } });
    expect(screen.getByText(/one free month of the Student plan.*charged \$9\.99 a month when the month ends/)).toBeTruthy();
  });
});

describe("the profile", () => {
  const sub = (stripePriceId: string) =>
    ({ planId: "premium", status: "active", stripePriceId, cancelAtPeriodEnd: false, digistore24ManageUrl: null }) as never;

  it("labels a subscription at the student price as the student plan, and Premium as Premium", async () => {
    const { SubscriptionCard } = await load(true);
    const { unmount } = render(<SubscriptionCard subscription={sub("price_student_test")} />);
    expect(screen.getByText(/Premium · Student/)).toBeTruthy();
    unmount();
    render(<SubscriptionCard subscription={sub("price_premium")} />);
    expect(screen.queryByText(/· Student/)).toBeNull();
  });

  it("sends the free plan's upgrade button to the page that offers the choice, once the student plan is on sale", async () => {
    const { SubscriptionCard } = await load(true);
    render(<SubscriptionCard subscription={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Premium" }));
    expect(h.push).toHaveBeenCalledWith("/profile/upgrade");
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("goes straight to checkout, as before, when the student plan is not on sale", async () => {
    const { SubscriptionCard } = await load(false);
    render(<SubscriptionCard subscription={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Upgrade to Premium" }));
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    expect(h.push).not.toHaveBeenCalled();
  });
});

describe("the founding offer on the pricing page", () => {
  const answer = (body: unknown, ok = true) => h.fetch.mockResolvedValue(new Response(JSON.stringify(body), { status: ok ? 200 : 500 }));

  it("asks how the offer stands, from the page, since the page itself is built once and reused", async () => {
    answer({ open: true, capped: false, remaining: null });
    const { PricingCards } = await load(true);
    render(<PricingCards />);
    await waitFor(() => expect(h.fetch).toHaveBeenCalledWith("/api/pricing/founding"));
  });

  it("does not ask at all while the student plan is not on sale", async () => {
    const { PricingCards } = await load(false);
    render(<PricingCards />);
    await new Promise((r) => setTimeout(r, 20));
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("calls the price a founding rate when it has a limit, and gives no number while there are many spots", async () => {
    answer({ open: true, capped: true, remaining: null });
    const { PricingCards } = await load(true);
    render(<PricingCards />);
    expect(await screen.findByText("Founding student rate")).toBeTruthy();
    expect(screen.queryByText(/founding spots? left/)).toBeNull();
  });

  it("gives the number of spots left only when the owner's threshold sent one, with the right grammar", async () => {
    answer({ open: true, capped: true, remaining: 7 });
    const { PricingCards } = await load(true);
    const { unmount } = render(<PricingCards />);
    expect(await screen.findByText("7 founding spots left")).toBeTruthy();
    unmount();
    answer({ open: true, capped: true, remaining: 1 });
    render(<PricingCards />);
    expect(await screen.findByText("1 founding spot left")).toBeTruthy();
  });

  it("says nothing about a founding rate, or a number, when the price has no limit", async () => {
    answer({ open: true, capped: false, remaining: null });
    const { PricingCards } = await load(true);
    render(<PricingCards />);
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("Founding student rate")).toBeNull();
    expect(screen.getByText("Verify your school email")).toBeTruthy();
  });

  it("takes the Student card away once the spots are gone: an offer that has ended is not shown", async () => {
    answer({ open: false, capped: true, remaining: null });
    const { PricingCards } = await load(true);
    render(<PricingCards />);
    await waitFor(() => expect(screen.queryByText("Verify your school email")).toBeNull());
    expect(screen.getByText("Start Premium")).toBeTruthy(); // Premium and Free stay
    expect(screen.getByText("Get started")).toBeTruthy();
  });

  it("shows the card as built, without a note, when the status cannot be read", async () => {
    answer({}, false);
    const { PricingCards } = await load(true);
    render(<PricingCards />);
    await waitFor(() => expect(h.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText("Verify your school email")).toBeTruthy();
    expect(screen.queryByText("Founding student rate")).toBeNull();
  });

  it("says the same on the upgrade chooser once Student is chosen, from the real count the server passed", async () => {
    const { PremiumPlanCard } = await load(true);
    render(<PremiumPlanCard student={{ eligible: true, capped: true, remaining: 3 }} />);
    expect(screen.queryByText("Founding student rate")).toBeNull(); // not while Premium is chosen
    fireEvent.click(screen.getByRole("button", { name: "Student" }));
    expect(screen.getByText("Founding student rate")).toBeTruthy();
    expect(screen.getByText("3 founding spots left")).toBeTruthy();
  });

  it("is worded in the brand's voice: no exclamation points, no urgency words, no emoji", async () => {
    answer({ open: true, capped: true, remaining: 2 });
    const { PricingCards } = await load(true);
    render(<PricingCards />);
    await screen.findByText("2 founding spots left");
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/hurry|last chance|ending soon|don't miss|act now|only \d+ left/i);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("states in the FAQ and the Terms that the price may be limited, and that those already on it keep their rate", async () => {
    const { PRICING_FAQ_ITEMS, TermsPage } = await load(true);
    const faq = PRICING_FAQ_ITEMS.find((i) => i.q === "Is there a student price?")!.a;
    expect(faq).toMatch(/may be offered to a limited number of students/);
    expect(faq).toMatch(/anyone already on it keeps their rate/);
    const terms = renderToStaticMarkup(<TermsPage />).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(terms).toMatch(/may be offered to a limited number of students; when its spots are taken it is no longer offered to new subscribers, and a subscriber already on it keeps their rate/);
  });
});
