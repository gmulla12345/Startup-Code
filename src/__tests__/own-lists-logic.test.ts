import { beforeEach, describe, expect, it, vi } from "vitest";

// Lists a person makes themselves: what they may type, what is sent to the database, how its answers are read, and that a
// list is always the caller's own. The database function itself (the three-to-ten rule, the limit, who may change what, the
// new address on going public) was rehearsed against the real database; here its answers and failures are read.

interface Query {
  table: string;
  op: "select" | "delete";
  columns?: string;
  filters: Record<string, unknown>;
}
const h = vi.hoisted(() => ({
  queries: [] as unknown[],
  db: {} as Record<string, (q: Query) => { data: unknown; error: { message: string; code?: string } | null }>,
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: h.rpc,
    from: (table: string) => {
      const q: Query = { table, op: "select", filters: {} };
      const run = () => {
        h.queries.push({ ...q, filters: { ...q.filters } });
        return Promise.resolve((h.db[table] ?? (() => ({ data: null, error: null })))(q));
      };
      const b: Record<string, unknown> = {
        select: (columns: string) => {
          q.columns = columns;
          return b;
        },
        delete: () => {
          q.op = "delete";
          return b;
        },
        eq: (column: string, value: unknown) => {
          q.filters[column] = value;
          return b;
        },
        is: (column: string, value: unknown) => {
          q.filters[column] = value;
          return b;
        },
        in: (column: string, value: unknown) => {
          q.filters[column] = value;
          return b;
        },
        order: () => b,
        maybeSingle: run,
        then: (resolve: (r: unknown) => unknown, reject: (e: unknown) => unknown) => run().then(resolve, reject),
      };
      return b;
    },
  }),
}));

import { ApiError } from "@/lib/api/auth";
import { cleanBlurb, cleanOwnList, cleanOwnPlaceIds, cleanTitle } from "@/lib/lists/own-input";
import { assertPlacesSaved, deleteOwnList, getOwnList, listOwnLists, presentOwnList, saveOwnList } from "@/lib/lists/own";
import { MAX_OWN_LISTS, OWN_LIST_BLURB_MAX, OWN_LIST_TITLE_MAX } from "@/lib/config/lists";

const PLACE = (n: number) => `ChIJownlist${String(n).padStart(8, "0")}`;
const EXP = (n: number) => `g-${PLACE(n)}`;
const ID = "11111111-2222-4333-8444-555555555555";
const TOKEN = "T".repeat(22);

const listRow = (over: Record<string, unknown> = {}) => ({ id: ID, token: TOKEN, title: "Late-night study spots", blurb: null, is_public: false, show_name: false, updated_at: "2026-10-20T00:00:00Z", ...over });
const input = (over: Record<string, unknown> = {}) => ({ title: "Late-night study spots", blurb: null, placeIds: [PLACE(1), PLACE(2), PLACE(3)], isPublic: false, showName: false, ...over });

beforeEach(() => {
  h.queries.length = 0;
  h.db = {};
  h.rpc.mockReset();
});

