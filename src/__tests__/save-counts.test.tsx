import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// "Saved by N students nearby this week". The rule behind all of it: the number is real or it is absent. It is shown only when
// the owner has set a minimum (off until then), only when the real count reaches it (never below three), only for a person
// with a location, and a failure anywhere means no number, never a made-up one.

const h = vi.hoisted(() => ({
  config: undefined as unknown,
  configError: null as { message: string } | null,
  configReads: 0,
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === "app_config") h.configReads++;
            return { data: h.config === undefined ? null : { value: h.config }, error: h.configError };
          },
        }),
      }),
    }),
    rpc: h.rpc,
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/analytics/track", () => ({ track: vi.fn() }));

import { getSaveCountMinimum, getSaveCounts, markSaveCounts, parseMinimum } from "@/lib/social-proof/save-counts";
import { SAVE_COUNT_FLOOR, SAVE_COUNT_RADIUS_MILES, SAVE_COUNT_WINDOW_DAYS, saveCountLine } from "@/lib/config/save-counts";
import { ListSection } from "@/components/lists/list-section";
import type { HomeList } from "@/lib/lists/build";
import type { Experience } from "@/types/database";

const P = (n: number) => `g-ChIJsavecount${String(n).padStart(6, "0")}`;
const viewer = { userId: "u-viewer", latitude: 39.29, longitude: -76.61 };
const NOW = new Date("2026-10-20T12:00:00.000Z");

beforeEach(() => {
  h.config = undefined;
  h.configError = null;
  h.configReads = 0;
  h.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the owner's minimum", () => {
  it("is a whole number the owner typed, as a number or as digits, and never below the floor of three", () => {
    expect(parseMinimum(5)).toBe(5);
    expect(parseMinimum("12")).toBe(12);
    expect(parseMinimum(" 7 ")).toBe(7);
    expect(parseMinimum(3)).toBe(3);
    expect(parseMinimum(2)).toBe(SAVE_COUNT_FLOOR);
    expect(parseMinimum(1)).toBe(SAVE_COUNT_FLOOR);
    expect(SAVE_COUNT_FLOOR).toBe(3);
  });

  it("turns the counts off when it is absent or is not a whole number", () => {
    for (const bad of [undefined, null, 0, -4, 2.5, "five", "", "3.5", "1e3", true, {}, [], Number.NaN, 2_000_000]) expect(parseMinimum(bad), String(bad)).toBeNull();
  });

  it("is read from app_config, and is null (off) when there is none or it cannot be read", async () => {
    expect(await getSaveCountMinimum()).toBeNull();
    h.config = "8";
    expect(await getSaveCountMinimum()).toBe(8);
    h.config = 2;
    expect(await getSaveCountMinimum()).toBe(3);
    h.configError = { message: "no such table" };
    expect(await getSaveCountMinimum()).toBeNull();
  });
});

describe("asking for the counts", () => {
  it("asks the database for nothing while the owner has set no minimum: there is no number to show", async () => {
    const out = await getSaveCounts([P(1), P(2)], viewer, NOW);
    expect(out.size).toBe(0);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("asks nothing for a visitor, or for a person with no location: the count is 'nearby' them", async () => {
    h.config = 5;
    expect((await getSaveCounts([P(1)], null, NOW)).size).toBe(0);
    expect((await getSaveCounts([P(1)], { userId: "u", latitude: null, longitude: -76 }, NOW)).size).toBe(0);
    expect((await getSaveCounts([P(1)], { userId: "u", latitude: 39, longitude: null }, NOW)).size).toBe(0);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.configReads).toBe(0);
  });

  it("sends the viewer's own location and id, the radius, the week, the minimum and only Google place ids, each once", async () => {
    h.config = "5";
    await getSaveCounts([P(1), P(1), P(2), "11111111-1111-4111-8111-111111111111", "g-short", null, undefined], viewer, NOW);
    expect(h.rpc).toHaveBeenCalledTimes(1);
    const [name, args] = h.rpc.mock.calls[0];
    expect(name).toBe("place_save_counts");
    expect(args).toEqual({
      p_experience_ids: [P(1), P(2)],
      p_lat: 39.29,
      p_lng: -76.61,
      p_radius_miles: SAVE_COUNT_RADIUS_MILES,
      p_since: new Date(NOW.getTime() - SAVE_COUNT_WINDOW_DAYS * 86_400_000).toISOString(),
      p_viewer: "u-viewer",
      p_min: 5,
    });
    expect(SAVE_COUNT_WINDOW_DAYS).toBe(7);
  });

  it("asks about at most 200 places at once", async () => {
    h.config = 5;
    await getSaveCounts(Array.from({ length: 500 }, (_, i) => P(i)), viewer, NOW);
    expect(h.rpc.mock.calls[0][1].p_experience_ids).toHaveLength(200);
  });

  it("returns the counts the database gives, and drops any below the minimum even if one comes back (defence in depth)", async () => {
    h.config = 5;
    h.rpc.mockResolvedValue({ data: [{ out_experience_id: P(1), out_savers: 14 }, { out_experience_id: P(2), out_savers: 5 }, { out_experience_id: P(3), out_savers: 4 }], error: null });
    const out = await getSaveCounts([P(1), P(2), P(3)], viewer, NOW);
    expect([...out.entries()]).toEqual([[P(1), 14], [P(2), 5]]);
  });

  it("never gives a number below three, even if the owner typed a smaller minimum", async () => {
    h.config = 1;
    h.rpc.mockResolvedValue({ data: [{ out_experience_id: P(1), out_savers: 2 }, { out_experience_id: P(2), out_savers: 3 }], error: null });
    expect(h.rpc.mock.calls.length).toBe(0);
    const out = await getSaveCounts([P(1), P(2)], viewer, NOW);
    expect(h.rpc.mock.calls[0][1].p_min).toBe(3);
    expect([...out.keys()]).toEqual([P(2)]);
  });

  it("never stops a page: any failure means no numbers", async () => {
    h.config = 5;
    h.rpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } });
    expect((await getSaveCounts([P(1)], viewer, NOW)).size).toBe(0);
    h.rpc.mockRejectedValue(new Error("the database is down"));
    expect((await getSaveCounts([P(1)], viewer, NOW)).size).toBe(0);
    h.configError = { message: "boom" };
    expect((await getSaveCounts([P(1)], viewer, NOW)).size).toBe(0);
  });
});

