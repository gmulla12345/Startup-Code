import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The "Local pick" badge. The owner marks a place by hand in the local_picks table; nothing here computes it. These
// tests keep it that way: it is read for the places a page shows, in one small read, only for places marked true,
// never stops a page if it cannot be read, and appears only where the owner said so.

const h = vi.hoisted(() => ({
  reads: [] as { table: string; columns: string; filters: [string, unknown][]; inIds: string[] }[],
  marked: new Set<string>(),
  error: null as { message: string } | null,
  throws: false,
  list: vi.fn(),
  getById: vi.fn(),
  publicList: null as unknown,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const read = { table, columns: "", filters: [] as [string, unknown][], inIds: [] as string[] };
      const builder: Record<string, unknown> = {
        select: (columns: string) => {
          read.columns = columns;
          return builder;
        },
        eq: (column: string, value: unknown) => {
          read.filters.push([column, value]);
          return builder;
        },
        in: (_column: string, ids: string[]) => {
          read.inIds = ids;
          h.reads.push(read);
          if (h.throws) throw new Error("the database is down");
          return Promise.resolve({ data: h.error ? null : ids.filter((id) => h.marked.has(id)).map((place_id) => ({ place_id })), error: h.error });
        },
      };
      return builder;
    },
  }),
}));
vi.mock("@/services/providers", () => ({ getExperienceProvider: async () => ({ list: h.list, getById: h.getById }) }));
vi.mock("@/lib/lists/store", () => ({ getPublicList: async () => h.publicList }));
vi.mock("@/lib/share/place-preview", () => ({ fetchPlacePreview: async (placeId: string) => ({ status: "ok", place: { name: placeId } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/analytics/track", () => ({ track: vi.fn() }));

import { getLocalPickIds, isMarked, markLocalPicks } from "@/lib/local-picks";
import { LOCAL_PICK_LABEL } from "@/lib/config/local-picks";
import { LocalPickBadge } from "@/components/experience/local-pick-badge";
import { ListSection } from "@/components/lists/list-section";
import { buildFirstList, restoreFirstList } from "@/lib/start/build";
import { loadListView } from "@/lib/lists/view";
import type { HomeList } from "@/lib/lists/build";
import type { Experience } from "@/types/database";

const PLACE = (n: number) => `ChIJlocalpick${String(n).padStart(6, "0")}`;
const exp = (n: number, over: Partial<Experience> = {}): Experience =>
  ({
    id: `g-${PLACE(n)}`,
    slug: `g-place-${n}`,
    title: `Place ${n}`,
    category: "food_drink",
    tags: [],
    images: [],
    city: "Testville",
    latitude: 39.29,
    longitude: -76.61,
    priceLevel: "low",
    priceEstimate: null,
    isHiddenGem: false,
    rating: null,
    reviewCount: 0,
    indoorOutdoor: "either",
    bestTimeOfDay: "any",
    ...over,
  }) as unknown as Experience;

beforeEach(() => {
  h.reads.length = 0;
  h.marked = new Set();
  h.error = null;
  h.throws = false;
  h.list.mockReset();
  h.getById.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("asking which places are local picks", () => {
  it("reads only the table the owner fills, only the rows marked true, for only the places asked about", async () => {
    h.marked = new Set([PLACE(2)]);
    const found = await getLocalPickIds([PLACE(1), PLACE(2), PLACE(3)]);
    expect([...found]).toEqual([PLACE(2)]);
    expect(h.reads).toHaveLength(1);
    expect(h.reads[0]).toMatchObject({ table: "local_picks", columns: "place_id", inIds: [PLACE(1), PLACE(2), PLACE(3)] });
    expect(h.reads[0].filters).toEqual([["local_pick", true]]);
  });

  it("asks about each place once, and never about an id that is not a place id", async () => {
    await getLocalPickIds([PLACE(1), PLACE(1), null, undefined, "short", "has spaces in it!", "ChIJ'; drop table local_picks;--", PLACE(2)]);
    expect(h.reads[0].inIds).toEqual([PLACE(1), PLACE(2)]);
  });

  it("makes no read at all when there is nothing valid to ask about", async () => {
    expect([...(await getLocalPickIds([]))]).toEqual([]);
    expect([...(await getLocalPickIds([null, "nope"]))]).toEqual([]);
    expect(h.reads).toHaveLength(0);
  });

  it("asks about at most 200 places at once", async () => {
    await getLocalPickIds(Array.from({ length: 500 }, (_, i) => PLACE(i)));
    expect(h.reads[0].inIds).toHaveLength(200);
  });

  it("never stops a page: if the table cannot be read, or does not exist yet, nothing is marked", async () => {
    h.marked = new Set([PLACE(1)]);
    h.error = { message: 'relation "public.local_picks" does not exist' };
    expect((await getLocalPickIds([PLACE(1)])).size).toBe(0);
    h.error = null;
    h.throws = true;
    expect((await getLocalPickIds([PLACE(1)])).size).toBe(0);
  });

  it("marks a Google place by its experience id, and never a curated experience", () => {
    const marked = new Set([PLACE(1)]);
    expect(isMarked(`g-${PLACE(1)}`, marked)).toBe(true);
    expect(isMarked(`g-${PLACE(2)}`, marked)).toBe(false);
    expect(isMarked(PLACE(1), marked)).toBe(false); // not a Google experience id
    expect(isMarked("11111111-1111-4111-8111-111111111111", marked)).toBe(false);
  });
});

describe("marking the places of a set of lists", () => {
  const list = (key: string, ns: number[]): HomeList => ({
    key,
    template: "for-you",
    title: key,
    blurb: "",
    places: ns.map((n) => ({ experience: exp(n), matchScore: 80, distanceMiles: 1, why: `why ${n}` })),
    shareIds: [],
  });

  it("sets the flag on exactly the marked places, with one read for every list on the page, and changes nothing else", async () => {
    h.marked = new Set([PLACE(2), PLACE(5)]);
    const lists = [list("a", [1, 2, 3]), list("b", [2, 4, 5])];
    const out = await markLocalPicks(lists);
    expect(h.reads).toHaveLength(1);
    expect(out[0].places.map((p) => p.localPick)).toEqual([false, true, false]);
    expect(out[1].places.map((p) => p.localPick)).toEqual([true, false, true]);
    expect(out[0].places.map((p) => p.why)).toEqual(["why 1", "why 2", "why 3"]);
    expect(out[0].title).toBe("a");
    expect(lists[0].places[1].localPick).toBeUndefined(); // the input was not changed
  });

  it("marks nothing when the owner has marked nothing", async () => {
    const out = await markLocalPicks([list("a", [1, 2, 3])]);
    expect(out[0].places.every((p) => !p.localPick)).toBe(true);
  });
});

describe("the badge", () => {
  it("says Local pick, in the product's quiet voice", () => {
    const html = renderToStaticMarkup(<LocalPickBadge />);
    expect(html).toContain(LOCAL_PICK_LABEL);
    expect(LOCAL_PICK_LABEL).toBe("Local pick");
    expect(html).not.toMatch(/!|\p{Extended_Pictographic}/u);
  });

  it("is on a place in a list only when the owner marked it", () => {
    const places = [1, 2, 3].map((n) => ({ experience: exp(n), matchScore: 80, distanceMiles: 1, why: null, localPick: n === 2 }));
    const html = renderToStaticMarkup(<ListSection list={{ key: "for-you", template: "for-you", title: "T", blurb: "B", places, shareIds: [] }} />);
    expect([...html.matchAll(/Local pick/g)]).toHaveLength(1);
    // and it sits with the second place, not the first or third
    const second = html.indexOf("Place 2");
    const badge = html.indexOf("Local pick");
    expect(badge).toBeGreaterThan(second);
    expect(badge).toBeLessThan(html.indexOf("Place 3"));
  });

  it("is on no place at all when none is marked", () => {
    const places = [1, 2, 3].map((n) => ({ experience: exp(n), matchScore: 80, distanceMiles: 1, why: null }));
    const html = renderToStaticMarkup(<ListSection list={{ key: "for-you", template: "for-you", title: "T", blurb: "B", places, shareIds: [] }} />);
    expect(html).not.toContain("Local pick");
  });
});

describe("a shared list's page", () => {
  const TOKEN = "T".repeat(22);

  it("marks the places the owner has marked, from one read, and leaves the rest as they were", async () => {
    h.marked = new Set([PLACE(2)]);
    h.publicList = { title: "Close by", blurb: null, placeIds: [PLACE(1), PLACE(2), PLACE(3)], whys: [null, "Warm, with room to sit", null], startsOn: null, endsOn: null, house: false };
    const view = await loadListView(TOKEN);
    expect(view!.items.map((i) => i.localPick)).toEqual([false, true, false]);
    expect(view!.items.map((i) => i.why)).toEqual([null, "Warm, with room to sit", null]);
    expect(h.reads).toHaveLength(1);
  });

  it("shows no badge, and still loads, when the table cannot be read", async () => {
    h.marked = new Set([PLACE(2)]);
    h.error = { message: "no such table" };
    h.publicList = { title: "Close by", blurb: null, placeIds: [PLACE(1), PLACE(2), PLACE(3)], whys: [null, null, null], startsOn: null, endsOn: null, house: false };
    const view = await loadListView("U".repeat(22));
    expect(view!.items).toHaveLength(3);
    expect(view!.items.every((i) => !i.localPick)).toBe(true);
  });
});

describe("the first list, for someone with no account", () => {
  const candidates = () => [1, 2, 3, 4, 5, 6, 7].map((n) => exp(n, { rating: 4.6, reviewCount: 120 }));

  it("marks the places the owner has marked, when it makes the list and when it restores it", async () => {
    h.marked = new Set([PLACE(3)]);
    h.list.mockResolvedValue(candidates());
    const made = await buildFirstList({ outing: "meal", budget: "low", latitude: 39.29, longitude: -76.61 });
    const flagged = made!.places.filter((p) => p.localPick).map((p) => p.id);
    expect(flagged).toEqual([`g-${PLACE(3)}`]);

    const all = candidates();
    h.getById.mockImplementation(async (id: string) => all.find((e) => e.id === id) ?? null);
    const restored = await restoreFirstList({ outing: "meal", budget: "low", ids: all.slice(0, 4).map((e) => e.id) });
    expect(restored!.places.filter((p) => p.localPick).map((p) => p.id)).toEqual([`g-${PLACE(3)}`]);
  });

  it("makes the list as before when nothing is marked or the table cannot be read", async () => {
    h.list.mockResolvedValue(candidates());
    h.error = { message: "no such table" };
    const made = await buildFirstList({ outing: "meal", budget: "low", latitude: 39.29, longitude: -76.61 });
    expect(made!.places.length).toBeGreaterThanOrEqual(3);
    expect(made!.places.every((p) => !p.localPick)).toBe(true);
  });
});

describe("it is wired to every place a list or a page draws", () => {
  const read = (file: string) => readFileSync(join(__dirname, "..", file), "utf-8");

  it("Home marks every list it draws, from one read", () => {
    expect(read("app/(app)/home/page.tsx")).toMatch(/await markLocalPicks\(\[\.\.\.houseLists, \.\.\.buildHomeLists/);
  });

  it("a shared list's page and the place page read it, and show the badge", () => {
    expect(read("lib/lists/view.ts")).toMatch(/getLocalPickIds\(list\.placeIds\)/);
    expect(read("app/l/[token]/page.tsx")).toMatch(/item\.localPick && [\s\S]*?<LocalPickBadge \/>/);
    const place = read("app/(app)/experience/[id]/page.tsx");
    expect(place).toMatch(/isMarked\(experience\.id, await getLocalPickIds\(\[placeIdFromExperienceId\(experience\.id\)\]\)\)/);
    expect(place).toMatch(/\{localPick && <LocalPickBadge \/>\}/);
  });

  it("the first list's page passes the flag to each row", () => {
    expect(read("components/start/start-flow.tsx")).toMatch(/localPick=\{p\.localPick\}/);
  });

  it("the table is never read from a browser: the lookup lives where only the server can reach it", () => {
    const lookup = read("lib/local-picks/index.ts");
    expect(lookup).toMatch(/createAdminClient/);
    for (const client of ["components/lists/list-place-row.tsx", "components/experience/local-pick-badge.tsx"]) {
      expect(read(client), client).not.toMatch(/@\/lib\/local-picks"|supabase/);
    }
  });
});
