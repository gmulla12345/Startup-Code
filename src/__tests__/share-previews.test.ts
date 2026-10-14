import { beforeEach, describe, expect, it, vi } from "vitest";

// What a shared place and a shared plan show, and what is asked of Google to show
// it. The rules: only a name, address, type and one credited photo from Google, and
// only through the one cost-controlled door; a plan never shows dates, coordinates
// or photos.

const h = vi.hoisted(() => ({ fetchGoogleJson: vi.fn() }));
vi.mock("@/lib/google/places-fetch", () => ({ fetchGoogleJson: h.fetchGoogleJson }));

import { fetchPlacePreview, parsePhotoCredit, toPlacePreview } from "@/lib/share/place-preview";
import { toPlanPreview } from "@/lib/share/plan-preview";
import { SHARE_CACHE_SECONDS, SHARE_PLAN_MAX_ITEMS } from "@/lib/config/share";

const PHOTO = "AUacShh0Zp5aB7zQxH9kVQx_fixture_photo_reference_01";

describe("a photo's credit", () => {
  it("is the author's name, linked to their Google profile when Google gave one", () => {
    expect(parsePhotoCredit('<a href="https://maps.google.com/maps/contrib/1123">Jane Doe</a>')).toEqual({
      name: "Jane Doe",
      url: "https://maps.google.com/maps/contrib/1123",
    });
    expect(parsePhotoCredit('<a href="//maps.google.com/maps/contrib/9">Sam</a>')?.url).toBe("https://maps.google.com/maps/contrib/9");
  });

  it("decodes entities, so the name reads as a name", () => {
    expect(parsePhotoCredit('<a href="https://maps.google.com/maps/contrib/1">Ana &amp; Co &#39;22</a>')?.name).toBe("Ana & Co '22");
  });

  it("never links anywhere but Google Maps, and never lets markup through", () => {
    expect(parsePhotoCredit('<a href="https://evil.test/x">Mallory</a>')).toEqual({ name: "Mallory", url: null });
    expect(parsePhotoCredit('<a href="javascript:alert(1)">Mallory</a>')?.url).toBeNull();
    expect(parsePhotoCredit('<a href="https://maps.google.com.evil.test/x">M</a>')?.url).toBeNull();
    const hostile = parsePhotoCredit('<a href="https://maps.google.com/maps/contrib/1"><script>alert(1)</script>Eve</a>');
    expect(hostile?.name).not.toMatch(/[<>]/);
  });

  it("is plain text when Google sends no link, and nothing when it sends nothing", () => {
    expect(parsePhotoCredit("A Google User")).toEqual({ name: "A Google User", url: null });
    for (const v of [undefined, null, "", "   ", "<a href='x'></a>", 5]) expect(parsePhotoCredit(v), String(v)).toBeNull();
  });

  it("is kept short", () => {
    expect(parsePhotoCredit(`<a href="https://maps.google.com/maps/contrib/1">${"n".repeat(500)}</a>`)?.name).toHaveLength(80);
  });
});

