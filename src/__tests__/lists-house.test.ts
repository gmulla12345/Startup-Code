import { beforeEach, describe, expect, it, vi } from "vitest";

// "This week's lists": lists we write ourselves, with an optional first and last day. What the script that
// writes one will accept, how Home finds the ones open today and builds them (our own line under a place,
// or the usual fact-based one), and how a list's public page behaves before, during and after its window.

const h = vi.hoisted(() => ({
  lists: [] as Record<string, unknown>[],
  places: [] as Record<string, unknown>[],
  filters: [] as string[],
  error: null as { message: string } | null,
  getById: vi.fn(),
  publicList: null as unknown,
  preview: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      const chain = () => q;
      q.select = chain;
      q.is = (col: string, v: unknown) => { h.filters.push(`is:${col}:${v}`); return q; };
      q.or = (expr: string) => { h.filters.push(`or:${expr}`); return q; };
      q.order = chain;
      q.limit = async () => ({ data: h.lists, error: h.error });
      q.in = () => ({ order: async () => ({ data: table === "list_places" ? h.places : [], error: h.error }) });
      return q;
    },
  }),
}));
vi.mock("@/services/providers", () => ({ getExperienceProvider: async () => ({ getById: h.getById }) }));
vi.mock("@/lib/lists/store", () => ({ getPublicList: async () => h.publicList }));
vi.mock("@/lib/share/place-preview", () => ({ fetchPlacePreview: h.preview }));

import { getActiveHouseLists, loadHouseHomeLists } from "@/lib/lists/house";
import { parsePlaceArg, planHouseList, voiceWarnings } from "@/lib/lists/house-plan";
import { loadListView } from "@/lib/lists/view";
import { HOUSE_LISTS_ON_HOME } from "@/lib/config/lists";
import type { Experience } from "@/types/database";

const ID = (c: string) => `ChIJ${c.repeat(12)}`;
const TOKEN = "T".repeat(22);

describe("what the script that writes a house list will accept", () => {
  const places = [{ placeId: ID("a"), why: "Warm, with room to sit" }, { placeId: ID("b") }, { placeId: ID("c"), why: "  Free   on weekdays " }];

  it("takes a title, a line of copy, three to ten places with a line under each, and two dates", () => {
    const plan = planHouseList({ title: " Wet  weather ", blurb: "Somewhere dry.", places, startsOn: "2026-10-26", endsOn: "2026-11-01" });
    expect(plan.list).toEqual({ title: "Wet weather", blurb: "Somewhere dry.", starts_on: "2026-10-26", ends_on: "2026-11-01" });
    expect(plan.places).toEqual([
      { position: 1, place_id: ID("a"), why: "Warm, with room to sit" },
      { position: 2, place_id: ID("b"), why: null },
      { position: 3, place_id: ID("c"), why: "Free on weekdays" },
    ]);
  });

  it("needs no dates and no copy: such a list is always open", () => {
    const plan = planHouseList({ title: "Always", places });
    expect(plan.list).toEqual({ title: "Always", blurb: null, starts_on: null, ends_on: null });
  });

  it("refuses what the database would refuse: a title or copy that is too long, or empty", () => {
    expect(() => planHouseList({ title: "", places })).toThrow(/title/);
    expect(() => planHouseList({ title: "x".repeat(81), places })).toThrow(/title/);
    expect(() => planHouseList({ title: "ok", blurb: "x".repeat(161), places })).toThrow(/copy/);
    expect(() => planHouseList({ title: "ok", places: [{ placeId: ID("a"), why: "x".repeat(141) }, places[1], places[2]] })).toThrow(/place 1/);
  });

  it("refuses fewer than three places, more than ten, a place twice, and an id that is not Google's", () => {
    expect(() => planHouseList({ title: "ok", places: places.slice(0, 2) })).toThrow(/3 to 10/);
    expect(() => planHouseList({ title: "ok", places: Array.from({ length: 11 }, (_, i) => ({ placeId: ID(String.fromCharCode(97 + i)) })) })).toThrow(/3 to 10/);
    expect(() => planHouseList({ title: "ok", places: [places[0], places[0], places[1]] })).toThrow(/twice/);
    expect(() => planHouseList({ title: "ok", places: [places[0], places[1], { placeId: "not a place id" }] })).toThrow(/not a Google place id/);
    expect(() => planHouseList({ title: "ok", places: [places[0], places[1], { placeId: "short" }] })).toThrow(/not a Google place id/);
  });

  it("refuses dates that are not real, and a last day before the first", () => {
    expect(() => planHouseList({ title: "ok", places, startsOn: "2026-02-30" })).toThrow(/not a date/);
    expect(() => planHouseList({ title: "ok", places, endsOn: "next week" })).toThrow(/not a date/);
    expect(() => planHouseList({ title: "ok", places, startsOn: "2026-11-02", endsOn: "2026-11-01" })).toThrow(/before the first/);
    expect(() => planHouseList({ title: "ok", places, startsOn: "2026-11-01", endsOn: "2026-11-01" })).not.toThrow();
  });

  it("reads --place as an id, and our line after the first equals sign (an id never contains one)", () => {
    expect(parsePlaceArg(`${ID("a")}=Warm, with room to sit`)).toEqual({ placeId: ID("a"), why: "Warm, with room to sit" });
    expect(parsePlaceArg(`${ID("a")}=a=b`)).toEqual({ placeId: ID("a"), why: "a=b" });
    expect(parsePlaceArg(ID("a"))).toEqual({ placeId: ID("a"), why: null });
    expect(parsePlaceArg(`${ID("a")}=  `)).toEqual({ placeId: ID("a"), why: null });
  });

  it("warns, without refusing, when the owner's words break the voice", () => {
    expect(voiceWarnings(["Calm and plain", "Also fine"])).toEqual([]);
    expect(voiceWarnings(["Come now!"])).toHaveLength(1);
    expect(voiceWarnings(["A day out 🎉"])).toHaveLength(1);
    expect(voiceWarnings([null, undefined])).toEqual([]);
  });
});

