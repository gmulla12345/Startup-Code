import { beforeEach, describe, expect, it, vi } from "vitest";
import { fail, ok, type Call } from "./helpers/fake-admin";

// The share-link store: one live link per person per target, a cap on how many a
// person can hold, and what the public page is allowed to learn about the sharer.

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  db: {} as Record<string, (call: Call) => unknown>,
}));

vi.mock("@/lib/supabase/admin", async () => {
  const { createFakeAdmin: make } = await import("./helpers/fake-admin");
  return {
    createAdminClient: () =>
      make((call) => (h.db[call.table] ? (h.db[call.table](call) as never) : { data: null, error: null }), h.calls),
  };
});
// Run the cached function straight through: the cache itself is Next's, not ours to test.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => () => fn(),
}));

import { MAX_ACTIVE_SHARE_LINKS } from "@/lib/config/share";
import { deleteShareLink, findShareLink, getPublicShare, saveShareLink, userOwnsItinerary } from "@/lib/share/links";
import { SHARE_TOKEN_PATTERN } from "@/lib/share/token";

const PLACE = { kind: "place", placeId: "ChIJ-fixture-place-id-0001" } as const;
const PLAN = { kind: "plan", itineraryId: "0b8f3c9e-1111-4222-8333-444455556666" } as const;

const row = (over: Record<string, unknown> = {}) => ({
  token: "t".repeat(22),
  kind: "place",
  place_id: PLACE.placeId,
  itinerary_id: null,
  note: null,
  show_name: false,
  ...over,
});

beforeEach(() => {
  h.calls.length = 0;
  h.db = {};
});

