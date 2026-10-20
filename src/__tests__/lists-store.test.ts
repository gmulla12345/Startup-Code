import { beforeEach, describe, expect, it, vi } from "vitest";

// The server side of a shared list: what is sent to the database function, how its
// answers and failures are read, and that a bad token never reaches the database.

const h = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: h.rpc, from: h.from }) }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => () => fn() }));

import { deleteSharedList, findSharedList, getPublicList, saveSharedList } from "@/lib/lists/store";
import { MAX_SHARED_LISTS } from "@/lib/config/lists";
import { getListTemplate } from "@/lib/lists/templates";

const template = getListTemplate("close-by")!;
const IDS = ["ChIJ-aaaaaaaa", "ChIJ-bbbbbbbb", "ChIJ-cccccccc"];
const TOKEN = "T".repeat(22);

/** A stand-in for a query: every step returns itself, and it resolves to `result`. */
const chain = (result: unknown) => {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "delete"]) c[m] = vi.fn(() => c);
  c.maybeSingle = vi.fn(async () => result);
  (c as { then: unknown }).then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return c;
};

beforeEach(() => {
  h.rpc.mockReset();
  h.from.mockReset();
});

describe("saveSharedList", () => {
  it("sends the person, the template's own words, the place ids and the limit, and reads the link back", async () => {
    h.rpc.mockResolvedValue({ data: [{ out_token: TOKEN, out_created: true }], error: null });
    const out = await saveSharedList({ userId: "u1", template, placeIds: IDS });
    expect(out).toEqual({ token: TOKEN, created: true });

    const [name, args] = h.rpc.mock.calls[0];
    expect(name).toBe("save_shared_list");
    expect(args).toMatchObject({
      p_user: "u1",
      p_template: "close-by",
      p_title: template.title,
      p_blurb: template.blurb,
      p_place_ids: IDS,
      p_max_lists: MAX_SHARED_LISTS,
    });
    expect(args.p_token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("reports an update of an existing list as not created", async () => {
    h.rpc.mockResolvedValue({ data: [{ out_token: TOKEN, out_created: false }], error: null });
    expect((await saveSharedList({ userId: "u1", template, placeIds: IDS })).created).toBe(false);
  });

  it("turns the database's limit into a plain 409 for the person", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "list_limit", code: "P0001" } });
    await expect(saveSharedList({ userId: "u1", template, placeIds: IDS })).rejects.toMatchObject({ status: 409 });
  });

  it("asks again after a collision, with a new token, and succeeds", async () => {
    h.rpc
      .mockResolvedValueOnce({ data: null, error: { message: "duplicate key", code: "23505" } })
      .mockResolvedValueOnce({ data: [{ out_token: TOKEN, out_created: false }], error: null });
    expect(await saveSharedList({ userId: "u1", template, placeIds: IDS })).toEqual({ token: TOKEN, created: false });
    expect(h.rpc).toHaveBeenCalledTimes(2);
    expect(h.rpc.mock.calls[0][1].p_token).not.toBe(h.rpc.mock.calls[1][1].p_token);
  });

  it("gives up after three collisions, and fails loudly on any other error", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "duplicate key", code: "23505" } });
    await expect(saveSharedList({ userId: "u1", template, placeIds: IDS })).rejects.toThrow(/unique link/);
    expect(h.rpc).toHaveBeenCalledTimes(3);

    h.rpc.mockReset().mockResolvedValue({ data: null, error: { message: "boom", code: "XX000" } });
    await expect(saveSharedList({ userId: "u1", template, placeIds: IDS })).rejects.toThrow(/could not save the list: boom/);
    expect(h.rpc).toHaveBeenCalledTimes(1);
  });
});

describe("turning a list off and looking one up", () => {
  it("deletes only the person's own list, and says whether anything was deleted", async () => {
    const c = chain({ data: [{ token: TOKEN }], error: null });
    h.from.mockReturnValue(c);
    expect(await deleteSharedList("u1", TOKEN)).toBe(true);
    expect(c.eq).toHaveBeenCalledWith("token", TOKEN);
    expect(c.eq).toHaveBeenCalledWith("user_id", "u1");

    h.from.mockReturnValue(chain({ data: [], error: null }));
    expect(await deleteSharedList("u2", TOKEN)).toBe(false);
  });

  it("finds the link a person already has for a kind of list", async () => {
    h.from.mockReturnValue(chain({ data: { token: TOKEN }, error: null }));
    expect(await findSharedList("u1", "close-by")).toEqual({ token: TOKEN });
    h.from.mockReturnValue(chain({ data: null, error: null }));
    expect(await findSharedList("u1", "close-by")).toBeNull();
  });
});

describe("getPublicList", () => {
  it("never touches the database for something that is not a token", async () => {
    for (const bad of ["", "short", "has spaces in it, so no!!", "x".repeat(23)]) expect(await getPublicList(bad)).toBeNull();
    expect(h.from).not.toHaveBeenCalled();
  });

  it("is null for a list that does not exist, and reads title, copy and places in order for one that does", async () => {
    h.from.mockReturnValueOnce(chain({ data: null, error: null }));
    expect(await getPublicList(TOKEN)).toBeNull();

    h.from
      .mockReturnValueOnce(chain({ data: { id: "l1", title: "Close by", blurb: "Nearest first.", starts_on: null, ends_on: null, user_id: "u1" }, error: null }))
      .mockReturnValueOnce({
        select: () => ({ eq: () => ({ order: async () => ({ data: [{ place_id: "ChIJ-aaaaaaaa", position: 1, why: null }, { place_id: "ChIJ-bbbbbbbb", position: 2, why: null }], error: null }) }) }),
      });
    expect(await getPublicList(TOKEN)).toEqual({ title: "Close by", blurb: "Nearest first.", placeIds: ["ChIJ-aaaaaaaa", "ChIJ-bbbbbbbb"], whys: [null, null], startsOn: null, endsOn: null, house: false });
  });
});
