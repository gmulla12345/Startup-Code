import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  signUp: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  send: vi.fn(),
  attribution: { src: null, code: null } as { src: string | null; code: string | null },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push, refresh: h.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signUp: h.signUp } }) }));
vi.mock("@/lib/analytics/client", () => ({ readAttribution: () => h.attribution, sendAnalyticsEvent: h.send }));

import { StudentsSignup } from "@/components/students/students-signup";
import { FALLBACK_CAMPUSES } from "@/lib/campus";

const field = (label: RegExp | string) => screen.getByLabelText(label) as HTMLInputElement;
const submit = () => fireEvent.click(screen.getByRole("button", { name: /create account/i }));
const fill = (label: RegExp | string, value: string) => fireEvent.change(field(label), { target: { value } });

function fillValidForm(overrides: { email?: string; password?: string; code?: string } = {}) {
  fill("School email", overrides.email ?? "Maya@Students.Loyola.edu");
  fill("Password", overrides.password ?? "correct horse");
  if (overrides.code !== undefined) fill("Promo code", overrides.code);
}

beforeEach(() => {
  h.signUp.mockReset().mockResolvedValue({ data: { session: null, user: { id: "u1" } }, error: null });
  h.push.mockReset();
  h.refresh.mockReset();
  h.send.mockReset();
  h.attribution = { src: null, code: null };
  window.history.pushState({}, "", "/students");
});
afterEach(() => cleanup());

describe("the promo code", () => {
  it("is prefilled from ?code= in the link, uppercased", () => {
    window.history.pushState({}, "", "/students?code=loyola-businessclub&src=poster-library");
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    expect(field("Promo code").value).toBe("LOYOLA-BUSINESSCLUB");
  });

  it("falls back to the campaign cookie when the URL has none", () => {
    h.attribution = { src: "groupme", code: "HOUSES-1" };
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    expect(field("Promo code").value).toBe("HOUSES-1");
  });

  it("is empty when there is no code anywhere, and ignores a hostile one in the URL", () => {
    window.history.pushState({}, "", "/students?code=%3Cscript%3E");
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    expect(field("Promo code").value).toBe("");
  });
});

describe("measurement", () => {
  it("records a page view on load, with no personal data", () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    expect(h.send).toHaveBeenCalledWith("students_page_view");
  });

  it("records signup_started once, the first time the form is touched", () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fireEvent.focusIn(field("School email"));
    fireEvent.focusIn(field("Password"));
    fireEvent.focusIn(field("Promo code"));
    const started = h.send.mock.calls.filter((c) => c[0] === "signup_started");
    expect(started).toEqual([["signup_started", { method: "email" }]]);
  });
});

describe("validation", () => {
  it("asks for a school (.edu) address", () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fillValidForm({ email: "maya@gmail.com" });
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/school email, ending in \.edu/);
    expect(h.signUp).not.toHaveBeenCalled();
  });

  it("asks for a password of eight characters", () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fillValidForm({ password: "short" });
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/at least eight characters/);
    expect(h.signUp).not.toHaveBeenCalled();
  });

  it("rejects a promo code with stray characters", () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fillValidForm({ code: "free money!" });
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/letters, numbers and hyphens/);
    expect(h.signUp).not.toHaveBeenCalled();
  });
});

describe("creating the account", () => {
  it("signs up with the normalized email and the campaign saved in the account's metadata", async () => {
    h.attribution = { src: "poster-library", code: null };
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fillValidForm({ code: "loyola-businessclub" });
    submit();

    await waitFor(() => expect(h.signUp).toHaveBeenCalledTimes(1));
    const arg = h.signUp.mock.calls[0][0];
    expect(arg.email).toBe("maya@students.loyola.edu");
    expect(arg.password).toBe("correct horse");
    expect(arg.options.data).toEqual({ src: "poster-library", code: "LOYOLA-BUSINESSCLUB" });
    expect(arg.options.emailRedirectTo).toMatch(/\/auth\/callback\?redirect=\/onboarding$/);
  });

  it("uses the campaign cookie's code when the field was left empty, and sends no empty keys", async () => {
    h.attribution = { src: null, code: "HOUSES-1" };
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    window.history.pushState({}, "", "/students");
    fillValidForm({ code: "" });
    submit();
    await waitFor(() => expect(h.signUp).toHaveBeenCalled());
    expect(h.signUp.mock.calls[0][0].options.data).toEqual({ code: "HOUSES-1" });
  });

  it("tells the student to check their inbox, naming the address", async () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fillValidForm();
    submit();
    expect(await screen.findByText("Check your inbox.")).toBeTruthy();
    expect(screen.getByText("maya@students.loyola.edu")).toBeTruthy();
  });

  it("goes straight to onboarding when no confirmation is required", async () => {
    h.signUp.mockResolvedValue({ data: { session: { access_token: "t" }, user: { id: "u1" } }, error: null });
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fillValidForm();
    submit();
    await waitFor(() => expect(h.push).toHaveBeenCalledWith("/onboarding"));
  });

  it("shows the service's message when signup fails, and lets them try again", async () => {
    h.signUp.mockResolvedValue({ data: { session: null, user: null }, error: { message: "Password is too weak." } });
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fillValidForm();
    submit();
    expect((await screen.findByRole("alert")).textContent).toBe("Password is too weak.");
    expect((screen.getByRole("button", { name: /create account/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("recognizing the school", () => {
  it("names the school as soon as the address matches, including a subdomain", () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    expect(screen.getAllByText("Loyola University Maryland")).toHaveLength(1); // just the option
    fill("School email", "maya@students.loyola.edu");
    expect(screen.getAllByText("Loyola University Maryland")).toHaveLength(2);
  });

  it("is honest about a school that is not served yet, and points to the waitlist", () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    fill("School email", "maya@someplace.edu");
    expect(screen.getByText(/not at that school yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));
    expect(field("Your email").value).toBe("maya@someplace.edu");
  });
});

describe("the waitlist", () => {
  const openWaitlist = () => fireEvent.click(screen.getByLabelText("Don't see your school?"));

  it("replaces the signup form with an email and an optional school name", () => {
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    openWaitlist();
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(field("Your email")).toBeTruthy();
    expect(field("Your school")).toBeTruthy();
  });

  it("posts the email and school, with the hidden field empty, and says thank you", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    openWaitlist();
    fill("Your email", "maya@someplace.edu");
    fill("Your school", "Someplace College");
    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));

    expect(await screen.findByText(/we will write when we reach your school/i)).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/waitlist");
    expect(JSON.parse(init.body as string)).toEqual({ email: "maya@someplace.edu", school: "Someplace College", company: "" });
    vi.unstubAllGlobals();
  });

  it("shows the server's message when it cannot save", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Please enter a valid email address." }), { status: 400 })));
    render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    openWaitlist();
    fill("Your email", "nope");
    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));
    expect((await screen.findByRole("alert")).textContent).toBe("Please enter a valid email address.");
    vi.unstubAllGlobals();
  });
});

describe("copy", () => {
  it("keeps to the brand voice: no exclamation points", () => {
    const { container } = render(<StudentsSignup campuses={FALLBACK_CAMPUSES} />);
    expect(container.textContent).not.toContain("!");
  });
});
