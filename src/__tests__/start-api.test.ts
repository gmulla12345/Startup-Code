import { beforeEach, describe, expect, it, vi } from "vitest";

// The first-list endpoints: public ones that are bounded, and the one that keeps a list
// in an account. What each accepts, what it refuses, and what it never returns or stores.

const h = vi.hoisted(() => ({
  userId: "u1",
  authed: true,
  build: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  track: vi.fn(),
}));

vi.mock("@/lib/api/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/auth")>();
  return {
    ...original,
    requireUser: async () => {
      if (!h.authed) throw new original.ApiError(401, "Authentication required.");
      return { user: { id: h.userId }, supabase: { tag: "supabase" } };
    },
  };
});
vi.mock("@/lib/start/build", () => ({ buildFirstList: h.build, restoreFirstList: h.restore }));
vi.mock("@/lib/repositories/saved", () => ({ saveExperience: h.save }));
vi.mock("@/lib/analytics/server", () => ({ trackAnalytics: h.track }));

import { POST as makeList } from "@/app/api/start/list/route";
import { POST as restore } from "@/app/api/start/places/route";
import { POST as claim } from "@/app/api/start/claim/route";
import { START_CLAIM_LIMIT, START_LIST_LIMIT, START_RESTORE_LIMIT } from "@/lib/config/start";

let n = 0;
const req = (path: string, body: unknown, ip?: string) =>
  new Request(`https://discoverzolo.com${path}`, {
    method: "POST",
    headers: ip ? { "x-forwarded-for": ip } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const LIST = { title: "Your first list", blurb: "Chosen from what you told us.", places: [] };
const ok = { outing: "meal", budget: "low", latitude: 39.29, longitude: -76.61 };
const ids = ["g-ChIJ-aaaaaaaa", "g-ChIJ-bbbbbbbb", "g-ChIJ-cccccccc"];
const picks = ids.map((experienceId) => ({ experienceId, tags: ["food"], category: "food_drink" }));

beforeEach(() => {
  n += 1; // every limiter is keyed by address or person
  h.userId = `user-${n}`;
  h.authed = true;
  h.build.mockReset().mockResolvedValue(LIST);
  h.restore.mockReset().mockResolvedValue(LIST);
  h.save.mockReset().mockResolvedValue({});
  h.track.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/start/list", () => {
  it("makes a list for someone with no account, from two answers and where they are", async () => {
    const res = await makeList(req("/api/start/list", ok, `10.0.0.${n}`));
    expect(res.status).toBe(200);
    expect((await res.json()).list).toEqual(LIST);
    expect(h.build).toHaveBeenCalledWith(ok);
  });

  it("answers with a null list, not an error, when there are not enough places", async () => {
    h.build.mockResolvedValue(null);
    const res = await makeList(req("/api/start/list", ok, `10.0.0.${n}`));
    expect(res.status).toBe(200);
    expect((await res.json()).list).toBeNull();
  });

  it("refuses unknown answers, impossible coordinates and unreadable bodies, before asking Google anything", async () => {
    for (const bad of [{ ...ok, outing: "x" }, { ...ok, latitude: 200 }, { ...ok, longitude: undefined }, "{nope", null]) {
      const res = await makeList(req("/api/start/list", bad, `10.1.0.${n}`));
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
    expect(h.build).not.toHaveBeenCalled();
  });

  it("never sends the visitor's coordinates or address back, and passes on nothing else they sent", async () => {
    const res = await makeList(req("/api/start/list", { ...ok, email: "maya@example.edu" }, `10.2.0.${n}`));
    const text = JSON.stringify(await res.json());
    expect(text).not.toMatch(/39\.29|-76\.61|maya@|10\.2\.0/);
    expect(h.build.mock.calls[0][0]).not.toHaveProperty("email");
  });

  it("limits how many lists one visitor address can ask for", async () => {
    const ip = `10.3.0.${n}`;
    for (let i = 0; i < START_LIST_LIMIT.max; i++) expect((await makeList(req("/api/start/list", ok, ip))).status).toBe(200);
    expect((await makeList(req("/api/start/list", ok, ip))).status).toBe(429);
    // another address is not held up by it
    expect((await makeList(req("/api/start/list", ok, `10.3.1.${n}`))).status).toBe(200);
  });
});

describe("POST /api/start/places", () => {
  it("gives back the places of a list the visitor already has", async () => {
    const res = await restore(req("/api/start/places", { outing: "meal", budget: "low", ids }, `10.4.0.${n}`));
    expect(res.status).toBe(200);
    expect((await res.json()).list).toEqual(LIST);
    expect(h.restore).toHaveBeenCalledWith({ outing: "meal", budget: "low", ids });
  });

  it("refuses a request that is not a list of three to ten distinct ids", async () => {
    for (const bad of [{ outing: "meal", budget: "low", ids: ids.slice(0, 2) }, { outing: "meal", budget: "low", ids: [ids[0], ids[0], ids[1]] }, { outing: "x", budget: "low", ids }, null]) {
      expect((await restore(req("/api/start/places", bad, `10.5.0.${n}`))).status, JSON.stringify(bad)).toBe(400);
    }
    expect(h.restore).not.toHaveBeenCalled();
  });

  it("is limited per visitor address too", async () => {
    const ip = `10.6.0.${n}`;
    for (let i = 0; i < START_RESTORE_LIMIT.max; i++) expect((await restore(req("/api/start/places", { outing: "meal", budget: "low", ids }, ip))).status).toBe(200);
    expect((await restore(req("/api/start/places", { outing: "meal", budget: "low", ids }, ip))).status).toBe(429);
  });
});

describe("POST /api/start/claim", () => {
  it("saves each place of the list to the account, the way the heart saves one, and counts each save once", async () => {
    const res = await claim(req("/api/start/claim", { picks }));
    expect(res.status).toBe(200);
    expect((await res.json()).saved).toBe(3);
    expect(h.save).toHaveBeenCalledTimes(3);
    expect(h.save).toHaveBeenNthCalledWith(1, { tag: "supabase" }, h.userId, ids[0], "Saved", ["food"], "food_drink");
    expect(h.track).toHaveBeenCalledTimes(3);
    expect(h.track).toHaveBeenCalledWith("place_saved", { userId: h.userId, props: { category: "food_drink" } });
  });

  it("needs a signed-in person, and saves nothing without one", async () => {
    h.authed = false;
    expect((await claim(req("/api/start/claim", { picks }))).status).toBe(401);
    expect(h.save).not.toHaveBeenCalled();
  });

  it("refuses a list that is not clean, saving nothing at all", async () => {
    let person = 0;
    for (const bad of [{ picks: picks.slice(0, 2) }, { picks: [{ ...picks[0], tags: ["not-a-tag"] }, picks[1], picks[2]] }, { picks: [{ ...picks[0], experienceId: "has spaces" }, picks[1], picks[2]] }, { picks: "nope" }, {}, "{nope"]) {
      h.userId = `user-${n}-bad-${person++}`; // the limiter is per person, and it counts refused requests too
      expect((await claim(req("/api/start/claim", bad))).status, JSON.stringify(bad)).toBe(400);
    }
    expect(h.save).not.toHaveBeenCalled();
  });

  it("limits how often one person can do it", async () => {
    for (let i = 0; i < START_CLAIM_LIMIT.max; i++) expect((await claim(req("/api/start/claim", { picks }))).status).toBe(200);
    expect((await claim(req("/api/start/claim", { picks }))).status).toBe(429);
  });
});