describe("making a link", () => {
  it("creates a new one with a fresh unguessable token, private by default", async () => {
    h.db.share_links = (c) => (c.op === "insert" ? ok(row({ token: "x".repeat(22), note: c.values?.note, show_name: c.values?.show_name })) : c.selectOptions?.count ? ok(null, 3) : ok(null));
    const { link, created } = await saveShareLink({ userId: "u1", target: PLACE, note: null, showName: false });

    expect(created).toBe(true);
    expect(link.showName).toBe(false);
    const insert = h.calls.find((c) => c.op === "insert")!;
    expect(insert.values).toMatchObject({ user_id: "u1", kind: "place", place_id: PLACE.placeId, itinerary_id: null, note: null, show_name: false });
    expect(insert.values?.token).toMatch(SHARE_TOKEN_PATTERN);
  });

  it("points a plan's link at the plan, and stores no place", async () => {
    h.db.share_links = (c) => (c.op === "insert" ? ok(row({ kind: "plan", place_id: null, itinerary_id: PLAN.itineraryId })) : c.selectOptions?.count ? ok(null, 0) : ok(null));
    await saveShareLink({ userId: "u1", target: PLAN, note: "Go early", showName: true });
    const insert = h.calls.find((c) => c.op === "insert")!;
    expect(insert.values).toMatchObject({ kind: "plan", place_id: null, itinerary_id: PLAN.itineraryId, note: "Go early", show_name: true });
  });

  it("stores only the place id of a place: nothing else from Google", async () => {
    h.db.share_links = (c) => (c.op === "insert" ? ok(row()) : c.selectOptions?.count ? ok(null, 0) : ok(null));
    await saveShareLink({ userId: "u1", target: PLACE, note: null, showName: false });
    const stored = Object.keys(h.calls.find((c) => c.op === "insert")!.values!).sort();
    expect(stored).toEqual(["itinerary_id", "kind", "note", "place_id", "show_name", "token", "user_id"]);
  });

  it("updates the person's existing link for the same target instead of making a second", async () => {
    h.db.share_links = (c) => {
      if (c.op === "update") return ok(row({ note: c.values?.note, show_name: c.values?.show_name }));
      return c.op === "select" ? ok(row()) : ok(null);
    };
    const { link, created } = await saveShareLink({ userId: "u1", target: PLACE, note: "Updated", showName: true });
    expect(created).toBe(false);
    expect(link).toMatchObject({ note: "Updated", showName: true });
    expect(h.calls.some((c) => c.op === "insert")).toBe(false);
    const update = h.calls.find((c) => c.op === "update")!;
    expect(update.filters).toMatchObject({ user_id: "u1" }); // only ever their own row
  });

  it("refuses a person who already holds the most links allowed", async () => {
    h.db.share_links = (c) => (c.selectOptions?.count ? ok(null, MAX_ACTIVE_SHARE_LINKS) : ok(null));
    await expect(saveShareLink({ userId: "u1", target: PLACE, note: null, showName: false })).rejects.toMatchObject({ status: 409 });
    expect(h.calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("recovers when a parallel request made the link first", async () => {
    let lookups = 0;
    h.db.share_links = (c) => {
      if (c.op === "insert") return fail("duplicate key value violates unique constraint", "23505");
      if (c.selectOptions?.count) return ok(null, 0);
      return ++lookups === 1 ? ok(null) : ok(row({ token: "r".repeat(22) }));
    };
    const { link, created } = await saveShareLink({ userId: "u1", target: PLACE, note: null, showName: false });
    expect(created).toBe(false);
    expect(link.token).toBe("r".repeat(22));
  });

  it("lets any other database error out rather than pretending it worked", async () => {
    h.db.share_links = (c) => (c.op === "insert" ? fail("connection reset") : c.selectOptions?.count ? ok(null, 0) : ok(null));
    await expect(saveShareLink({ userId: "u1", target: PLACE, note: null, showName: false })).rejects.toThrow(/could not make the link/);
  });
});

describe("finding and checking", () => {
  it("looks a link up by person, kind and target only", async () => {
    h.db.share_links = () => ok(row());
    expect(await findShareLink("u1", PLACE)).toMatchObject({ kind: "place", placeId: PLACE.placeId });
    expect(h.calls[0].filters).toEqual({ user_id: "u1", kind: "place", place_id: PLACE.placeId });
    await findShareLink("u1", PLAN);
    expect(h.calls[1].filters).toEqual({ user_id: "u1", kind: "plan", itinerary_id: PLAN.itineraryId });
  });

  it("says a plan is the person's only if it is theirs", async () => {
    h.db.itineraries = (c) => (c.filters.user_id === "owner" ? ok({ id: PLAN.itineraryId }) : ok(null));
    expect(await userOwnsItinerary("owner", PLAN.itineraryId)).toBe(true);
    expect(await userOwnsItinerary("someone-else", PLAN.itineraryId)).toBe(false);
  });
});

describe("turning a link off", () => {
  it("deletes it, but only the owner's: the token alone is not enough", async () => {
    h.db.share_links = () => ok([{ token: "t".repeat(22) }]);
    expect(await deleteShareLink("u1", "t".repeat(22))).toBe(true);
    const del = h.calls.find((c) => c.op === "delete")!;
    expect(del.filters).toEqual({ token: "t".repeat(22), user_id: "u1" });
  });

  it("reports that nothing was deleted when it was not theirs", async () => {
    h.db.share_links = () => ok([]);
    expect(await deleteShareLink("intruder", "t".repeat(22))).toBe(false);
  });
});

describe("what a public page may learn", () => {
  const token = "p".repeat(22);

  it("is the link's own content and, only if the sharer ticked the box, their first name", async () => {
    h.db.share_links = () => ok(row({ show_name: true, note: "Go early", user_id: "u1" }));
    h.db.profiles = () => ok({ first_name: "  Maya " });
    expect(await getPublicShare(token)).toEqual({ kind: "place", placeId: PLACE.placeId, itineraryId: null, note: "Go early", sharerName: "Maya" });
  });

  it("never reads the sharer's profile when they did not tick the box", async () => {
    h.db.share_links = () => ok(row({ show_name: false, user_id: "u1" }));
    h.db.profiles = () => ok({ first_name: "Maya" });
    const share = await getPublicShare(token);
    expect(share?.sharerName).toBeNull();
    expect(h.calls.some((c) => c.table === "profiles")).toBe(false);
  });

  it("carries no account id, email, or anything else about the person", async () => {
    h.db.share_links = () => ok(row({ show_name: true, user_id: "u1" }));
    h.db.profiles = () => ok({ first_name: "Maya", last_name: "Rivera", email: "maya@example.edu" });
    const share = await getPublicShare(token);
    expect(Object.keys(share!).sort()).toEqual(["itineraryId", "kind", "note", "placeId", "sharerName"]);
    expect(JSON.stringify(share)).not.toMatch(/u1|Rivera|example\.edu/);
  });

  it("is no name when ticked but the profile has none", async () => {
    h.db.share_links = () => ok(row({ show_name: true, user_id: "u1" }));
    h.db.profiles = () => ok({ first_name: "" });
    expect((await getPublicShare(token))?.sharerName).toBeNull();
  });

  it("is null for a link that does not exist or was turned off: the same answer", async () => {
    h.db.share_links = () => ok(null);
    expect(await getPublicShare(token)).toBeNull();
  });

  it("lets a database error out, rather than showing a not-found page for an outage", async () => {
    h.db.share_links = () => fail("connection reset");
    await expect(getPublicShare(token)).rejects.toThrow(/could not read the link/);
  });
});