describe("a place, as Google describes it", () => {
  const google = {
    place_id: "ChIJ-fixture-place-id-0001",
    name: "  Fells  Point   Roasters ",
    formatted_address: "1 S Broadway, Baltimore, MD 21231, USA",
    types: ["point_of_interest", "cafe", "food", "establishment"],
    photos: [
      { photo_reference: "bad ref!", html_attributions: ["x"] },
      { photo_reference: PHOTO, html_attributions: ['<a href="https://maps.google.com/maps/contrib/77">Jo</a>'] },
    ],
  };

  it("becomes a name, an address, a short type, and the first usable photo with its credit", () => {
    expect(toPlacePreview(google)).toEqual({
      name: "Fells Point Roasters",
      address: "1 S Broadway, Baltimore, MD 21231, USA",
      category: "Cafe",
      photoRef: PHOTO,
      photoCredit: { name: "Jo", url: "https://maps.google.com/maps/contrib/77" },
    });
  });

  it("skips Google's generic types, and says nothing when only generic ones exist", () => {
    expect(toPlacePreview({ name: "X", types: ["point_of_interest", "establishment"] })?.category).toBeNull();
    expect(toPlacePreview({ name: "X", types: ["art_gallery", "point_of_interest"] })?.category).toBe("Art Gallery");
  });

  it("copes with a place that has no address, no types and no photo", () => {
    expect(toPlacePreview({ name: "Bare" })).toEqual({ name: "Bare", address: null, category: null, photoRef: null, photoCredit: null });
  });

  it("is nothing without a name, which is all a share cannot do without", () => {
    for (const result of [undefined, {}, { name: "" }, { name: "   " }, { name: 5 as unknown as string }]) {
      expect(toPlacePreview(result), JSON.stringify(result)).toBeNull();
    }
  });

  it("carries no rating, reviews, hours, phone or website: none was asked for", () => {
    expect(Object.keys(toPlacePreview(google)!).sort()).toEqual(["address", "category", "name", "photoCredit", "photoRef"]);
  });
});

describe("asking Google for a shared place", () => {
  beforeEach(() => {
    h.fetchGoogleJson.mockReset();
    process.env.MAPS_API_KEY = "test-key-not-real";
  });

  const okAnswer = { ok: true, data: { status: "OK", result: { name: "Fells Point Roasters", types: ["cafe"] } } };

  it("makes one lean Place Details request through the cost-controlled door", async () => {
    h.fetchGoogleJson.mockResolvedValue(okAnswer);
    const result = await fetchPlacePreview("ChIJ-fixture-place-id-0001");

    expect(result).toMatchObject({ status: "ok", place: { name: "Fells Point Roasters" } });
    expect(h.fetchGoogleJson).toHaveBeenCalledTimes(1);
    const call = h.fetchGoogleJson.mock.calls[0][0];
    const url = new URL(call.url);
    expect(url.searchParams.get("place_id")).toBe("ChIJ-fixture-place-id-0001");
    // Exactly these fields: the cheaper request, and the least Google content.
    expect(url.searchParams.get("fields")).toBe("place_id,name,formatted_address,types,photos");
    expect(call.operation).toBe("place_details_share");
  });

  it("is reused for the share cache time, by place id, so every share and viewer of one place costs one call", async () => {
    h.fetchGoogleJson.mockResolvedValue(okAnswer);
    await fetchPlacePreview("ChIJ-fixture-place-id-0001");
    const call = h.fetchGoogleJson.mock.calls[0][0];
    expect(call.revalidate).toBe(SHARE_CACHE_SECONDS);
    expect(call.cacheKey).toEqual(["share-v1", "ChIJ-fixture-place-id-0001"]);
    expect(call.cacheKey.join(" ")).not.toContain("test-key-not-real"); // the API key is never part of a cache key
  });

  it("is counted as anonymous 'share_preview' use, which has its own daily ceiling", async () => {
    h.fetchGoogleJson.mockResolvedValue(okAnswer);
    await fetchPlacePreview("ChIJ-fixture-place-id-0001");
    expect(h.fetchGoogleJson.mock.calls[0][0].usage).toMatchObject({ userId: null, feature: "share_preview" });
  });

  it("says not_found when Google does not know the place", async () => {
    h.fetchGoogleJson.mockResolvedValue({ ok: true, data: { status: "NOT_FOUND" } });
    expect(await fetchPlacePreview("ChIJ-fixture-place-id-0001")).toEqual({ status: "not_found" });
  });

  it("says unavailable, not an error, when Google cannot be asked: billing hold, outage, or today's ceiling", async () => {
    for (const answer of [{ ok: false, status: "REQUEST_DENIED" }, { ok: false, limited: true, status: "LIMIT" }, { ok: false, status: "ERROR" }]) {
      h.fetchGoogleJson.mockResolvedValue(answer);
      expect(await fetchPlacePreview("ChIJ-fixture-place-id-0001"), JSON.stringify(answer)).toEqual({ status: "unavailable" });
    }
  });

  it("does not call Google at all without a key", async () => {
    delete process.env.MAPS_API_KEY;
    expect(await fetchPlacePreview("ChIJ-fixture-place-id-0001")).toEqual({ status: "unavailable" });
    expect(h.fetchGoogleJson).not.toHaveBeenCalled();
  });
});

