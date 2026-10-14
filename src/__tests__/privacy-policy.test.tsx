import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PrivacyPolicyPage from "@/app/(marketing)/privacy/page";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE_SECONDS } from "@/lib/attribution";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

// A privacy policy that does not match what the system does is worse than none.
// These tests tie the page to the code and the database: each data practice we
// added or already run must be disclosed, and every number the policy states
// (cookie lifetime, waitlist limit) must be the number the system enforces.

const text = renderToStaticMarkup(<PrivacyPolicyPage />)
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#x27;|&apos;/g, "'")
  .replace(/\s+/g, " ");

const schema = readFileSync(join(__dirname, "../db/schema.sql"), "utf-8");
const layout = readFileSync(join(__dirname, "../app/layout.tsx"), "utf-8");

describe("the privacy policy discloses what we collect", () => {
  it("covers school email verification and the waitlist", () => {
    expect(text).toMatch(/School verification/);
    expect(text).toMatch(/we do not receive student records/i);
    expect(text).toMatch(/school waitlist/i);
    expect(text).toMatch(/not shared with schools/);
  });

  it("covers the campaign cookie by name, with the lifetime the code sets", () => {
    expect(text).toContain(ATTRIBUTION_COOKIE);
    const days = ATTRIBUTION_MAX_AGE_SECONDS / 86_400;
    expect(text).toContain(`${days} days`);
  });

  it("covers measurement events and service usage records", () => {
    expect(text).toMatch(/Measurement events/);
    expect(text).toMatch(/Service usage records/);
    expect(text).toMatch(/Events do not contain your name, your email address, or anything you type/);
  });

  it("names every kind of event we record, in the plain words the policy uses", () => {
    // One phrase per measured event: if an event is added to the code, this list
    // must be extended and the policy reviewed.
    const phrases: Record<(typeof ANALYTICS_EVENTS)[number], RegExp> = {
      students_page_view: /visiting our students page/,
      signup_started: /starting and completing signup/,
      signup_completed: /starting and completing signup/,
      edu_verified: /verifying a school email/,
      first_place_view: /opening your first place/,
      place_saved: /saving a place/,
      surprise_me_used: /using Surprise Me/,
      share_created: /sharing/,
      share_link_opened: /sharing/,
      share_to_signup: /sharing/,
      promo_redeemed: /promo/i,
      premium_started: /starting a Premium subscription/,
    };
    const live = ["students_page_view", "signup_started", "signup_completed", "edu_verified", "first_place_view", "place_saved", "surprise_me_used", "premium_started"] as const;
    for (const event of live) expect(text, event).toMatch(phrases[event]);
    // Events that do not fire yet (sharing, promo codes) must be added to the policy when they ship.
    expect(ANALYTICS_EVENTS).toHaveLength(12);
  });

  it("discloses the third-party trackers the site loads", () => {
    if (layout.includes("<GoogleAnalytics")) expect(text).toMatch(/Google Analytics/);
    if (layout.includes("<Endorsely")) expect(text).toMatch(/Endorsely/);
    expect(text).toMatch(/opt-out browser add-on/);
  });

  it("lists school affiliation among the categories, and still says we hold no student records", () => {
    expect(text).toMatch(/School affiliation/);
    expect(text).toMatch(/Education information Student records No/);
  });

  it("is dated", () => {
    expect(text).toContain("October 14, 2026");
  });
});

describe("the numbers in the policy are the ones the system enforces", () => {
  it("promises a 24-month waitlist limit, and the database deletes at 24 months", () => {
    expect(text).toMatch(/no longer than 24 months after you joined/);
    expect(schema).toMatch(/cron\.schedule\(\s*'campus-waitlist-retention'/);
    expect(schema).toMatch(/delete from public\.campus_waitlist where created_at < now\(\) - interval '24 months'/);
  });

  it("says events and usage records are de-identified on account deletion, and the foreign keys do exactly that", () => {
    expect(text).toMatch(/the link to your account is removed/);
    expect(schema).toMatch(/analytics_events[\s\S]*?user_id uuid references auth\.users\(id\) on delete set null/);
    expect(schema).toMatch(/api_usage_events[\s\S]*?user_id uuid references auth\.users\(id\) on delete set null/);
  });
});
