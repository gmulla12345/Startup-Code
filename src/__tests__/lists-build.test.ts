import { describe, expect, it } from "vitest";
import { buildHomeLists, type RecommendedPlace } from "@/lib/lists/build";
import { whyThisPick } from "@/lib/lists/reasons";
import { LIST_TEMPLATES, LIST_TEMPLATE_IDS, getListTemplate, isListTemplateId } from "@/lib/lists/templates";
import { cleanPlaceIds } from "@/lib/lists/input";
import { CLOSE_BY_MILES, HOME_LIST_PLACES, LIST_MAX_PLACES, LIST_MIN_PLACES } from "@/lib/config/lists";
import type { Experience } from "@/types/database";

// The lists on Home: which places each rule picks, what the line under a place may
// say (only what we know), that a list is never padded, and that the words we wrote
// fit the database's limits and the brand's voice.

let n = 0;
function place(over: Partial<Experience> = {}): Experience {
  n += 1;
  return {
    id: `g-ChIJfixture${String(n).padStart(8, "0")}`,
    slug: `g-place-${n}`,
    title: `Place ${n}`,
    description: "",
    shortDescription: "",
    category: "food_drink",
    tags: [],
    images: [],
    city: "Testville",
    region: null,
    country: "USA",
    address: null,
    latitude: 39.29,
    longitude: -76.61,
    priceLevel: "medium",
    priceEstimate: null,
    priceCurrency: "USD",
    durationMinutes: null,
    indoorOutdoor: "either",
    socialMode: "either",
    bestTimeOfDay: "any",
    rating: null,
    reviewCount: 0,
    isHiddenGem: false,
    isFeatured: false,
    isPremium: false,
    externalBookingUrl: null,
    sourceProvider: "google_places",
    sourceId: null,
    requirements: [],
    availability: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  } as Experience;
}

const rec = (experience: Experience, matchScore = 70): RecommendedPlace => ({ experience, matchScore });
const here = { interests: ["music", "art"], latitude: 39.29, longitude: -76.61 } as never;

describe("the list templates", () => {
  it("have unique ids, all known to isListTemplateId, and a title and a line of copy", () => {
    expect(new Set(LIST_TEMPLATES.map((t) => t.id)).size).toBe(LIST_TEMPLATES.length);
    expect(LIST_TEMPLATES.map((t) => t.id)).toEqual([...LIST_TEMPLATE_IDS]);
    for (const t of LIST_TEMPLATES) {
      expect(isListTemplateId(t.id)).toBe(true);
      expect(getListTemplate(t.id)).toBe(t);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.blurb.length).toBeGreaterThan(0);
    }
    expect(isListTemplateId("anything-else")).toBe(false);
    expect(getListTemplate(undefined)).toBeUndefined();
  });

  it("fit the database's limits (title 80, line of copy 160) and the brand's voice", () => {
    for (const t of LIST_TEMPLATES) {
      expect(t.title.length, t.id).toBeLessThanOrEqual(80);
      expect(t.blurb.length, t.id).toBeLessThanOrEqual(160);
      for (const words of [t.title, t.blurb]) {
        expect(words, t.id).not.toMatch(/!/);
        expect(words, t.id).not.toMatch(/\p{Extended_Pictographic}/u);
      }
    }
  });
});

