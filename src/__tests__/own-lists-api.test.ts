import { beforeEach, describe, expect, it, vi } from "vitest";

// The routes behind "Your lists": who may make, read, change and delete a list, what a request may contain, that a list is
// private unless the person chose, and that changing or deleting one expires its public page at once.

const PLACE = (n: number) => `ChIJownapi${String(n).padStart(9, "0")}`;
const EXP = (n: number) => `g-${PLACE(n)}`;
const ID = "11111111-2222-4333-8444-555555555555";
const TOKEN = "T".repeat(22);
const NEW_TOKEN = "N".repeat(22);

const h = vi.hoisted(() => ({
  userId: "u1",
  authed: true,
  list: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
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
vi.mock("@/lib/lists/own", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/lists/own")>()),
  listOwnLists: h.list,
  getOwnList: h.get,
  saveOwnList: h.save,
  deleteOwnList: h.remove,
}));
vi.mock("@/lib/analytics/server", () => ({ trackAnalytics: h.track }));
vi.mock("next/cache", () => ({ revalidateTag: h.revalidateTag, unstable_cache: (fn: () => unknown) => () => fn() }));

import { GET, POST } from "@/app/api/my-lists/route";
import { DELETE, GET as GET_ONE, PATCH } from "@/app/api/my-lists/[id]/route";
import { ApiError } from "@/lib/api/auth";
import { LIST_WRITE_LIMIT } from "@/lib/config/lists";

const own = (over: Record<string, unknown> = {}) => ({ id: ID, token: TOKEN, title: "Late-night study spots", blurb: null, isPublic: false, showName: false, placeIds: [PLACE(1), PLACE(2), PLACE(3)], updatedAt: "2026-10-20T00:00:00Z", ...over });
const saved = (over: Record<string, unknown> = {}) => ({ list: own(), created: true, replacedToken: null, madePublic: false, ...over });
const body = (over: Record<string, unknown> = {}) => ({ title: "Late-night study spots", experienceIds: [EXP(1), EXP(2), EXP(3)], ...over });

let n = 0;
const req = (method: string, payload?: unknown) => new Request("https://discoverzolo.com/api/my-lists", { method, body: payload === undefined ? undefined : typeof payload === "string" ? payload : JSON.stringify(payload) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  h.userId = `user-${++n}`; // the write limiter is per person
  h.authed = true;
  h.list.mockReset().mockResolvedValue([own()]);
  h.get.mockReset().mockResolvedValue(own());
  h.save.mockReset().mockResolvedValue(saved());
  h.remove.mockReset().mockResolvedValue(TOKEN);
  h.track.mockReset().mockResolvedValue(undefined);
  h.revalidateTag.mockReset();
});

describe("making a list", () => {
  it("makes it private, for the person asking, from the words and places they sent", async () => {
    const res = await POST(req("POST", body()));
    expect(res.status).toBe(201);
    expect(h.save).toHaveBeenCalledWith(h.userId, null, expect.objectContaining({ title: "Late-night study spots", placeIds: [PLACE(1), PLACE(2), PLACE(3)], isPublic: false, showName: false }));
    const out = await res.json();
    expect(out.list.isPublic).toBe(false);
    expect(out.list.url).toBeNull(); // a private list has no link to give out
  });

  it("makes it public, with a link and a name, only when the person chose both", async () => {
    h.save.mockResolvedValue(saved({ list: own({ isPublic: true, showName: true }), madePublic: true }));
    const res = await POST(req("POST", body({ isPublic: true, showName: true })));
    expect(h.save).toHaveBeenCalledWith(h.userId, null, expect.objectContaining({ isPublic: true, showName: true }));
    expect((await res.json()).list.url).toBe(`https://discoverzolo.com/l/${TOKEN}`);
  });

  it("never shows a name on a list that is not public, whatever was sent", async () => {
    await POST(req("POST", body({ isPublic: false, showName: true })));
    expect(h.save).toHaveBeenCalledWith(h.userId, null, expect.objectContaining({ showName: false }));
  });

  it("records the one event for a link coming into being, and none for a list kept private", async () => {
    await POST(req("POST", body()));
    expect(h.track).not.toHaveBeenCalled();
    h.save.mockResolvedValue(saved({ madePublic: true, list: own({ isPublic: true }) }));
    await POST(req("POST", body({ isPublic: true })));
    expect(h.track).toHaveBeenCalledTimes(1);
    expect(h.track).toHaveBeenCalledWith("share_created", { userId: h.userId, props: { kind: "list" } });
  });

  it("needs a signed-in person", async () => {
    h.authed = false;
    expect((await POST(req("POST", body()))).status).toBe(401);
    expect((await GET(req("GET"))).status).toBe(401);
    expect(h.save).not.toHaveBeenCalled();
  });

  it("refuses words and places that do not meet the rules, and writes nothing", async () => {
    const bad = [
      body({ title: "" }),
      body({ title: "x".repeat(81) }),
      body({ title: "see www.example.com" }),
      body({ blurb: "x".repeat(161) }),
      body({ experienceIds: [EXP(1), EXP(2)] }),
      body({ experienceIds: [EXP(1), EXP(1), EXP(2)] }),
      body({ experienceIds: [EXP(1), EXP(2), "11111111-1111-4111-8111-111111111111"] }),
      body({ experienceIds: Array.from({ length: 11 }, (_, i) => EXP(i)) }),
      {},
      "not json",
      body({ isPublic: "yes" }),
    ];
    for (const b of bad) expect((await POST(req("POST", b))).status, JSON.stringify(b).slice(0, 60)).toBe(400);
    expect(h.save).not.toHaveBeenCalled();
  });

  it("passes on the refusals the store gives, with their status", async () => {
    h.save.mockRejectedValue(new ApiError(400, "A list can hold only places you have saved."));
    const res = await POST(req("POST", body()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("A list can hold only places you have saved.");
    h.save.mockRejectedValue(new ApiError(409, "You can keep up to 30 lists."));
    expect((await POST(req("POST", body()))).status).toBe(409);
  });

  it("limits how fast one person can make and change lists", async () => {
    let last = 0;
    for (let i = 0; i <= LIST_WRITE_LIMIT.max; i++) last = (await POST(req("POST", body()))).status;
    expect(last).toBe(429);
  });
});

describe("reading lists", () => {
  it("gives the person's own lists, each with a link only if public", async () => {
    h.list.mockResolvedValue([own(), own({ id: "22222222-2222-4333-8444-555555555555", token: "U".repeat(22), isPublic: true })]);
    const out = await (await GET(req("GET"))).json();
    expect(h.list).toHaveBeenCalledWith(h.userId);
    expect(out.lists.map((l: { url: string | null }) => l.url)).toEqual([null, `https://discoverzolo.com/l/${"U".repeat(22)}`]);
  });

  it("gives one list, and a plain 404 for one that is not the caller's", async () => {
    expect((await GET_ONE(req("GET"), ctx(ID))).status).toBe(200);
    expect(h.get).toHaveBeenCalledWith(h.userId, ID);
    h.get.mockResolvedValue(null);
    expect((await GET_ONE(req("GET"), ctx(ID))).status).toBe(404);
  });
});

describe("changing a list", () => {
  it("changes only the caller's own list, and expires the page cached under the old address and the new one", async () => {
    h.get.mockResolvedValue(own({ isPublic: false }));
    h.save.mockResolvedValue(saved({ created: false, list: own({ isPublic: true, token: NEW_TOKEN }), replacedToken: TOKEN, madePublic: true }));
    const res = await PATCH(req("PATCH", body({ isPublic: true })), ctx(ID));
    expect(res.status).toBe(200);
    expect(h.save).toHaveBeenCalledWith(h.userId, ID, expect.objectContaining({ isPublic: true }));
    const tags = h.revalidateTag.mock.calls.map((c) => c[0]);
    expect(tags).toEqual(expect.arrayContaining([`list:${TOKEN}`, `list:${NEW_TOKEN}`]));
    for (const call of h.revalidateTag.mock.calls) expect(call[1]).toEqual({ expire: 0 });
    expect(h.track).toHaveBeenCalledTimes(1);
  });

  it("expires the page when a list is made private again, so a link that was open stops opening at once", async () => {
    h.get.mockResolvedValue(own({ isPublic: true }));
    h.save.mockResolvedValue(saved({ created: false, list: own({ isPublic: false }) }));
    await PATCH(req("PATCH", body({ isPublic: false })), ctx(ID));
    expect(h.revalidateTag).toHaveBeenCalledWith(`list:${TOKEN}`, { expire: 0 });
    expect(h.track).not.toHaveBeenCalled();
  });

  it("is a 404 for a list that is not the caller's, and writes nothing", async () => {
    h.get.mockResolvedValue(null);
    expect((await PATCH(req("PATCH", body()), ctx(ID))).status).toBe(404);
    expect(h.save).not.toHaveBeenCalled();
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it("refuses bad words or places the same way as making one", async () => {
    expect((await PATCH(req("PATCH", body({ title: " " })), ctx(ID))).status).toBe(400);
    expect(h.save).not.toHaveBeenCalled();
  });
});

describe("deleting a list", () => {
  it("deletes the caller's own list and expires its page at once", async () => {
    const res = await DELETE(req("DELETE"), ctx(ID));
    expect(res.status).toBe(200);
    expect(h.remove).toHaveBeenCalledWith(h.userId, ID);
    expect(h.revalidateTag).toHaveBeenCalledWith(`list:${TOKEN}`, { expire: 0 });
  });

  it("is a 404 for a list that is not theirs or is already gone, and expires nothing", async () => {
    h.remove.mockResolvedValue(null);
    expect((await DELETE(req("DELETE"), ctx(ID))).status).toBe(404);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it("needs a signed-in person", async () => {
    h.authed = false;
    expect((await DELETE(req("DELETE"), ctx(ID))).status).toBe(401);
    expect(h.remove).not.toHaveBeenCalled();
  });
});
