import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS, CLIENT_EVENTS, PROP_ALLOWLIST, isAnalyticsEvent, sanitizeProps } from "@/lib/analytics/events";

// "No PII in event properties" is a structural guarantee, not a promise: only
// allowlisted keys, and only short tokens, can be stored. These tests try to
// smuggle personal data through and confirm it cannot get in.

describe("the event list", () => {
  it("is exactly the twelve requested events", () => {
    expect([...ANALYTICS_EVENTS]).toEqual([
      "students_page_view",
      "signup_started",
      "signup_completed",
      "edu_verified",
      "first_place_view",
      "place_saved",
      "surprise_me_used",
      "share_created",
      "share_link_opened",
      "share_to_signup",
      "promo_redeemed",
      "premium_started",
    ]);
  });

  it("gives every event an allowlist, and lets a browser send only two", () => {
    for (const event of ANALYTICS_EVENTS) expect(PROP_ALLOWLIST[event]).toBeDefined();
    expect([...CLIENT_EVENTS]).toEqual(["students_page_view", "signup_started"]);
    expect(isAnalyticsEvent("page_view")).toBe(false);
  });
});

describe("property sanitizing", () => {
  it("keeps allowlisted short tokens, booleans and numbers", () => {
    expect(sanitizeProps("premium_started", { interval: "Annual", trial: true })).toEqual({ interval: "annual", trial: true });
    expect(sanitizeProps("place_saved", { category: "food_drink" })).toEqual({ category: "food_drink" });
  });

  it("drops every key that is not on the event's allowlist", () => {
    expect(sanitizeProps("place_saved", { category: "food_drink", email: "a@b.com", name: "Maya", user_id: "x" })).toEqual({
      category: "food_drink",
    });
    expect(sanitizeProps("first_place_view", { anything: "else" })).toEqual({});
  });

  it("cannot be used to store an email, a name, a sentence, or an address", () => {
    const attempts = ["maya@loyola.edu", "Maya Johnson", "I love the harbor", "100 N Charles St", "https://x.com/?u=me", "a".repeat(41)];
    for (const value of attempts) {
      expect(sanitizeProps("place_saved", { category: value })).toEqual({});
      expect(sanitizeProps("signup_started", { method: value })).toEqual({});
      expect(sanitizeProps("students_page_view", { campus: value })).toEqual({});
    }
  });

  it("drops objects, arrays and non-finite numbers", () => {
    expect(sanitizeProps("premium_started", { interval: { nested: "x" }, trial: ["a"] })).toEqual({});
    expect(sanitizeProps("surprise_me_used", { reroll: Number.NaN })).toEqual({});
  });

  it("tolerates junk input", () => {
    for (const junk of [null, undefined, "string", 42, ["a"]]) expect(sanitizeProps("place_saved", junk)).toEqual({});
  });
});