describe("what each list picks", () => {
  const pool = (items: Partial<Experience>[], scores?: number[]) => items.map((o, i) => rec(place(o), scores?.[i] ?? 50 + i));

  it("'close by' holds only places within the distance, nearest first", () => {
    const lists = buildHomeLists(
      pool([
        { latitude: 39.29, longitude: -76.61 }, // here
        { latitude: 39.3, longitude: -76.61 }, // about 0.7 mi
        { latitude: 39.32, longitude: -76.61 }, // about 2 mi
        { latitude: 39.34, longitude: -76.61 }, // about 3.5 mi
        { latitude: 39.9, longitude: -76.61 }, // far
      ]),
      here
    );
    const close = lists.find((l) => l.template === "close-by")!;
    expect(close.places).toHaveLength(4);
    const miles = close.places.map((p) => p.distanceMiles as number);
    expect([...miles].sort((a, b) => a - b)).toEqual(miles);
    expect(Math.max(...miles)).toBeLessThanOrEqual(CLOSE_BY_MILES);
  });

  it("'close by' needs a location: without one the list is simply absent", () => {
    const lists = buildHomeLists(pool([{}, {}, {}, {}]), { interests: [], latitude: null, longitude: null } as never);
    expect(lists.find((l) => l.template === "close-by")).toBeUndefined();
    expect(lists.find((l) => l.template === "for-you")).toBeDefined();
  });

  it("'light on the wallet' holds free and low-cost places, 'under a roof' indoor ones, 'after dark' evening and night ones, 'less obvious' hidden gems", () => {
    const lists = buildHomeLists(
      pool([
        { priceLevel: "free", indoorOutdoor: "indoor", bestTimeOfDay: "night", isHiddenGem: true },
        { priceLevel: "low", indoorOutdoor: "indoor", bestTimeOfDay: "evening", isHiddenGem: true },
        { priceLevel: "free", indoorOutdoor: "indoor", bestTimeOfDay: "evening", isHiddenGem: true },
        { priceLevel: "high", indoorOutdoor: "outdoor", bestTimeOfDay: "morning", isHiddenGem: false },
      ]),
      here
    );
    const by = (id: string) => lists.find((l) => l.template === id)!;
    expect(by("easy-on-the-wallet").places.map((p) => p.experience.priceLevel).every((l) => l === "free" || l === "low")).toBe(true);
    expect(by("easy-on-the-wallet").places).toHaveLength(3);
    expect(by("indoors").places.every((p) => p.experience.indoorOutdoor === "indoor")).toBe(true);
    expect(by("after-dark").places.every((p) => ["evening", "night"].includes(p.experience.bestTimeOfDay))).toBe(true);
    expect(by("less-obvious").places.every((p) => p.experience.isHiddenGem)).toBe(true);
  });

  it("'chosen for you' is the best matches first", () => {
    const lists = buildHomeLists(pool([{}, {}, {}, {}], [40, 90, 60, 75]), here);
    expect(lists[0].template).toBe("for-you");
    expect(lists[0].places.map((p) => p.matchScore)).toEqual([90, 75, 60, 40]);
  });
});

describe("how many places a list holds", () => {
  it("is never shown with fewer than the minimum, and never padded", () => {
    const lists = buildHomeLists([rec(place()), rec(place())], here);
    expect(LIST_MIN_PLACES).toBe(3);
    expect(lists).toEqual([]);
  });

  it("shows at most the Home maximum, which is within the most a list may hold", () => {
    expect(HOME_LIST_PLACES).toBeLessThanOrEqual(LIST_MAX_PLACES);
    const lists = buildHomeLists(Array.from({ length: 20 }, () => rec(place())), here);
    expect(lists[0].places).toHaveLength(HOME_LIST_PLACES);
  });

  it("counts a place once even if it comes twice", () => {
    const p = place();
    const lists = buildHomeLists([rec(p), rec(p), rec(p), rec(place())], here);
    expect(lists).toEqual([]); // two distinct places: not enough for a list
  });
});

describe("which lists can become a public link", () => {
  it("carries the Google place ids, in order, when every place is a Google place", () => {
    const places = Array.from({ length: 4 }, () => place());
    const [forYou] = buildHomeLists(places.map((p, i) => rec(p, 90 - i)), here);
    expect(forYou.shareIds).toEqual(places.map((p) => p.id.slice(2)));
  });

  it("carries none when any place is not a Google place (a curated one has no place id)", () => {
    const places = [place(), place(), place(), place({ id: "11111111-2222-4333-8444-555555555555" })];
    const [forYou] = buildHomeLists(places.map((p, i) => rec(p, 90 - i)), here);
    expect(forYou.places).toHaveLength(4);
    expect(forYou.shareIds).toEqual([]);
  });
});

