import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The first list's rules, away from the page: what a request may contain, what the
// browser may keep, how the made-up profile is built, and that what leaves the server
// for a visitor is only what a row needs.

const h = vi.hoisted(() => ({ list: vi.fn(), getById: vi.fn(), usage: [] as unknown[] }));
vi.mock("@/services/providers", () => ({
  getExperienceProvider: async (usage: unknown) => {
    h.usage.push(usage);
    return { list: h.list, getById: h.getById };
  },
}));

import { FIRST_LIST_MAX_AGE_DAYS, FIRST_LIST_PLACES, FIRST_LIST_STORAGE_KEY } from "@/lib/config/start";
import { buildFirstList, firstListProfile, restoreFirstList, toStartPlace } from "@/lib/start/build";
import { parseListRequest, parseRestoreRequest } from "@/lib/start/input";
import { cleanPicks } from "@/lib/start/picks";
import { BUDGETS, OUTINGS, isBudgetId, isOutingId, outingInterests } from "@/lib/start/questions";
import { clearFirstList, readFirstList, writeFirstList } from "@/lib/start/storage";
import type { Experience } from "@/types/database";

let n = 0;
function place(over: Partial<Experience> = {}): Experience {
  n += 1;
  return {
    id: `g-ChIJfixture${String(n).padStart(8, "0")}`,
    slug: `g-place-${n}`,
    title: `Place ${n}`,
    description: "A long description that belongs to Google.",
    shortDescription: "short",
    category: "food_drink",
    tags: [],
    images: [`https://discoverzolo.com/api/place-photo?ref=${n}`, "https://discoverzolo.com/api/place-photo?ref=extra"],
    city: "Testville",
    region: "TS",
    country: "USA",
    address: "1 Secret Street",
    latitude: 39.29,
    longitude: -76.61,
    priceLevel: "low",
    priceEstimate: 12,
    priceCurrency: "USD",
    durationMinutes: 60,
    indoorOutdoor: "either",
    socialMode: "either",
    bestTimeOfDay: "any",
    rating: 4.6,
    reviewCount: 120,
    isHiddenGem: false,
    isFeatured: false,
    isPremium: false,
    externalBookingUrl: "https://example.test/book",
    sourceProvider: "google_places",
    sourceId: "ChIJ",
    requirements: [],
    availability: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  } as Experience;
}

beforeEach(() => {
  h.list.mockReset();
  h.getById.mockReset();
  h.usage.length = 0;
});