describe("finding the house lists open today", () => {
  beforeEach(() => {
    h.lists = [];
    h.places = [];
    h.filters.length = 0;
    h.error = null;
  });

  it("asks only for lists with no owner whose window includes today, with the day written into the filter", async () => {
    await getActiveHouseLists("2026-10-28");
    expect(h.filters).toEqual(["is:user_id:null", "or:starts_on.is.null,starts_on.lte.2026-10-28", "or:ends_on.is.null,ends_on.gte.2026-10-28"]);
  });

  it("refuses anything but a real date as 'today', since it is written into a filter", async () => {
    for (const bad of ["2026-10-28,user_id.neq.x", "'; drop table lists;--", "tomorrow", ""]) await expect(getActiveHouseLists(bad)).rejects.toThrow(/date/);
    expect(h.filters).toEqual([]);
  });

  it("returns each list with its places in order, and our own line under each", async () => {
    h.lists = [{ id: "l1", token: TOKEN, title: "Wet weather", blurb: "Somewhere dry.", starts_on: "2026-10-26", ends_on: "2026-11-01" }];
    h.places = [
      { list_id: "l1", position: 1, place_id: ID("a"), why: "Warm" },
      { list_id: "l1", position: 2, place_id: ID("b"), why: null },
    ];
    expect(await getActiveHouseLists("2026-10-28")).toEqual([
      { token: TOKEN, title: "Wet weather", blurb: "Somewhere dry.", startsOn: "2026-10-26", endsOn: "2026-11-01", places: [{ placeId: ID("a"), why: "Warm" }, { placeId: ID("b"), why: null }] },
    ]);
  });

  it("is empty when nothing is open today, without asking for places", async () => {
    expect(await getActiveHouseLists("2026-10-28")).toEqual([]);
  });

  it("fails loudly when the database cannot be read", async () => {
    h.error = { message: "boom" };
    await expect(getActiveHouseLists("2026-10-28")).rejects.toThrow(/could not read/);
  });

  it("shows at most the configured number on Home", () => {
    expect(HOUSE_LISTS_ON_HOME).toBeGreaterThanOrEqual(1);
  });
});