describe("the line under a place says only what we know", () => {
  const profile = { interests: ["music", "art", "food"] } as never;

  it("names the shared interests, then price, then quality, then setting, at most three, as a calm fragment", () => {
    const line = whyThisPick(
      place({ tags: ["music", "art", "outdoors"] as never, priceLevel: "low", rating: 4.7, reviewCount: 300, indoorOutdoor: "indoor" }),
      profile
    );
    expect(line).toBe("Matches your taste for music and art, low cost, highly rated");
  });

  it("starts with a capital whatever fact leads, and has no full stop or exclamation point", () => {
    const line = whyThisPick(place({ priceLevel: "free", isHiddenGem: true }), profile)!;
    expect(line).toBe("Free, off the usual path");
    expect(line).not.toMatch(/[.!]$/);
  });

  it("calls a place highly rated only with a high rating from enough people", () => {
    expect(whyThisPick(place({ rating: 4.9, reviewCount: 3 }), profile)).toBeNull();
    expect(whyThisPick(place({ rating: 4.2, reviewCount: 900 }), profile)).toBeNull();
    expect(whyThisPick(place({ rating: 4.6, reviewCount: 80 }), profile)).toBe("Highly rated");
  });

  it("can say both highly rated and off the usual path when both are true (a place with 50 to 199 reviews)", () => {
    expect(whyThisPick(place({ rating: 4.7, reviewCount: 120, isHiddenGem: true }), profile)).toBe("Highly rated, off the usual path");
  });

  it("is absent, not invented, when we hold nothing worth saying", () => {
    expect(whyThisPick(place(), profile)).toBeNull();
  });

  it("never claims a quality we have no data for: every line is built only from phrases we can back", () => {
    const allowed = /^(Matches your taste for [a-z ]+|free|low cost|highly rated|off the usual path|best after dark|indoors|close to you)$/i;
    for (const priceLevel of ["free", "low", "medium", "high"] as const)
      for (const bestTimeOfDay of ["morning", "evening", "night", "any"] as const)
        for (const indoorOutdoor of ["indoor", "outdoor", "either"] as const)
          for (const [rating, reviewCount, isHiddenGem] of [[4.9, 500, false], [3.8, 10, true], [null, 0, false]] as const) {
            const line = whyThisPick(
              place({ tags: ["music"] as never, priceLevel, bestTimeOfDay, indoorOutdoor, rating, reviewCount, isHiddenGem }),
              profile
            );
            for (const part of line?.split(", ") ?? []) expect(part, line ?? "").toMatch(allowed);
            expect(line?.split(", ").length ?? 0, line ?? "").toBeLessThanOrEqual(3);
          }
  });
});

