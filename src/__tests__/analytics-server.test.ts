import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  cookiesThrow: false,
  profile: { signup_src: null, signup_code: null } as { signup_src: string | null; signup_code: string | null },
  inserts: [] as Record<string, unknown>[],
  insertError: null as null | { code: string; message: string },
  rpcCalls: [] as { name: string; args: unknown }[],
  profileReads: 0,
}));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (h.cookiesThrow) throw new Error("outside a request");
    return { get: () => (h.cookie === undefined ? undefined : { value: h.cookie }) };
  },
}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "profiles"
        ? {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  h.profileReads++;
                  return { data: h.profile };
                },
              }),
            }),
          }
        : {
            insert: async (row: Record<string, unknown>) => {
              h.inserts.push(row);
              return { error: h.insertError };
            },
          },
    rpc: async (name: string, args: unknown) => {
      h.rpcCalls.push({ name, args });
      return { error: null };
    },
  }),
}));

import { applySignupAttribution, trackAnalytics } from "@/lib/analytics/server";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
// Next hands a server component the already-decoded cookie value.
const cookieValue = (v: string) => v;

beforeEach(() => {
  h.cookie = undefined;
  h.cookiesThrow = false;
  h.profile = { signup_src: null, signup_code: null };
  h.inserts.length = 0;
  h.insertError = null;
  h.rpcCalls.length = 0;
  h.profileReads = 0;
});

describe("recording an event", () => {
  it("writes the row with the user, the event, and the src/code from the campaign cookie", async () => {
    h.cookie = cookieValue("src=poster-library&code=CAMPUS-CLUB");
    await trackAnalytics("place_saved", { userId: "u1", props: { category: "food_drink" } });
    await flush();
    expect(h.inserts).toEqual([
      {
        event: "place_saved",
        user_id: "u1",
        src: "poster-library",
        code: "CAMPUS-CLUB",
        props: { category: "food_drink" },
        dedupe_key: null,
      },
    ]);
  });

  it("records a visitor with no account as a null user", async () => {
    h.cookie = cookieValue("src=groupme");
    await trackAnalytics("students_page_view");
    await flush();
    expect(h.inserts[0]).toMatchObject({ user_id: null, src: "groupme", code: null });
  });

  it("also reads a cookie value that is still percent-encoded", async () => {
    h.cookie = encodeURIComponent("src=poster-library&code=CAMPUS-CLUB");
    await trackAnalytics("place_saved", { userId: "u1" });
    await flush();
    expect(h.inserts[0]).toMatchObject({ src: "poster-library", code: "CAMPUS-CLUB" });
  });

  it("prefers an explicit attribution over the cookie", async () => {
    h.cookie = cookieValue("src=cookie-src");
    await trackAnalytics("share_link_opened", { attribution: { src: "from-the-link", code: null } });
    await flush();
    expect(h.inserts[0]).toMatchObject({ src: "from-the-link" });
  });

  it("falls back to the attribution saved on the user's profile when there is no cookie (a webhook, an old session)", async () => {
    h.profile = { signup_src: "dorm-flyer", signup_code: "HOUSES-1" };
    await trackAnalytics("premium_started", { userId: "u2", dedupeKey: "premium_started:stripe:sub_1" });
    await flush();
    expect(h.inserts[0]).toMatchObject({ src: "dorm-flyer", code: "HOUSES-1", dedupe_key: "premium_started:stripe:sub_1" });
  });

  it("does not look up the profile when the request already carries attribution", async () => {
    h.cookie = cookieValue("src=groupme");
    await trackAnalytics("place_saved", { userId: "u1" });
    await flush();
    expect(h.profileReads).toBe(0);
  });

  it("records no attribution, rather than failing, when there is none anywhere", async () => {
    await trackAnalytics("place_saved", { userId: "u3" });
    await flush();
    expect(h.inserts[0]).toMatchObject({ src: null, code: null });
  });

  it("works with no request in scope", async () => {
    h.cookiesThrow = true;
    await trackAnalytics("surprise_me_used", { userId: "u4" });
    await flush();
    expect(h.inserts).toHaveLength(1);
  });

  it("stores no personal data even if a caller tries to pass some", async () => {
    await trackAnalytics("place_saved", {
      userId: "u5",
      props: { category: "maya@example.edu", email: "maya@example.edu", note: "my apartment" } as never,
    });
    await flush();
    expect(h.inserts[0].props).toEqual({});
  });

  it("treats a repeated dedupe key as success, not an error", async () => {
    h.insertError = { code: "23505", message: "duplicate key value violates unique constraint" };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await trackAnalytics("first_place_view", { userId: "u6", dedupeKey: "first_place_view:u6" });
    await flush();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("never throws or blocks the caller when the write fails", async () => {
    h.insertError = { code: "XX000", message: "boom" };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(trackAnalytics("place_saved", { userId: "u7" })).resolves.toBeUndefined();
    await flush();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("attaching attribution to a new account", () => {
  it("calls the database function with the campaign values", async () => {
    await applySignupAttribution("u8", { src: "dorm-flyer", code: "HOUSES-1" });
    expect(h.rpcCalls).toEqual([{ name: "apply_signup_attribution", args: { p_user: "u8", p_src: "dorm-flyer", p_code: "HOUSES-1" } }]);
  });

  it("does nothing when there is no attribution to attach", async () => {
    await applySignupAttribution("u9", { src: null, code: null });
    expect(h.rpcCalls).toHaveLength(0);
  });
});
