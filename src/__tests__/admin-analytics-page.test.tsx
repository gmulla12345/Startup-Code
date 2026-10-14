import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The admin analytics page is protected, and it formats numbers a person will
// make decisions from, so both are tested: who is let in, and what is shown
// (including "not yet" for a cohort too new to have a return rate).

const h = vi.hoisted(() => ({
  user: null as null | { app_metadata?: { role?: string }; email?: string },
  views: {} as Record<string, unknown[]>,
  redirected: [] as string[],
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    h.redirected.push(to);
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (view: string) => {
      const result = Promise.resolve({ data: h.views[view] ?? [], error: null });
      return { select: () => Object.assign(result, { order: () => result }) };
    },
  }),
}));

import AdminAnalyticsPage from "@/app/admin/analytics/page";

const render = async () => renderToStaticMarkup(await AdminAnalyticsPage());

beforeEach(() => {
  h.redirected.length = 0;
  process.env.ADMIN_EMAIL = "owner@example.com";
  h.user = { email: "owner@example.com" };
  h.views = {
    v_event_counts: [{ event: "place_saved", last_7d: 4, last_30d: 9, total: 12 }],
    v_signups_by_src_code: [
      { src: "poster-library", code: "CAMPUS-CLUB", signups: 7, signups_7d: 3, signups_30d: 7, last_signup_at: "2026-10-12T15:00:00Z" },
      { src: "(none)", code: "(none)", signups: 10, signups_7d: 0, signups_30d: 0, last_signup_at: null },
    ],
    v_return_rates_by_src_code: [
      { src: "poster-library", code: "CAMPUS-CLUB", users: 7, week2_eligible: 3, week2_returned: 2, week2_return_pct: 66.7, week4_eligible: 0, week4_returned: 0, week4_return_pct: null },
    ],
    v_saves_by_src_code: [
      { src: "poster-library", code: "CAMPUS-CLUB", users: 7, users_with_save: 4, users_with_save_pct: 57.1, total_saves: 11, saves_per_user: 1.57, median_saves: 1 },
    ],
    v_events_by_src_code: [
      { src: "poster-library", code: "CAMPUS-CLUB", event: "signup_completed", events: 7 },
      { src: "poster-library", code: "CAMPUS-CLUB", event: "place_saved", events: 11 },
    ],
    v_promo_redemptions_by_code: [
      { code: "SCHOOL-CLUB", started: 9, redeemed: 7, redeemed_7d: 4, last_redeemed_at: "2026-10-18T15:00:00Z", month_ended: 3, paid_after: 2, paid_after_pct: 66.7 },
      { code: "SCHOOL-HOUSES", started: 2, redeemed: 1, redeemed_7d: 1, last_redeemed_at: "2026-10-19T15:00:00Z", month_ended: 0, paid_after: 0, paid_after_pct: null },
    ],
  };
});

describe("who can open it", () => {
  it("sends a visitor who is not signed in to the login page", async () => {
    h.user = null;
    await expect(render()).rejects.toThrow("REDIRECT:/login");
  });

  it("sends a signed-in user who is not an admin back to the app", async () => {
    h.user = { email: "student@loyola.edu" };
    await expect(render()).rejects.toThrow("REDIRECT:/home");
    expect(h.redirected).toEqual(["/home"]);
  });

  it("lets the owner in, and an account flagged as admin", async () => {
    await expect(render()).resolves.toContain("Analytics");
    h.user = { email: "someone@else.com", app_metadata: { role: "admin" } };
    await expect(render()).resolves.toContain("Analytics");
  });
});

describe("what it shows", () => {
  it("lists every measured event, with zero for ones that have not fired", async () => {
    const html = await render();
    for (const event of ["students_page_view", "signup_started", "edu_verified", "share_created", "promo_redeemed", "premium_started"]) {
      expect(html).toContain(event);
    }
    expect(html).toMatch(/place_saved<\/td><td[^>]*>4<\/td><td[^>]*>9<\/td><td[^>]*>12</);
  });

  it("shows signups by source and code, with (none) for untagged accounts", async () => {
    const html = await render();
    expect(html).toContain("poster-library");
    expect(html).toContain("CAMPUS-CLUB");
    expect(html).toContain("(none)");
  });

  it("shows return rates as 'n of m', and 'not yet' for a window that has not passed", async () => {
    const html = await render();
    expect(html).toContain("2 of 3");
    expect(html).toContain("66.7%");
    expect(html).toContain("0 of 0");
    expect(html).toContain("not yet");
  });

  it("explains how return is defined, so the number is not misread", async () => {
    const html = await render();
    expect(html).toMatch(/7 to 14 days/);
    expect(html).toMatch(/21 to\s+28 days/);
    expect(html).toMatch(/only scrolling is not recorded/);
  });

  it("shows each promo code's redemptions, next to the return rate", async () => {
    const html = await render();
    expect(html).toMatch(/SCHOOL-CLUB<\/td><td[^>]*>9<\/td><td[^>]*>7<\/td><td[^>]*>4<\/td>/);
    expect(html).toContain("2 of 3"); // went on to pay, of those whose free month has ended
    expect(html).toContain("66.7%");
    expect(html).toMatch(/SCHOOL-HOUSES<\/td>[\s\S]*?0 of 0[\s\S]*?not yet/); // too recent to say
    const at = (heading: string) => html.indexOf(`>${heading}<`);
    expect(at("Return rate")).toBeGreaterThan(-1);
    expect(at("Promo codes")).toBeGreaterThan(at("Return rate"));
    expect(at("Saves per user")).toBeGreaterThan(at("Promo codes"));
  });

  it("explains the promo columns, and shows counts only: nobody is named", async () => {
    const html = await render();
    expect(html).toMatch(/35 days/);
    expect(html).toMatch(/Who redeemed is not shown here/);
    expect(html).not.toMatch(/user_id|@/);
  });

  it("shows saves per user", async () => {
    const html = await render();
    expect(html).toContain("57.1%");
    expect(html).toContain("1.57");
  });

  it("pivots events into a funnel per source and code", async () => {
    const html = await render();
    expect(html).toMatch(/CAMPUS-CLUB<\/td>(<td[^>]*>\d+<\/td>){2}<td[^>]*>7<\/td>/);
  });

  it("says so plainly when nothing has been recorded", async () => {
    h.views = {};
    const html = await render();
    expect(html).toContain("Nothing recorded yet.");
  });
});