describe("what a person may type", () => {
  it("needs a title: one tidy line of at most 80 characters, with no links", () => {
    expect(cleanTitle("  Late-night   study\nspots ")).toEqual({ ok: true, value: "Late-night study spots" });
    for (const bad of [undefined, null, 42, "", "   ", "\n\t"]) expect(cleanTitle(bad).ok, String(bad)).toBe(false);
    expect(cleanTitle("x".repeat(OWN_LIST_TITLE_MAX)).ok).toBe(true);
    expect(cleanTitle("x".repeat(OWN_LIST_TITLE_MAX + 1)).ok).toBe(false);
    for (const link of ["see https://example.com", "www.example.org rocks", "best on example.com", "go to shop.io"]) expect(cleanTitle(link).ok, link).toBe(false);
  });

  it("strips control and direction characters, so what is stored reads as it looks", () => {
    expect(cleanTitle("Study‮spots\u0007 now")).toEqual({ ok: true, value: "Study spots now" });
    expect(cleanTitle("Zero​width")).toEqual({ ok: true, value: "Zero width" });
  });

  it("may have a line under it, which is optional, at most 160 characters, with no links", () => {
    expect(cleanBlurb(undefined)).toEqual({ ok: true, value: null });
    expect(cleanBlurb(null)).toEqual({ ok: true, value: null });
    expect(cleanBlurb("   ")).toEqual({ ok: true, value: null });
    expect(cleanBlurb(" Quiet  tables ")).toEqual({ ok: true, value: "Quiet tables" });
    expect(cleanBlurb("x".repeat(OWN_LIST_BLURB_MAX + 1)).ok).toBe(false);
    expect(cleanBlurb("read more at www.example.com").ok).toBe(false);
    expect(cleanBlurb(7).ok).toBe(false);
  });

  it("holds three to ten Google places, each once, and nothing else", () => {
    expect(cleanOwnPlaceIds([EXP(1), EXP(2), EXP(3)])).toEqual({ ok: true, value: [PLACE(1), PLACE(2), PLACE(3)] });
    expect(cleanOwnPlaceIds(Array.from({ length: 10 }, (_, i) => EXP(i))).ok).toBe(true);
    expect(cleanOwnPlaceIds([EXP(1), EXP(2)]).ok).toBe(false);
    expect(cleanOwnPlaceIds(Array.from({ length: 11 }, (_, i) => EXP(i))).ok).toBe(false);
    expect(cleanOwnPlaceIds([EXP(1), EXP(1), EXP(2)]).ok).toBe(false);
    expect(cleanOwnPlaceIds([EXP(1), EXP(2), "11111111-1111-4111-8111-111111111111"]).ok).toBe(false); // a curated experience has no place id
    expect(cleanOwnPlaceIds([EXP(1), EXP(2), "g-short"]).ok).toBe(false);
    expect(cleanOwnPlaceIds([EXP(1), EXP(2), PLACE(3)]).ok).toBe(false); // not an experience id
    expect(cleanOwnPlaceIds("nope").ok).toBe(false);
  });

  it("is private unless the person said otherwise, and shows a name only on a public list", () => {
    const body = { title: "T", experienceIds: [EXP(1), EXP(2), EXP(3)] };
    expect(cleanOwnList(body)).toMatchObject({ ok: true, value: { isPublic: false, showName: false } });
    expect(cleanOwnList({ ...body, showName: true })).toMatchObject({ ok: true, value: { isPublic: false, showName: false } });
    expect(cleanOwnList({ ...body, isPublic: "true" })).toMatchObject({ ok: true, value: { isPublic: false } }); // only the boolean true
    expect(cleanOwnList({ ...body, isPublic: true })).toMatchObject({ ok: true, value: { isPublic: true, showName: false } }); // a name is a separate choice
    expect(cleanOwnList({ ...body, isPublic: true, showName: true })).toMatchObject({ ok: true, value: { isPublic: true, showName: true } });
  });

  it("refuses the first thing wrong, in plain words and without an exclamation point", () => {
    const bad = [cleanTitle(""), cleanBlurb("x".repeat(500)), cleanOwnPlaceIds([]), cleanOwnList({ title: "", experienceIds: [] })];
    for (const r of bad) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).not.toMatch(/!/);
    }
  });
});

describe("a list may hold only places the person has saved", () => {
  it("asks about the person's own saves, for exactly these places, and refuses one that is not saved", async () => {
    h.db.saved_experiences = () => ({ data: [{ experience_id: EXP(1) }, { experience_id: EXP(2) }], error: null });
    await expect(assertPlacesSaved("u1", [PLACE(1), PLACE(2), PLACE(3)])).rejects.toMatchObject({ status: 400 });
    const q = h.queries[0] as Query;
    expect(q.filters).toEqual({ user_id: "u1", experience_id: [EXP(1), EXP(2), EXP(3)] });

    h.db.saved_experiences = () => ({ data: [{ experience_id: EXP(1) }, { experience_id: EXP(2) }, { experience_id: EXP(3) }], error: null });
    await expect(assertPlacesSaved("u1", [PLACE(1), PLACE(2), PLACE(3)])).resolves.toBeUndefined();
  });
});