describe("a house list on Home", () => {
  const exp = (id: string, over: Partial<Experience> = {}) =>
    ({ id: `g-${id}`, slug: `g-${id}`, title: `Place ${id.slice(4, 6)}`, category: "food_drink", tags: ["food"], images: [], city: "Testville", latitude: 39.29, longitude: -76.61, priceLevel: "free", priceEstimate: null, isHiddenGem: false, rating: null, reviewCount: 0, bestTimeOfDay: "any", indoorOutdoor: "either", ...over }) as unknown as Experience;
  const profile = { userId: "u1", interests: ["food"], latitude: 39.29, longitude: -76.61 } as never;

  const open = (places: { placeId: string; why: string | null }[], over: Record<string, unknown> = {}) => {
    h.lists = [{ id: "l1", token: TOKEN, title: "Wet weather", blurb: "Somewhere dry.", starts_on: "2026-10-26", ends_on: "2026-11-01", ...over }];
    h.places = places.map((p, i) => ({ list_id: "l1", position: i + 1, place_id: p.placeId, why: p.why }));
  };

  beforeEach(() => {
    h.lists = [];
    h.places = [];
    h.filters.length = 0;
    h.error = null;
    h.getById.mockReset().mockImplementation(async (id: string) => exp(id.slice(2)));
  });

  it("is built from the places asked for live, with the quiet 'Through Sunday' line", async () => {
    open([{ placeId: ID("a"), why: "Warm" }, { placeId: ID("b"), why: "Dry" }, { placeId: ID("c"), why: null }]);
    const [list] = await loadHouseHomeLists(profile, "2026-10-28");
    expect(list).toMatchObject({ key: `house-${TOKEN}`, template: "house", title: "Wet weather", blurb: "Somewhere dry.", through: "Through Sunday", shareIds: [] });
    expect(list.places).toHaveLength(3);
    expect(h.getById).toHaveBeenCalledWith(`g-${ID("a")}`);
  });

  it("puts our own line under a place when we wrote one, and the usual fact-based line when we did not", async () => {
    open([{ placeId: ID("a"), why: "Warm, with room to sit" }, { placeId: ID("b"), why: null }, { placeId: ID("c"), why: null }]);
    const [list] = await loadHouseHomeLists(profile, "2026-10-28");
    expect(list.places[0].why).toBe("Warm, with room to sit");
    expect(list.places[1].why).toBe("Matches your taste for food, free");
  });

  it("has no end-date line when the list has no end", async () => {
    open([{ placeId: ID("a"), why: null }, { placeId: ID("b"), why: null }, { placeId: ID("c"), why: null }], { ends_on: null });
    const [list] = await loadHouseHomeLists(profile, "2026-10-28");
    expect(list.through).toBeNull();
  });

  it("leaves a list out when fewer than three of its places can be found now, rather than showing a thin one", async () => {
    open([{ placeId: ID("a"), why: null }, { placeId: ID("b"), why: null }, { placeId: ID("c"), why: null }]);
    h.getById.mockImplementation(async (id: string) => (id === `g-${ID("c")}` ? null : exp(id.slice(2))));
    expect(await loadHouseHomeLists(profile, "2026-10-28")).toEqual([]);
  });

  it("survives a place that errors, and never breaks Home when anything fails: it just shows without them", async () => {
    open([{ placeId: ID("a"), why: null }, { placeId: ID("b"), why: null }, { placeId: ID("c"), why: null }, { placeId: ID("d"), why: null }]);
    h.getById.mockImplementation(async (id: string) => {
      if (id === `g-${ID("d")}`) throw new Error("Google is down");
      return exp(id.slice(2));
    });
    expect((await loadHouseHomeLists(profile, "2026-10-28"))[0].places).toHaveLength(3);

    h.error = { message: "boom" };
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await loadHouseHomeLists(profile, "2026-10-28")).toEqual([]);
    log.mockRestore();
  });

  it("does not offer to share it: it is already a page of its own", async () => {
    open([{ placeId: ID("a"), why: null }, { placeId: ID("b"), why: null }, { placeId: ID("c"), why: null }]);
    expect((await loadHouseHomeLists(profile, "2026-10-28"))[0].shareIds).toEqual([]);
  });
});

describe("a list's public page, before, during and after its window", () => {
  const list = (over: Record<string, unknown> = {}) => ({ title: "Wet weather", blurb: "Somewhere dry.", placeIds: [ID("a"), ID("b"), ID("c")], whys: ["Warm", null, "Dry"], startsOn: null, endsOn: null, house: true, ...over });
  const ok = { status: "ok", place: { name: "A Place", address: null, category: null, photoRef: null, photoCredit: null } };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T16:00:00Z")); // noon on the 28th in New York
    h.preview.mockReset().mockResolvedValue(ok);
  });

  it("is shown inside its window, with its end date and our own lines carried to the page", async () => {
    h.publicList = list({ startsOn: "2026-10-26", endsOn: "2026-11-01" });
    const view = await loadListView(TOKEN);
    vi.useRealTimers();
    expect(view).toMatchObject({ ended: false, through: "Through Sunday", title: "Wet weather" });
    expect(view!.items.map((i) => i.why)).toEqual(["Warm", null, "Dry"]);
    expect(h.preview).toHaveBeenCalledTimes(3);
  });

  it("is simply not found before it opens, as if it did not exist, and Google is not asked about it", async () => {
    h.publicList = list({ startsOn: "2026-10-29", endsOn: "2026-11-01" });
    const view = await loadListView(`${TOKEN.slice(0, 21)}U`);
    vi.useRealTimers();
    expect(view).toBeNull();
    expect(h.preview).not.toHaveBeenCalled();
  });

  it("says only that it has ended once its last day has passed, and Google is not asked about its places", async () => {
    h.publicList = list({ startsOn: "2026-10-20", endsOn: "2026-10-27" });
    const view = await loadListView(`${TOKEN.slice(0, 21)}V`);
    vi.useRealTimers();
    expect(view).toMatchObject({ ended: true, items: [], through: null, title: "Wet weather" });
    expect(h.preview).not.toHaveBeenCalled();
  });

  it("is still open on its last day, all through it", async () => {
    h.publicList = list({ startsOn: "2026-10-20", endsOn: "2026-10-28" });
    vi.setSystemTime(new Date("2026-10-29T03:59:00Z")); // 23:59 on the 28th in New York
    const view = await loadListView(`${TOKEN.slice(0, 21)}W`);
    vi.useRealTimers();
    expect(view).toMatchObject({ ended: false, through: "Through today" });
  });

  it("is always open for a list with no dates, and has no end-date line", async () => {
    h.publicList = list();
    const view = await loadListView(`${TOKEN.slice(0, 21)}X`);
    vi.useRealTimers();
    expect(view).toMatchObject({ ended: false, through: null });
  });
});
