import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PrivacyPolicyPage from "@/app/(marketing)/privacy/page";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE_SECONDS } from "@/lib/attribution";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { FIRST_LIST_MAX_AGE_DAYS } from "@/lib/config/start";

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

  it("covers promo codes: what is recorded, who may use a student code, and what happens on account deletion", () => {
    expect(text).toMatch(/Promo codes\. If you use a promo code, we record which code, your account, and when/);
    expect(text).toMatch(/once per person/);
    expect(text).toMatch(/verified school email address, which we check on our servers/);
    expect(text).toMatch(/To apply promo codes/);
    expect(text).toMatch(/Promo code redemptions: when you delete your account, the link to your account is removed/);
  });

  it("covers share links: what is stored, who sees it, what stays hidden, and how to turn it off", () => {
    expect(text).toMatch(/Share links\. If you share a place or a plan, we store a link address/);
    expect(text).toMatch(/Anyone who has the link can see the shared place or plan and your note, and your first name only if you chose to show it/);
    expect(text).toMatch(/we never show your last name, email address, or account/);
    expect(text).toMatch(/come from Google when the page is built and are not stored by us/);
    expect(text).toMatch(/ask search engines not to index shared pages/);
    expect(text).toMatch(/You can turn a link off at any time, which deletes it/);
    expect(text).toMatch(/To let you share places, plans and lists/);
    expect(text).toMatch(/Share links: until you turn the link off, which deletes it, or you delete your account/);
  });

  it("covers shared lists: what is stored, who sees it, what stays hidden, and how to turn it off", () => {
    expect(text).toMatch(/Shared lists. If you share one of your lists, we store a link address/);
    expect(text).toMatch(/which kind of list it is, the Google identifiers of the places on it, and when/);
    expect(text).toMatch(/we never show your name, email address, or account/);
    expect(text).toMatch(/come from Google when the page is built and are not stored by us/);
    expect(text).toMatch(/ask search engines not to index shared lists/);
    expect(text).toMatch(/turn a list.s link off at any time, which deletes it/);
    expect(text).toMatch(/Shared lists: until you turn the list.s link off, which deletes it, or you delete your account/);
  });

  it("covers the first list: what is asked, that the location is not stored, what the browser keeps, and what the account gets", () => {
    expect(text).toMatch(/First list\. If you ask for a list before you have an account/);
    expect(text).toMatch(/We use the location once, to look for places through Google, and we do not store it/);
    expect(text).toMatch(/kept in your browser.s storage, on your device and not on our servers/);
    expect(text).toMatch(/for up to 30 days/);
    expect(text).toMatch(/we save those places to it/);
    expect(text).toMatch(/names, addresses, and photos are not kept: they come from Google each time they are shown/);
    expect(text).toMatch(/Browser storage\. To remember a first list we use your browser.s local storage, not a cookie/);
    expect(text).toMatch(/sent to us only when you ask us to keep the list in an account/);
    expect(text).toMatch(/To give you a first list/);
    expect(text).toMatch(/First list: in your browser for up to 30 days, or until it is saved to an account/);
  });

  it("keeps what it says about the first list equal to what the code does", () => {
    // The policy says 30 days; the code forgets a kept list at the same age.
    expect(FIRST_LIST_MAX_AGE_DAYS).toBe(30);
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
      share_created: /creating a share or list link/,
      share_link_opened: /opening a shared link/,
      // Not recorded as an event: signups from shared links are counted by their source
      // label (share-place, share-plan) in the signup tables instead. If it is ever
      // recorded, it moves to the live list below and the policy must say so.
      share_to_signup: /signup/,
      promo_redeemed: /redeeming a promo code/,
      premium_started: /starting a Premium subscription/,
    };
    const live = ["students_page_view", "signup_started", "signup_completed", "edu_verified", "first_place_view", "place_saved", "surprise_me_used", "promo_redeemed", "share_created", "share_link_opened", "premium_started"] as const;
    for (const event of live) expect(text, event).toMatch(phrases[event]);
    // An event that does not fire yet (share_to_signup) must be added to the policy when it ships.
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