describe("making and changing a list", () => {
  const saved = () => (h.db.saved_experiences = () => ({ data: [EXP(1), EXP(2), EXP(3)].map((experience_id) => ({ experience_id })), error: null }));

  it("sends the person, the id (none for a new list), a fresh address, the words, the places, the choices and the limit", async () => {
    saved();
    h.rpc.mockResolvedValue({ data: [{ out_id: ID, out_token: TOKEN, out_old_token: null, out_created: true }], error: null });
    h.db.lists = () => ({ data: listRow({ is_public: true }), error: null });
    h.db.list_places = () => ({ data: [PLACE(1), PLACE(2), PLACE(3)].map((place_id, i) => ({ place_id, position: i + 1 })), error: null });

    const out = await saveOwnList("u1", null, input({ isPublic: true, showName: true }));
    expect(out).toMatchObject({ created: true, replacedToken: null, madePublic: true });
    expect(out.list.placeIds).toEqual([PLACE(1), PLACE(2), PLACE(3)]);

    const [name, args] = h.rpc.mock.calls[0];
    expect(name).toBe("save_user_list");
    expect(args).toMatchObject({ p_user: "u1", p_id: null, p_title: "Late-night study spots", p_blurb: null, p_place_ids: [PLACE(1), PLACE(2), PLACE(3)], p_public: true, p_show_name: true, p_max_lists: MAX_OWN_LISTS });
    expect(args.p_token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("is refused before anything is written when a place is not one of the person's saves", async () => {
    h.db.saved_experiences = () => ({ data: [{ experience_id: EXP(1) }], error: null });
    await expect(saveOwnList("u1", null, input())).rejects.toMatchObject({ status: 400 });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("changes only the person's own list: another person's id is a 404 and nothing is written", async () => {
    saved();
    h.db.lists = () => ({ data: null, error: null }); // not found for this person
    await expect(saveOwnList("u1", ID, input())).rejects.toMatchObject({ status: 404 });
    expect(h.rpc).not.toHaveBeenCalled();
    const q = h.queries.find((x) => (x as Query).table === "lists") as Query;
    expect(q.filters).toMatchObject({ id: ID, user_id: "u1", template: null });
  });

  it("says a list is newly public, and what address it left behind, when a private list is made public", async () => {
    saved();
    const NEW = "N".repeat(22);
    let calls = 0;
    h.db.lists = () => ({ data: listRow({ is_public: calls++ === 0 ? false : true, token: calls === 1 ? TOKEN : NEW }), error: null });
    h.db.list_places = () => ({ data: [PLACE(1), PLACE(2), PLACE(3)].map((place_id, i) => ({ place_id, position: i + 1 })), error: null });
    h.rpc.mockResolvedValue({ data: [{ out_id: ID, out_token: NEW, out_old_token: TOKEN, out_created: false }], error: null });
    const out = await saveOwnList("u1", ID, input({ isPublic: true }));
    expect(out).toMatchObject({ created: false, replacedToken: TOKEN, madePublic: true });
  });

  it("does not call a list newly public when it was public already, or is being kept private", async () => {
    saved();
    h.db.lists = () => ({ data: listRow({ is_public: true }), error: null });
    h.db.list_places = () => ({ data: [PLACE(1), PLACE(2), PLACE(3)].map((place_id, i) => ({ place_id, position: i + 1 })), error: null });
    h.rpc.mockResolvedValue({ data: [{ out_id: ID, out_token: TOKEN, out_old_token: TOKEN, out_created: false }], error: null });
    expect(await saveOwnList("u1", ID, input({ isPublic: true }))).toMatchObject({ madePublic: false, replacedToken: null });
    expect(await saveOwnList("u1", ID, input({ isPublic: false }))).toMatchObject({ madePublic: false });
  });

  it("reads the database function's refusals in plain words", async () => {
    saved();
    h.db.lists = () => ({ data: listRow(), error: null });
    h.rpc.mockResolvedValueOnce({ data: null, error: { message: "list_limit", code: "P0001" } });
    await expect(saveOwnList("u1", null, input())).rejects.toMatchObject({ status: 409, message: expect.stringContaining(String(MAX_OWN_LISTS)) });
    h.rpc.mockResolvedValueOnce({ data: null, error: { message: "list_not_found", code: "P0002" } });
    await expect(saveOwnList("u1", null, input())).rejects.toMatchObject({ status: 404 });
    h.rpc.mockResolvedValueOnce({ data: null, error: { message: "a list holds three to ten places", code: "22023" } });
    await expect(saveOwnList("u1", null, input())).rejects.toMatchObject({ status: 400 });
    h.rpc.mockResolvedValueOnce({ data: null, error: { message: "disk full", code: "XX000" } });
    await expect(saveOwnList("u1", null, input())).rejects.not.toBeInstanceOf(ApiError);
  });

  it("tries again with a new address if the first one was already taken, and gives up after three", async () => {
    saved();
    h.db.lists = () => ({ data: listRow(), error: null });
    h.db.list_places = () => ({ data: [PLACE(1), PLACE(2), PLACE(3)].map((place_id, i) => ({ place_id, position: i + 1 })), error: null });
    h.rpc.mockResolvedValueOnce({ data: null, error: { message: "duplicate", code: "23505" } }).mockResolvedValueOnce({ data: [{ out_id: ID, out_token: TOKEN, out_old_token: null, out_created: true }], error: null });
    await expect(saveOwnList("u1", null, input())).resolves.toMatchObject({ created: true });
    expect(h.rpc.mock.calls[0][1].p_token).not.toBe(h.rpc.mock.calls[1][1].p_token);

    h.rpc.mockReset().mockResolvedValue({ data: null, error: { message: "duplicate", code: "23505" } });
    await expect(saveOwnList("u1", null, input())).rejects.toThrow(/unique link/);
    expect(h.rpc).toHaveBeenCalledTimes(3);
  });
});

describe("reading and deleting a person's own lists", () => {
  it("lists only the caller's own (template null), newest change first, with their places in order", async () => {
    h.db.lists = () => ({ data: [listRow(), listRow({ id: "22222222-2222-4333-8444-555555555555", token: "U".repeat(22), is_public: true })], error: null });
    h.db.list_places = () => ({
      data: [
        { list_id: ID, place_id: PLACE(1), position: 1 },
        { list_id: ID, place_id: PLACE(2), position: 2 },
        { list_id: "22222222-2222-4333-8444-555555555555", place_id: PLACE(3), position: 1 },
      ],
      error: null,
    });
    const lists = await listOwnLists("u1");
    expect(lists.map((l) => l.placeIds)).toEqual([[PLACE(1), PLACE(2)], [PLACE(3)]]);
    expect(lists.map((l) => l.isPublic)).toEqual([false, true]);
    expect((h.queries[0] as Query).filters).toEqual({ user_id: "u1", template: null });
  });

  it("finds none for an id that is not a list id, without asking the database", async () => {
    expect(await getOwnList("u1", "not-an-id")).toBeNull();
    expect(await getOwnList("u1", "'; drop table lists; --")).toBeNull();
    expect(await deleteOwnList("u1", "not-an-id")).toBeNull();
    expect(h.queries).toHaveLength(0);
  });

  it("deletes only the caller's own list, and says what address it had so its page can be dropped", async () => {
    h.db.lists = () => ({ data: [{ token: TOKEN }], error: null });
    expect(await deleteOwnList("u1", ID)).toBe(TOKEN);
    expect((h.queries[0] as Query).filters).toEqual({ id: ID, user_id: "u1", template: null });
    h.db.lists = () => ({ data: [], error: null });
    expect(await deleteOwnList("u1", ID)).toBeNull(); // not theirs, or already gone
  });
});

describe("what the API says about a list", () => {
  const own = (over = {}) => ({ id: ID, token: TOKEN, title: "T", blurb: null, isPublic: false, showName: false, placeIds: [PLACE(1)], updatedAt: "x", ...over });

  it("gives a link only while the list is public, and never the bare token", () => {
    expect(presentOwnList(own(), "https://discoverzolo.com").url).toBeNull();
    expect(presentOwnList(own({ isPublic: true }), "https://discoverzolo.com").url).toBe(`https://discoverzolo.com/l/${TOKEN}`);
    expect(JSON.stringify(presentOwnList(own(), "https://x"))).not.toContain(TOKEN);
  });

  it("names the places by experience id, as the saves do", () => {
    expect(presentOwnList(own(), "https://x").experienceIds).toEqual([EXP(1)]);
  });
});