describe("marking the places of a set of lists", () => {
  const exp = (n: number) => ({ id: P(n) }) as Experience;
  const list = (key: string, ns: number[]): HomeList => ({
    key,
    template: "for-you",
    title: key,
    blurb: "",
    places: ns.map((n) => ({ experience: exp(n), matchScore: 80, distanceMiles: 1, why: `why ${n}` })),
    shareIds: [],
  });

  it("sets savedBy on exactly the places counted, from one read, and changes nothing else", async () => {
    h.config = 5;
    h.rpc.mockResolvedValue({ data: [{ out_experience_id: P(2), out_savers: 9 }], error: null });
    const lists = [list("a", [1, 2, 3]), list("b", [2, 4])];
    const out = await markSaveCounts(lists, viewer);
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(out[0].places.map((p) => p.savedBy)).toEqual([undefined, 9, undefined]);
    expect(out[1].places.map((p) => p.savedBy)).toEqual([9, undefined]);
    expect(out[0].places.map((p) => p.why)).toEqual(["why 1", "why 2", "why 3"]);
    expect(lists[0].places[1].savedBy).toBeUndefined(); // the input was not changed
  });

  it("marks nothing while counts are off", async () => {
    const out = await markSaveCounts([list("a", [1, 2, 3])], viewer);
    expect(out[0].places.every((p) => p.savedBy === undefined)).toBe(true);
  });
});

describe("what is said", () => {
  it("is the number and the plain facts: students, nearby, this week; no exclamation point, no urgency", () => {
    expect(saveCountLine(14)).toBe("Saved by 14 students nearby this week");
    expect(saveCountLine(14)).not.toMatch(/!|\p{Extended_Pictographic}|hurry|only|last chance|trending|popular/iu);
  });

  it("is on a place in a list only when it has a count", () => {
    const place = (n: number, savedBy?: number) => ({ experience: { id: P(n), slug: `p-${n}`, title: `Place ${n}`, category: "food_drink", tags: [], images: [], city: "T", priceLevel: "low", priceEstimate: null, isHiddenGem: false } as unknown as Experience, matchScore: 70, distanceMiles: 1, why: null, savedBy });
    const html = renderToStaticMarkup(<ListSection list={{ key: "for-you", template: "for-you", title: "T", blurb: "B", places: [place(1), place(2, 14), place(3)], shareIds: [] }} />);
    expect([...html.matchAll(/Saved by \d+ students nearby this week/g)]).toHaveLength(1);
    expect(html).toContain("Saved by 14 students nearby this week");
    expect(html.indexOf("Saved by 14")).toBeGreaterThan(html.indexOf("Place 2"));
    expect(html.indexOf("Saved by 14")).toBeLessThan(html.indexOf("Place 3"));
  });

  it("is on no place when none has one", () => {
    const place = (n: number) => ({ experience: { id: P(n), slug: `p-${n}`, title: `Place ${n}`, category: "food_drink", tags: [], images: [], city: "T", priceLevel: "low", priceEstimate: null, isHiddenGem: false } as unknown as Experience, matchScore: 70, distanceMiles: 1, why: null });
    const html = renderToStaticMarkup(<ListSection list={{ key: "for-you", template: "for-you", title: "T", blurb: "B", places: [place(1), place(2), place(3)], shareIds: [] }} />);
    expect(html).not.toContain("students nearby");
  });
});

describe("it is wired where a signed-in person looks, and nowhere a visitor does", () => {
  const read = (file: string) => readFileSync(join(__dirname, "..", file), "utf-8");

  it("Home counts for the person's own location, and the place page does too", () => {
    expect(read("app/(app)/home/page.tsx")).toMatch(/markSaveCounts\(built, \{ userId: profile\.userId, latitude: profile\.latitude, longitude: profile\.longitude \}\)/);
    expect(read("app/(app)/experience/[id]/page.tsx")).toMatch(/getSaveCounts\(\[experience\.id\], \{ userId: user\.id, latitude: profile\.latitude, longitude: profile\.longitude \}\)/);
  });

  it("a shared list's page and the first list a visitor gets never ask for counts (there is no viewer to be nearby)", () => {
    for (const file of ["app/l/[token]/page.tsx", "lib/lists/view.ts", "lib/start/build.ts", "components/start/start-flow.tsx"]) {
      expect(read(file), file).not.toMatch(/save-counts|savedBy/);
    }
  });

  it("the campaign is neutral: no school is named in what is said or in the numbers' code", () => {
    for (const file of ["lib/config/save-counts.ts", "lib/social-proof/save-counts.ts"]) expect(read(file), file).not.toMatch(/loyola/i);
  });
});