describe("under a list made by a rule, the line says why the place is in THAT list", () => {
  const profile = { interests: ["music"] } as never;

  it("leads with the fact that put the place there", () => {
    const rich = { tags: ["music"] as never, priceLevel: "free" as const, rating: 4.8, reviewCount: 120, isHiddenGem: true, bestTimeOfDay: "evening" as const, indoorOutdoor: "indoor" as const };
    const line = (list: Parameters<typeof whyThisPick>[2], over = {}) => whyThisPick(place({ ...rich, ...over }), profile, list);
    expect(line({ list: "after-dark" })).toBe("Best after dark, matches your taste for music, free");
    expect(line({ list: "easy-on-the-wallet" })).toBe("Free, matches your taste for music, highly rated");
    expect(line({ list: "indoors" })).toBe("Indoors, matches your taste for music, free");
    expect(line({ list: "less-obvious" })).toBe("Off the usual path, matches your taste for music, free");
    expect(line({ list: "close-by", distanceMiles: 0.6 })).toBe("Close to you, matches your taste for music, free");
    // and the list chosen from what they like keeps its old order
    expect(line({ list: "for-you" })).toBe("Matches your taste for music, free, highly rated");
  });

  it("says a place is close only when it is, and only under the list of the nearest places", () => {
    const near = place({});
    expect(whyThisPick(near, profile, { list: "close-by", distanceMiles: CLOSE_BY_MILES })).toBe("Close to you");
    expect(whyThisPick(near, profile, { list: "close-by", distanceMiles: CLOSE_BY_MILES + 0.1 })).toBeNull();
    expect(whyThisPick(near, profile, { list: "close-by", distanceMiles: null })).toBeNull();
    expect(whyThisPick(near, profile, { list: "for-you", distanceMiles: 0.2 })).toBeNull(); // distance is shown beside the place; the line does not repeat it
    expect(whyThisPick(near, profile, { distanceMiles: 0.2 })).toBeNull();
  });

  it("never states a lead fact the place does not have", () => {
    const plain = place({});
    for (const list of ["after-dark", "easy-on-the-wallet", "indoors", "less-obvious"] as const) expect(whyThisPick(plain, profile, { list }), list).toBeNull();
  });

  it("gives every place a rule picks a line, and never repeats a fact", () => {
    // three places for each rule, so every list is long enough to be shown
    const pool = [
      ...[0, 1, 2].map((i) => place({ bestTimeOfDay: i === 0 ? "night" : "evening", priceLevel: i === 1 ? "low" : "medium" })),
      ...[0, 1, 2].map((i) => place({ priceLevel: i === 0 ? "free" : "low", indoorOutdoor: i === 2 ? "indoor" : "either" })),
      ...[0, 1, 2].map(() => place({ indoorOutdoor: "indoor" })),
      ...[0, 1, 2].map((i) => place({ isHiddenGem: true, rating: i === 0 ? 4.9 : 4.6, reviewCount: i === 0 ? 80 : 20 })),
    ];
    const lists = buildHomeLists(pool.map((p, i) => rec(p, 90 - i)), { interests: ["music"], latitude: 39.29, longitude: -76.61 } as never);
    const rules = lists.filter((l) => l.template !== "for-you");
    expect(rules.length).toBeGreaterThanOrEqual(4);
    for (const l of rules) {
      for (const p of l.places) {
        expect(p.why, `${l.template}: ${p.experience.title}`).not.toBeNull();
        const parts = p.why!.toLowerCase().split(", ");
        expect(new Set(parts).size, p.why!).toBe(parts.length);
      }
    }
  });

  it("the lists Home draws lead each place's line with the rule's own fact", () => {
    const pool = [
      ...[0, 1, 2].map(() => place({ bestTimeOfDay: "night", priceLevel: "medium" })),
      ...[0, 1, 2].map(() => place({ priceLevel: "free" })),
      ...[0, 1, 2].map(() => place({ indoorOutdoor: "indoor" })),
      ...[0, 1, 2].map(() => place({ isHiddenGem: true, rating: 4.6, reviewCount: 20 })),
    ];
    const lists = buildHomeLists(pool.map((p, i) => rec(p, 90 - i)), { interests: [], latitude: 39.29, longitude: -76.61 } as never);
    const lead = { "after-dark": "Best after dark", "easy-on-the-wallet": "Free", indoors: "Indoors", "less-obvious": "Off the usual path", "close-by": "Close to you" } as Record<string, string>;
    for (const l of lists.filter((x) => lead[x.template])) {
      for (const p of l.places) expect(p.why?.startsWith(lead[l.template]), `${l.template}: ${p.why}`).toBe(true);
    }
    expect(lists.filter((x) => lead[x.template]).map((x) => x.template).sort()).toEqual(["after-dark", "close-by", "easy-on-the-wallet", "indoors", "less-obvious"]);
  });

  it("says nothing it could not say before: the lead is always one of the phrases we can back", () => {
    const allowed = /^(matches your taste for [a-z ]+|free|low cost|highly rated|off the usual path|best after dark|indoors|close to you)$/;
    for (const list of ["for-you", "close-by", "after-dark", "easy-on-the-wallet", "indoors", "less-obvious"] as const)
      for (const priceLevel of ["free", "low", "medium"] as const)
        for (const bestTimeOfDay of ["evening", "morning"] as const)
          for (const indoorOutdoor of ["indoor", "outdoor"] as const) {
            const line = whyThisPick(place({ priceLevel, bestTimeOfDay, indoorOutdoor, tags: ["music"] as never, isHiddenGem: priceLevel === "low", rating: 4.7, reviewCount: 90 }), profile, { list, distanceMiles: 1 });
            const parts = (line ?? "").toLowerCase().split(", ").filter(Boolean);
            for (const part of parts) expect(part, line ?? "").toMatch(allowed);
            expect(parts.length).toBeLessThanOrEqual(3);
          }
  });
});

describe("the place ids a person may put in a list", () => {
  const ok = ["ChIJ-aaaaaaaa", "ChIJ-bbbbbbbb", "ChIJ-cccccccc"];

  it("accepts three to ten distinct place ids", () => {
    expect(cleanPlaceIds(ok)).toEqual({ ok: true, ids: ok });
    expect(cleanPlaceIds(Array.from({ length: 10 }, (_, i) => `ChIJ-place-${i}xxxxx`)).ok).toBe(true);
  });

  it("refuses too few, too many, repeats, the wrong shape, and anything that is not a list", () => {
    expect(cleanPlaceIds(ok.slice(0, 2)).ok).toBe(false);
    expect(cleanPlaceIds(Array.from({ length: 11 }, (_, i) => `ChIJ-place-${i}xxxxx`)).ok).toBe(false);
    expect(cleanPlaceIds([ok[0], ok[0], ok[1]]).ok).toBe(false);
    expect(cleanPlaceIds([ok[0], ok[1], "short"]).ok).toBe(false);
    expect(cleanPlaceIds([ok[0], ok[1], "has spaces in it!"]).ok).toBe(false);
    expect(cleanPlaceIds([ok[0], ok[1], 42]).ok).toBe(false);
    expect(cleanPlaceIds("ChIJ-aaaaaaaa").ok).toBe(false);
    expect(cleanPlaceIds(null).ok).toBe(false);
  });
});