describe("a plan, as shared", () => {
  const itinerary = { title: "  A weekend\n in Lisbon ", type: "travel" as const, destination_city: "Lisbon", destination_country: "Portugal", estimated_cost: "245.50" };
  const item = (day: number, order: number, title: string, extra: Record<string, unknown> = {}) => ({
    day_index: day,
    order_index: order,
    start_time: "09:00",
    title,
    notes: null as string | null,
    ...extra,
  });

  it("lists stops by day in order, numbering the days from 1", () => {
    const plan = toPlanPreview(itinerary, [item(5, 1, "Dinner"), item(2, 1, "Museum"), item(2, 0, "Coffee"), item(5, 0, "Walk")]);
    expect(plan.days.map((d) => d.label)).toEqual(["Day 1", "Day 2"]);
    expect(plan.days[0].stops.map((s) => s.title)).toEqual(["Coffee", "Museum"]);
    expect(plan.days[1].stops.map((s) => s.title)).toEqual(["Walk", "Dinner"]);
    expect(plan).toMatchObject({ title: "A weekend in Lisbon", city: "Lisbon", dayCount: 2, stopCount: 4, estimatedCost: 245.5 });
  });

  it("shows no dates, coordinates, photos or ids, whatever the stored plan holds", () => {
    const stored = {
      ...itinerary,
      start_date: "2026-11-20",
      end_date: "2026-11-23",
      destination_latitude: 38.72,
      destination_longitude: -9.14,
      user_id: "user-1",
      share_slug: "abcd1234",
    };
    const plan = toPlanPreview(stored, [item(0, 0, "Tram 28", { images: ["https://x/p.jpg"], id: "item-1", experience_id: "g-ChIJabc" })]);
    const serialized = JSON.stringify(plan);
    for (const leak of ["2026-11", "38.72", "-9.14", "user-1", "abcd1234", "p.jpg", "item-1", "ChIJabc"]) {
      expect(serialized, leak).not.toContain(leak);
    }
    expect(Object.keys(plan).sort()).toEqual(["city", "country", "dayCount", "days", "estimatedCost", "stopCount", "title", "truncated", "type"]);
  });

  it("shows only the first stops of a very long plan, and says it did", () => {
    const many = Array.from({ length: SHARE_PLAN_MAX_ITEMS + 5 }, (_, i) => item(0, i, `Stop ${i}`));
    const plan = toPlanPreview(itinerary, many);
    expect(plan.days[0].stops).toHaveLength(SHARE_PLAN_MAX_ITEMS);
    expect(plan.stopCount).toBe(SHARE_PLAN_MAX_ITEMS + 5);
    expect(plan.truncated).toBe(true);
  });

  it("keeps text short and tidy, and gives a stop with no name a plain one", () => {
    const plan = toPlanPreview(itinerary, [item(0, 0, "x".repeat(400), { notes: "n".repeat(900) }), item(0, 1, "   ")]);
    expect(plan.days[0].stops[0].title).toHaveLength(120);
    expect(plan.days[0].stops[0].note).toHaveLength(240);
    expect(plan.days[0].stops[1].title).toBe("A stop");
  });

  it("copes with a plan that has no stops, no cost and no destination", () => {
    const plan = toPlanPreview({ title: "", type: "custom", destination_city: null, destination_country: null, estimated_cost: null }, []);
    expect(plan).toMatchObject({ title: "A plan", city: null, dayCount: 0, stopCount: 0, estimatedCost: null, days: [], truncated: false });
  });
});
