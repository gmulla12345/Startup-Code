import { beforeEach, describe, expect, it, vi } from "vitest";

// The list endpoints: who may make, look up and turn off a link, what a request may
// contain (only a kind of list and place ids, never words), and that changing or
// turning off a list expires the cached page at once.

const h = vi.hoisted(() => ({
  userId: "u1",
  authed: true,
  save: vi.fn(),
  find: vi.fn(),
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
vi.mock("@/lib/lists/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/lists/store")>();
  return { ...original, saveSharedList: h.save, findSharedList: h.find, deleteSharedList: h.remove };
});
vi.mock("@/lib/analytics/server", () => ({ trackAnalytics: h.track }));
vi.mock("next/cache", () => ({ revalidateTag: h.revalidateTag, unstable_cache: (fn: () => unknown) => () => fn() }));

import { POST, GET } from "@/app/api/lists/route";
import { DELETE } from "@/app/api/lists/[token]/route";
import { LIST_WRITE_LIMIT } from "@/lib/config/lists";
import { getListTemplate } from "@/lib/lists/templates";

const TOKEN = "T".repeat(22);
const IDS = ["ChIJ-aaaaaaaa", "ChIJ-bbbbbbbb", "ChIJ-cccccccc"];

let n = 0;
const post = (body: unknown) => POST(new Request("https://discoverzolo.com/api/lists", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
const get = (qs: string) => GET(new Request(`https://discoverzolo.com/api/lists?${qs}`));
const del = (token: string) => DELETE(new Request(`https://discoverzolo.com/api/lists/${token}`, { method: "DELETE" }), { params: Promise.resolve({ token }) });

beforeEach(() => {
  h.userId = `user-${++n}`; // the write limiter is per person
  h.authed = true;
  h.save.mockReset().mockResolvedValue({ token: TOKEN, created: true });
  h.find.mockReset().mockResolvedValue(null);
  h.remove.mockReset().mockResolvedValue(true);
  h.track.mockReset().mockResolvedValue(undefined);
  h.revalidateTag.mockReset();
});

describe("POST /api/lists", () => {
  it("makes a link, returns its address, and records one share_created event of kind list", async () => {
    const res = await post({ template: "for-you", placeIds: IDS });
    expect(res.status).toBe(201);
    expect((await res.json()).link).toEqual({ token: TOKEN, url: `https://discoverzolo.com/l/${TOKEN}` });
    expect(h.track).toHaveBeenCalledWith("share_created", { userId: h.userId, props: { kind: "list" } });
  });

  it("saves the template's own title and copy, never words from the request", async () => {
    await post({ template: "close-by", placeIds: IDS, title: "Buy my course", blurb: "https://spam.example" });
    const saved = h.save.mock.calls[0][0];
    expect(saved.template).toBe(getListTemplate("close-by"));
    expect(saved.placeIds).toEqual(IDS);
    expect(JSON.stringify(saved)).not.toMatch(/Buy my course|spam\.example/);
  });

  it("answers 200 and expires the cached page when the person shares the same list again", async () => {
    h.save.mockResolvedValue({ token: TOKEN, created: false });
    const res = await post({ template: "for-you", placeIds: IDS });
    expect(res.status).toBe(200);
    expect(h.track).not.toHaveBeenCalled();
    expect(h.revalidateTag).toHaveBeenCalledWith(`list:${TOKEN}`, { expire: 0 });
  });

  it("refuses a kind of list we do not have, and places that are not three to ten distinct Google place ids", async () => {
    for (const body of [
      { template: "my-own-list", placeIds: IDS },
      { placeIds: IDS },
      { template: "for-you", placeIds: IDS.slice(0, 2) },
      { template: "for-you", placeIds: [IDS[0], IDS[0], IDS[1]] },
      { template: "for-you", placeIds: [...IDS, "not a place id!"] },
      { template: "for-you" },
      "{not json",
      null,
    ]) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(h.save).not.toHaveBeenCalled();
  });

  it("needs a signed-in person", async () => {
    h.authed = false;
    expect((await post({ template: "for-you", placeIds: IDS })).status).toBe(401);
    expect(h.save).not.toHaveBeenCalled();
  });

  it("limits how fast one person can make or change links", async () => {
    for (let i = 0; i < LIST_WRITE_LIMIT.max; i++) expect((await post({ template: "for-you", placeIds: IDS })).status).toBe(201);
    expect((await post({ template: "for-you", placeIds: IDS })).status).toBe(429);
  });
});

describe("GET /api/lists", () => {
  it("returns the link the person already has for a kind of list, or null", async () => {
    expect((await (await get("template=for-you")).json()).link).toBeNull();
    h.find.mockResolvedValue({ token: TOKEN });
    expect((await (await get("template=for-you")).json()).link).toEqual({ token: TOKEN, url: `https://discoverzolo.com/l/${TOKEN}` });
    expect(h.find).toHaveBeenLastCalledWith(h.userId, "for-you");
  });

  it("refuses a kind of list we do not have, and needs a signed-in person", async () => {
    expect((await get("template=nope")).status).toBe(400);
    expect((await get("")).status).toBe(400);
    h.authed = false;
    expect((await get("template=for-you")).status).toBe(401);
  });
});

describe("DELETE /api/lists/[token]", () => {
  it("turns the link off and expires the cached page at once", async () => {
    const res = await del(TOKEN);
    expect(res.status).toBe(200);
    expect(h.remove).toHaveBeenCalledWith(h.userId, TOKEN);
    expect(h.revalidateTag).toHaveBeenCalledWith(`list:${TOKEN}`, { expire: 0 });
  });

  it("answers 404 for a list that is not the person's, a list that is gone, and anything that is not a token", async () => {
    h.remove.mockResolvedValue(false);
    expect((await del(TOKEN)).status).toBe(404);
    expect(h.revalidateTag).not.toHaveBeenCalled();
    h.remove.mockClear();
    expect((await del("short")).status).toBe(404);
    expect(h.remove).not.toHaveBeenCalled();
  });

  it("needs a signed-in person", async () => {
    h.authed = false;
    expect((await del(TOKEN)).status).toBe(401);
    expect(h.remove).not.toHaveBeenCalled();
  });
});
