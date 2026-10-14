import { beforeEach, describe, expect, it, vi } from "vitest";

// The share endpoints: who may make, read and turn off a link, what they may put
// in it, and that turning a link off (or changing it) expires the cached page at
// once, with no stale copy served.

const h = vi.hoisted(() => ({
  userId: "u1",
  authed: true,
  save: vi.fn(),
  find: vi.fn(),
  owns: vi.fn(),
  remove: vi.fn(),
  track: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/auth")>();
  return {
    ...original,
    requireUser: async () => {
      if (!h.authed) throw new original.ApiError(401, "Authentication required.");
      return { user: { id: h.userId } };
    },
  };
});
vi.mock("@/lib/share/links", () => ({
  saveShareLink: h.save,
  findShareLink: h.find,
  userOwnsItinerary: h.owns,
  deleteShareLink: h.remove,
}));
vi.mock("@/lib/analytics/server", () => ({ trackAnalytics: h.track }));
vi.mock("next/cache", () => ({ revalidateTag: h.revalidateTag, unstable_cache: (fn: () => unknown) => () => fn() }));

import { POST, GET } from "@/app/api/shares/route";
import { DELETE } from "@/app/api/shares/[token]/route";
import { SHARE_WRITE_LIMIT } from "@/lib/config/share";

const TOKEN = "T".repeat(22);
const PLAN_ID = "0b8f3c9e-1111-4222-8333-444455556666";
const link = (over: Record<string, unknown> = {}) => ({ token: TOKEN, kind: "place", placeId: "ChIJ-fixture-place-id-0001", itineraryId: null, note: null, showName: false, ...over });

let n = 0;
const post = (body: unknown) =>
  POST(new Request("https://discoverzolo.com/api/shares", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
const get = (qs: string) => GET(new Request(`https://discoverzolo.com/api/shares?${qs}`));
const del = (token: string) => DELETE(new Request(`https://discoverzolo.com/api/shares/${token}`, { method: "DELETE" }), { params: Promise.resolve({ token }) });

beforeEach(() => {
  h.userId = `user-${++n}`; // the write limiter is per person
  h.authed = true;
  h.save.mockReset().mockResolvedValue({ link: link(), created: true });
  h.find.mockReset().mockResolvedValue(null);
  h.owns.mockReset().mockResolvedValue(true);
  h.remove.mockReset().mockResolvedValue(true);
  h.track.mockReset().mockResolvedValue(undefined);
  h.revalidateTag.mockReset();
});

describe("making a link", () => {
  it("makes one for a Google place, private by default, and returns the address", async () => {
    const res = await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001" });
    expect(res.status).toBe(201);
    expect((await res.json()).link).toEqual({ token: TOKEN, kind: "place", url: `https://discoverzolo.com/s/${TOKEN}`, note: null, showName: false });
    expect(h.save).toHaveBeenCalledWith({
      userId: h.userId,
      target: { kind: "place", placeId: "ChIJ-fixture-place-id-0001" },
      note: null,
      showName: false,
    });
  });

  it("never shows the name unless it is asked to: absent, and anything but true, is hidden", async () => {
    await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001" });
    expect(h.save.mock.calls[0][0].showName).toBe(false);
    expect((await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001", showName: "yes" })).status).toBe(400);
  });

  it("passes on the note and the name when the person chose them, with the note tidied", async () => {
    await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001", note: "  Go\nearly ", showName: true });
    expect(h.save.mock.calls[0][0]).toMatchObject({ note: "Go early", showName: true });
  });

  it("makes one for a plan, but only the person's own", async () => {
    await post({ kind: "plan", itineraryId: PLAN_ID });
    expect(h.owns).toHaveBeenCalledWith(h.userId, PLAN_ID);
    expect(h.save.mock.calls[0][0].target).toEqual({ kind: "plan", itineraryId: PLAN_ID });

    h.save.mockClear();
    h.owns.mockResolvedValue(false);
    const res = await post({ kind: "plan", itineraryId: PLAN_ID });
    expect(res.status).toBe(404);
    expect(h.save).not.toHaveBeenCalled();
  });

  it("refuses a place that is not from Google, with a plain reason, and stores nothing", async () => {
    for (const experienceId of ["0b8f3c9e-1111-4222-8333-444455556666", "ChIJ-no-prefix-at-all-1", "g-short", "g-../../etc/passwd....."]) {
      const res = await post({ kind: "place", experienceId });
      expect(res.status, experienceId).toBe(400);
      expect((await res.json()).error).toBe("This place cannot be shared as a link yet.");
    }
    expect(h.save).not.toHaveBeenCalled();
  });

  it("refuses a note with a link in it, or one that is too long, and stores nothing", async () => {
    let res = await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001", note: "see https://example.com" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Notes cannot contain links.");
    res = await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001", note: "a".repeat(141) });
    expect(res.status).toBe(400);
    expect(h.save).not.toHaveBeenCalled();
  });

  it("refuses malformed requests", async () => {
    for (const body of ["not json", {}, { kind: "event" }, { kind: "plan", itineraryId: "not-a-uuid" }, { kind: "place" }, { kind: "place", experienceId: 5 }]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(h.save).not.toHaveBeenCalled();
  });

  it("needs a signed-in person", async () => {
    h.authed = false;
    expect((await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001" })).status).toBe(401);
    expect(h.save).not.toHaveBeenCalled();
  });

  it("is limited per person, so a script cannot churn links", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < SHARE_WRITE_LIMIT.max + 2; i++) statuses.push((await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001" })).status);
    expect(statuses.slice(0, SHARE_WRITE_LIMIT.max).every((s) => s === 201)).toBe(true);
    expect(statuses.slice(SHARE_WRITE_LIMIT.max)).toEqual([429, 429]);
  });

  it("passes on the store's refusal when the person already holds too many", async () => {
    const { ApiError } = await import("@/lib/api/auth");
    h.save.mockRejectedValue(new ApiError(409, "You have reached the limit of shared links. Turn one off to share another."));
    const res = await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001" });
    expect(res.status).toBe(409);
  });
});

describe("what is recorded and what is expired", () => {
  it("records one share_created event, with only the kind, when a new link is made", async () => {
    await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001" });
    expect(h.track).toHaveBeenCalledTimes(1);
    expect(h.track).toHaveBeenCalledWith("share_created", { userId: h.userId, props: { kind: "place" } });
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it("when the person changes an existing link, records no new event and expires the page at once", async () => {
    h.save.mockResolvedValue({ link: link({ note: "New words", showName: false }), created: false });
    const res = await post({ kind: "place", experienceId: "g-ChIJ-fixture-place-id-0001", note: "New words", showName: false });
    expect(res.status).toBe(200);
    expect(h.track).not.toHaveBeenCalled();
    // expire: 0 means no stale copy: an unticked name must be gone from the very next visit.
    expect(h.revalidateTag).toHaveBeenCalledWith(`share:${TOKEN}`, { expire: 0 });
  });
});

describe("looking up the person's own link", () => {
  it("returns it, or null", async () => {
    h.find.mockResolvedValue(link({ note: "Go early", showName: true }));
    let res = await get("kind=place&experienceId=g-ChIJ-fixture-place-id-0001");
    expect((await res.json()).link).toMatchObject({ token: TOKEN, note: "Go early", showName: true, url: `https://discoverzolo.com/s/${TOKEN}` });
    expect(h.find).toHaveBeenCalledWith(h.userId, { kind: "place", placeId: "ChIJ-fixture-place-id-0001" });

    h.find.mockResolvedValue(null);
    res = await get(`kind=plan&itineraryId=${PLAN_ID}`);
    expect((await res.json()).link).toBeNull();
  });

  it("asks the same questions as making one, so it cannot be used to probe", async () => {
    expect((await get("kind=place&experienceId=nonsense")).status).toBe(400);
    expect((await get("kind=plan&itineraryId=not-a-uuid")).status).toBe(400);
    expect((await get("kind=other")).status).toBe(400);
    h.owns.mockResolvedValue(false);
    expect((await get(`kind=plan&itineraryId=${PLAN_ID}`)).status).toBe(404);
    expect(h.find).not.toHaveBeenCalled();
  });

  it("needs a signed-in person", async () => {
    h.authed = false;
    expect((await get("kind=place&experienceId=g-ChIJ-fixture-place-id-0001")).status).toBe(401);
  });
});

describe("turning a link off", () => {
  it("deletes it, and expires the cached page and preview image with no stale copy", async () => {
    const res = await del(TOKEN);
    expect(res.status).toBe(200);
    expect(h.remove).toHaveBeenCalledWith(h.userId, TOKEN);
    expect(h.revalidateTag).toHaveBeenCalledWith(`share:${TOKEN}`, { expire: 0 });
  });

  it("is a plain not-found for someone else's link or one that does not exist, and expires nothing", async () => {
    h.remove.mockResolvedValue(false);
    const res = await del(TOKEN);
    expect(res.status).toBe(404);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it("does not even look in the database for something that cannot be a token", async () => {
    for (const bad of ["x", "../../etc", "a".repeat(40)]) expect((await del(bad)).status, bad).toBe(404);
    expect(h.remove).not.toHaveBeenCalled();
  });

  it("needs a signed-in person", async () => {
    h.authed = false;
    expect((await del(TOKEN)).status).toBe(401);
    expect(h.remove).not.toHaveBeenCalled();
  });
});