describe("the two questions", () => {
  it("map onto interests and budgets the signed-in app already understands", () => {
    expect(OUTINGS.length).toBeGreaterThanOrEqual(4);
    for (const o of OUTINGS) {
      expect(isOutingId(o.id)).toBe(true);
      expect(outingInterests(o.id).length).toBeGreaterThan(0);
    }
    expect(BUDGETS.map((b) => b.id)).toEqual(["free", "low", "medium", "high"]);
    expect(isBudgetId("luxury")).toBe(false);
    expect(isOutingId("anything")).toBe(false);
  });

  it("are worded in the brand's voice: calm, no exclamation points, no emoji", () => {
    for (const label of [...OUTINGS.map((o) => o.label), ...BUDGETS.map((b) => b.label)]) {
      expect(label).not.toMatch(/!/);
      expect(label).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("a request for a first list", () => {
  const ok = { outing: "meal", budget: "low", latitude: 39.29, longitude: -76.61 };

  it("accepts two answers and real coordinates", () => {
    expect(parseListRequest(ok)).toEqual({ ok: true, value: ok });
  });

  it("refuses unknown answers, missing or impossible coordinates, and anything that is not an object", () => {
    for (const bad of [
      { ...ok, outing: "everything" },
      { ...ok, budget: "luxury" },
      { ...ok, latitude: undefined },
      { ...ok, latitude: "39.29" },
      { ...ok, latitude: 91 },
      { ...ok, longitude: -181 },
      { ...ok, latitude: NaN },
      { ...ok, latitude: 0, longitude: 0 },
      null,
      "meal",
      [],
    ]) {
      expect(parseListRequest(bad).ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it("carries nothing it was not asked for: extra fields are dropped, so a name or an address never travels on", () => {
    const parsed = parseListRequest({ ...ok, email: "maya@example.edu", name: "Maya", address: "1 Secret Street" });
    expect(parsed).toEqual({ ok: true, value: ok });
  });
});

describe("a request for the places of a list the visitor already has", () => {
  const ids = ["g-ChIJ-aaaaaaaa", "g-ChIJ-bbbbbbbb", "g-ChIJ-cccccccc"];

  it("accepts three to ten distinct ids with the answers", () => {
    expect(parseRestoreRequest({ outing: "meal", budget: "low", ids })).toEqual({ ok: true, value: { outing: "meal", budget: "low", ids } });
  });

  it("refuses too few, too many, a repeat, a bad id, and missing answers", () => {
    const base = { outing: "meal", budget: "low" };
    for (const bad of [
      { ...base, ids: ids.slice(0, 2) },
      { ...base, ids: Array.from({ length: 11 }, (_, i) => `g-ChIJ-place-${i}xxx`) },
      { ...base, ids: [ids[0], ids[0], ids[1]] },
      { ...base, ids: [...ids.slice(0, 2), "has spaces!"] },
      { ...base, ids: "g-ChIJ-aaaaaaaa" },
      { outing: "meal", ids },
      null,
    ]) {
      expect(parseRestoreRequest(bad).ok, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("the picks a list is kept as", () => {
  const good = (id: string) => ({ experienceId: id, tags: ["food"], category: "food_drink" });
  const three = [good("g-ChIJ-aaaaaaaa"), good("g-ChIJ-bbbbbbbb"), good("g-ChIJ-cccccccc")];

  it("are three to ten distinct places with known tags and a known category", () => {
    expect(cleanPicks(three)).toEqual(three);
    expect(cleanPicks([{ ...three[0], category: null }, three[1], three[2]])).toHaveLength(3);
  });

  it("refuse anything else, rather than trimming it", () => {
    for (const bad of [
      three.slice(0, 2),
      [...three, ...three],
      [three[0], three[0], three[1]],
      [{ ...three[0], tags: ["not-a-tag"] }, three[1], three[2]],
      [{ ...three[0], category: "not_a_category" }, three[1], three[2]],
      [{ ...three[0], experienceId: "has spaces" }, three[1], three[2]],
      [{ ...three[0], tags: "food" }, three[1], three[2]],
      "nope",
      null,
    ]) {
      expect(cleanPicks(bad)).toBeNull();
    }
  });

  it("keep only an id, tags and a category: nothing else survives, so no Google content can be kept", () => {
    const withExtras = three.map((p) => ({ ...p, name: "Fells Point Roasters", rating: 4.8, address: "1 S Broadway", photo: "x" }));
    for (const pick of cleanPicks(withExtras)!) expect(Object.keys(pick).sort()).toEqual(["category", "experienceId", "tags"]);
  });
});

describe("what the browser keeps", () => {
  const picks = [1, 2, 3].map((i) => ({ experienceId: `g-ChIJ-pick-000${i}`, tags: ["food"], category: "food_drink" }));
  const NOW = Date.parse("2026-10-20T12:00:00Z");
  const stored = () => JSON.parse(window.localStorage.getItem(FIRST_LIST_STORAGE_KEY) ?? "null");

  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("is the answers and the picks, with the time: no name, photo, rating, address, price or location", () => {
    writeFirstList({ outing: "meal", budget: "low", picks }, NOW);
    expect(Object.keys(stored()).sort()).toEqual(["budget", "outing", "picks", "savedAt", "v"]);
    for (const pick of stored().picks) expect(Object.keys(pick).sort()).toEqual(["category", "experienceId", "tags"]);
    expect(JSON.stringify(stored())).not.toMatch(/latitude|longitude|address|rating|photo|price|name/i);
  });

  it("strips anything extra a caller hands over, and refuses to write a list that is not clean", () => {
    const withExtras = picks.map((p) => ({ ...p, name: "Fells Point Roasters", rating: 4.8, address: "1 S Broadway" }));
    writeFirstList({ outing: "meal", budget: "low", picks: withExtras }, NOW);
    expect(JSON.stringify(stored())).not.toMatch(/Fells Point|4\.8|Broadway/);
    expect(stored().picks).toEqual(picks);

    window.localStorage.clear();
    writeFirstList({ outing: "meal", budget: "low", picks: picks.slice(0, 1) }, NOW);
    expect(window.localStorage.getItem(FIRST_LIST_STORAGE_KEY)).toBeNull();
  });

  it("comes back as it was written", () => {
    writeFirstList({ outing: "night", budget: "medium", picks }, NOW);
    expect(readFirstList(NOW + 1000)).toEqual({ v: 1, outing: "night", budget: "medium", picks, savedAt: new Date(NOW).toISOString() });
  });

  it("is forgotten after the time limit, because a list that old is stale", () => {
    writeFirstList({ outing: "meal", budget: "low", picks }, NOW);
    expect(readFirstList(NOW + (FIRST_LIST_MAX_AGE_DAYS - 1) * 86_400_000)).not.toBeNull();
    expect(readFirstList(NOW + (FIRST_LIST_MAX_AGE_DAYS + 1) * 86_400_000)).toBeNull();
  });

  it("is ignored when it is not what we wrote: broken JSON, another version, an unknown answer, bad picks, a future date", () => {
    const put = (v: unknown) => window.localStorage.setItem(FIRST_LIST_STORAGE_KEY, typeof v === "string" ? v : JSON.stringify(v));
    const good = { v: 1, outing: "meal", budget: "low", picks, savedAt: new Date(NOW).toISOString() };
    for (const bad of ["{broken", { ...good, v: 2 }, { ...good, outing: "x" }, { ...good, budget: "luxury" }, { ...good, picks: picks.slice(0, 1) }, { ...good, savedAt: "yesterday" }, { ...good, savedAt: new Date(NOW + 86_400_000).toISOString() }, "null", "[]"]) {
      put(bad);
      expect(readFirstList(NOW), JSON.stringify(bad)).toBeNull();
    }
  });

  it("can be cleared, and nothing breaks when storage is unavailable", () => {
    writeFirstList({ outing: "meal", budget: "low", picks }, NOW);
    clearFirstList();
    expect(readFirstList(NOW)).toBeNull();

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readFirstList()).toBeNull();
    expect(() => writeFirstList({ outing: "meal", budget: "low", picks })).not.toThrow();
    expect(() => clearFirstList()).not.toThrow();
  });
});

describe("the made-up profile", () => {
  it("holds the visitor's answers and neutral defaults, and nothing personal", () => {
    const p = firstListProfile("night", "medium", { latitude: 39.29, longitude: -76.61 });
    expect(p.interests).toEqual(["music", "nightlife"]);
    expect(p.preferences.budgetLevel).toBe("medium");
    expect([p.firstName, p.lastName, p.avatarUrl, p.bio, p.city, p.ageRange]).toEqual(["", null, null, null, null, null]);
    expect(p.lifestyleGoals).toEqual([]);
    expect(Object.values(p.personality).every((v) => v === 50)).toBe(true);
    expect(firstListProfile("meal", "low").latitude).toBeNull();
  });
});

describe("making the first list", () => {
  it("ranks the places around the visitor with the app's own scoring and keeps the best six", async () => {
    const lovedAndCheap = Array.from({ length: 4 }, () => place({ tags: ["music", "nightlife"] as never, priceLevel: "low" }));
    const others = Array.from({ length: 8 }, () => place({ tags: ["hiking"] as never, priceLevel: "low" }));
    h.list.mockResolvedValue([...others, ...lovedAndCheap]);

    const list = await buildFirstList({ outing: "night", budget: "low", latitude: 39.29, longitude: -76.61 });
    expect(list!.places).toHaveLength(FIRST_LIST_PLACES);
    // the four that match the visitor's interests come first
    expect(list!.places.slice(0, 4).map((p) => p.id).sort()).toEqual(lovedAndCheap.map((p) => p.id).sort());
    expect(list!.title).toBe("Your first list");
  });

  it("asks Google about where the visitor is, as a visitor with no account, against its own daily ceiling", async () => {
    h.list.mockResolvedValue([place(), place(), place()]);
    await buildFirstList({ outing: "meal", budget: "low", latitude: 39.29, longitude: -76.61 });
    expect(h.usage[0]).toMatchObject({ userId: null, feature: "start_list" });
    expect(h.list.mock.calls[0][0]).toMatchObject({ latitude: 39.29, longitude: -76.61 });
  });

  it("is null when there are too few places to make a list, never padded", async () => {
    h.list.mockResolvedValue([place(), place()]);
    expect(await buildFirstList({ outing: "meal", budget: "low", latitude: 39.29, longitude: -76.61 })).toBeNull();
    h.list.mockResolvedValue([]);
    expect(await buildFirstList({ outing: "meal", budget: "low", latitude: 39.29, longitude: -76.61 })).toBeNull();
  });

  it("sends the page only what a row needs: no description, address, rating, coordinates or booking link", () => {
    const e = place({ tags: ["food"] as never });
    const sent = toStartPlace(e, firstListProfile("meal", "low", { latitude: 39.29, longitude: -76.61 }));
    expect(Object.keys(sent).sort()).toEqual(["category", "city", "distanceMiles", "id", "images", "isHiddenGem", "priceEstimate", "priceLevel", "slug", "tags", "title", "why"]);
    expect(sent.images).toHaveLength(1);
    expect(JSON.stringify(sent)).not.toMatch(/Secret Street|long description|example\.test|4\.6|39\.29/);
  });

  it("gives a reason only from facts we hold, and a distance only when we know where the visitor is", () => {
    const e = place({ tags: ["food"] as never, priceLevel: "free" });
    const near = toStartPlace(e, firstListProfile("meal", "low", { latitude: 39.29, longitude: -76.61 }));
    expect(near.why).toMatch(/^Matches your taste for food, free/);
    expect(near.distanceMiles).toBe(0);
    expect(toStartPlace(e, firstListProfile("meal", "low")).distanceMiles).toBeNull();
  });
});

describe("making the same list again from the kept ids", () => {
  it("returns the places in the order they were kept, leaving out any that cannot be found now", async () => {
    const a = place();
    const b = place();
    const c = place();
    const d = place();
    h.getById.mockImplementation(async (id: string) => [a, b, c, d].find((e) => e.id === id) ?? null);
    const list = await restoreFirstList({ outing: "meal", budget: "low", ids: [c.id, "g-ChIJ-gone-0001", a.id, d.id, b.id] });
    expect(list!.places.map((p) => p.id)).toEqual([c.id, a.id, d.id, b.id]);
  });

  it("is null when fewer than three places can be found, and survives a place that errors", async () => {
    const a = place();
    h.getById.mockImplementation(async (id: string) => {
      if (id === a.id) return a;
      throw new Error("Google is down");
    });
    expect(await restoreFirstList({ outing: "meal", budget: "low", ids: [a.id, "g-ChIJ-x-0000001", "g-ChIJ-y-0000002"] })).toBeNull();
  });
});
