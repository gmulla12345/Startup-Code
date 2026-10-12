import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GooglePlacesExperienceProvider } from "@/services/providers/google-places-experience-provider";
import {
  PHOTO_PROXY_PATH,
  clampPhotoWidth,
  legacyPhotoToProxy,
  photoProxyUrl,
} from "@/lib/google/photo-url";
import { withMaxWidth } from "@/lib/utils/format";
import type { ExperienceCategory } from "@/types/database";

// Guards against the ways Google Maps Platform money leaks: the API key
// shipping to clients inside photo URLs, public routes that fan out billed
// calls for arbitrary input, and cache keys no two users ever share. Each test
// is a regression pin for a specific change -- see CLAUDE.md "Google Maps
// cost controls".

const SECRET = "AIzaSyTEST-SECRET-KEY-0000000000000000";
const REF = "AUacShhExampleRef_123-abcdefghijklmnopqrstuvwxyz";

function nearbyBody() {
  return {
    status: "OK",
    results: [
      {
        place_id: "p1",
        name: "Test Cafe",
        vicinity: "1 Main St, Testville",
        geometry: { location: { lat: 40.7, lng: -74 } },
        rating: 4.6,
        user_ratings_total: 120,
        types: ["cafe", "food", "establishment"],
        photos: [{ photo_reference: REF }],
        opening_hours: { open_now: true },
      },
    ],
  };
}

describe("photo proxy URLs", () => {
  it("never contain the API key or point at maps.googleapis.com", () => {
    const url = photoProxyUrl(REF, 1200, "https://discoverzolo.com");
    expect(url).toBe(`https://discoverzolo.com${PHOTO_PROXY_PATH}?ref=${REF}&w=1200`);
    expect(url).not.toMatch(/key=|AIza|maps\.googleapis/);
  });

  it("round widths up to a cacheable 100px step within sane bounds", () => {
    expect(clampPhotoWidth(64)).toBe(100);
    expect(clampPhotoWidth(500)).toBe(500);
    expect(clampPhotoWidth(501)).toBe(600);
    expect(clampPhotoWidth(99999)).toBe(1600);
    expect(clampPhotoWidth(Number.NaN)).toBe(800);
  });

  it("rewrites stored legacy key-bearing URLs and drops the key", () => {
    const legacy = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${REF}&key=${SECRET}`;
    const rewritten = legacyPhotoToProxy(legacy, "https://discoverzolo.com");
    expect(rewritten).toBe(`https://discoverzolo.com${PHOTO_PROXY_PATH}?ref=${REF}&w=800`);
    expect(rewritten).not.toContain(SECRET);
  });

  it("drops an unparseable legacy URL instead of returning the key", () => {
    const bad = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&key=${SECRET}`;
    expect(legacyPhotoToProxy(bad)).toBe("");
  });

  it("leaves non-Google and already-proxied URLs alone", () => {
    const unsplash = "https://images.unsplash.com/photo-1?w=800";
    const proxied = photoProxyUrl(REF, 800);
    expect(legacyPhotoToProxy(unsplash)).toBe(unsplash);
    expect(legacyPhotoToProxy(proxied)).toBe(proxied);
  });

  it("lets withMaxWidth resize a proxied photo", () => {
    expect(withMaxWidth(photoProxyUrl(REF, 1200), 500)).toContain("w=500");
    expect(withMaxWidth("https://images.unsplash.com/x", 500)).toBe("https://images.unsplash.com/x");
  });
});

describe("GooglePlacesExperienceProvider cost guards", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(nearbyBody()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const calledUrls = () => fetchMock.mock.calls.map((c) => String(c[0]));

  it("never hands the API key to a caller inside an experience", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    const results = await provider.list({ latitude: 40.7128, longitude: -74.006, radiusMiles: 15 });
    expect(results.length).toBeGreaterThan(0);
    const images = results.flatMap((e) => e.images);
    expect(images.length).toBeGreaterThan(0);
    expect(JSON.stringify(results)).not.toContain(SECRET);
    for (const image of images) expect(image).toContain(PHOTO_PROXY_PATH);
  });

  it("lets neighbouring users share the same upstream request", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    // 11 and 12 miles (17.7km / 19.3km) both round up into the 20km bucket.
    await provider.list({ latitude: 40.71283, longitude: -74.00601, radiusMiles: 11 });
    const first = calledUrls();
    fetchMock.mockClear();
    await provider.list({ latitude: 40.71347, longitude: -74.00552, radiusMiles: 12 });
    expect(calledUrls()).toEqual(first);
    expect(first.every((u) => u.includes("location=40.71%2C-74.01"))).toBe(true);
  });

  it("buckets the radius up, never down, and caps it at Google's 50km max", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    await provider.list({ latitude: 40, longitude: -74, radiusMiles: 5, category: "food_drink" });
    expect(calledUrls()[0]).toContain("radius=10000"); // 8,045m asked -> 10,000m
    fetchMock.mockClear();
    await provider.list({ latitude: 40, longitude: -74, radiusMiles: 200, category: "food_drink" });
    expect(calledUrls()[0]).toContain("radius=50000");
  });

  it("sends no billed request for a category with no Places type", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    const results = await provider.list({
      latitude: 40,
      longitude: -74,
      category: "bogus" as ExperienceCategory,
    });
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends no billed request for out-of-range or non-finite coordinates", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    for (const [latitude, longitude] of [
      [91, 0],
      [0, 181],
      [Number.NaN, 10],
    ]) {
      expect(await provider.list({ latitude, longitude })).toEqual([]);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps the keyword length", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    await provider.list({ latitude: 40, longitude: -74, category: "food_drink", search: "x".repeat(500) });
    const keyword = new URL(calledUrls()[0]).searchParams.get("keyword");
    expect(keyword).toHaveLength(80);
  });

  it("caches for an hour by default and keeps open-now", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    const results = await provider.list({ latitude: 40, longitude: -74, category: "food_drink" });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ next: { revalidate: 3600 } });
    expect(results[0].isOpenNow).toBe(true);
  });

  it("caches fixed-city lists for the requested window and drops stale open-now", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    const results = await provider.list({
      latitude: 40,
      longitude: -74,
      category: "food_drink",
      cacheSeconds: 86400,
    });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ next: { revalidate: 86400 } });
    expect(results[0].isOpenNow).toBeNull();
    expect(results[0].availability).toBeNull();
  });

  it("fans out to 7 Nearby Search calls with no category, 1 with one", async () => {
    const provider = new GooglePlacesExperienceProvider(SECRET);
    await provider.list({ latitude: 40, longitude: -74 });
    expect(fetchMock).toHaveBeenCalledTimes(7);
    fetchMock.mockClear();
    await provider.list({ latitude: 40, longitude: -74, category: "food_drink" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/place-photo", () => {
  const fetchMock = vi.fn();
  const originalKey = process.env.MAPS_API_KEY;
  let ipCounter = 0;

  async function get(query: string, ip = `10.0.0.${++ipCounter}`) {
    const { GET } = await import("@/app/api/place-photo/route");
    return GET(new Request(`http://localhost/api/place-photo?${query}`, { headers: { "x-forwarded-for": ip } }));
  }

  beforeEach(() => {
    process.env.MAPS_API_KEY = SECRET;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.MAPS_API_KEY;
    else process.env.MAPS_API_KEY = originalKey;
  });

  it("rejects a malformed reference without calling Google", async () => {
    for (const ref of ["", "short", "has spaces in it!!", "../../etc/passwd", "a".repeat(3000)]) {
      const res = await get(`ref=${encodeURIComponent(ref)}`);
      expect(res.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when no key is configured", async () => {
    delete process.env.MAPS_API_KEY;
    const res = await get(`ref=${REF}`);
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects to Google's image host with cache headers and a clamped width", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "https://lh3.googleusercontent.com/places/abc=s1200" } })
    );
    const res = await get(`ref=${REF}&w=777`);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://lh3.googleusercontent.com/places/abc=s1200");
    expect(res.headers.get("cache-control")).toContain("s-maxage=21600");

    const [upstreamUrl, init] = fetchMock.mock.calls[0];
    const upstream = new URL(String(upstreamUrl));
    expect(upstream.searchParams.get("maxwidth")).toBe("800");
    expect(upstream.searchParams.get("photo_reference")).toBe(REF);
    expect(upstream.searchParams.get("key")).toBe(SECRET);
    expect(init).toMatchObject({ redirect: "manual" });
    // The key is used upstream but must not appear anywhere in what we return.
    expect(JSON.stringify([...res.headers.entries()])).not.toContain(SECRET);
  });

  it("refuses to redirect anywhere but Google's image host", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://evil.example/x.jpg" } }));
    const res = await get(`ref=${REF}`);
    expect(res.status).toBe(502);
    expect(res.headers.get("location")).toBeNull();
  });

  it("caches an upstream failure briefly so an outage isn't retried on every view", async () => {
    fetchMock.mockResolvedValue(new Response("denied", { status: 403 }));
    const res = await get(`ref=${REF}`);
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
  });

  it("rate-limits one IP", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://lh3.googleusercontent.com/p" } }));
    let last = 0;
    for (let i = 0; i < 301; i++) last = (await get(`ref=${REF}`, "203.0.113.9")).status;
    expect(last).toBe(429);
  });
});

describe("GET /api/experiences", () => {
  const list = vi.fn();
  let ipCounter = 0;

  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue([]);
    vi.resetModules();
    vi.doMock("@/services/providers", () => ({ getExperienceProvider: async () => ({ list }) }));
  });
  afterEach(() => vi.doUnmock("@/services/providers"));

  async function get(query: string, ip = `198.51.100.${++ipCounter}`) {
    const { GET } = await import("@/app/api/experiences/route");
    return GET(new Request(`http://localhost/api/experiences?${query}`, { headers: { "x-forwarded-for": ip } }));
  }

  it("drops an unknown category and non-numeric coordinates before they reach Google", async () => {
    await get("category=bogus&lat=abc&lng=&radius=NaN");
    expect(list.mock.calls[0][0]).toMatchObject({
      category: undefined,
      latitude: undefined,
      longitude: undefined,
      radiusMiles: undefined,
      limit: 60,
    });
  });

  it("clamps limit, radius, and search length", async () => {
    await get(`lat=40&lng=-74&radius=999&limit=99999&search=${"y".repeat(500)}`);
    const q = list.mock.calls[0][0];
    expect(q.radiusMiles).toBe(50);
    expect(q.limit).toBe(120);
    expect(q.search).toHaveLength(80);
  });

  it("passes a valid category through", async () => {
    await get("category=food_drink&lat=40&lng=-74");
    expect(list.mock.calls[0][0].category).toBe("food_drink");
  });

  it("rate-limits one IP", async () => {
    let last = 0;
    for (let i = 0; i < 91; i++) last = (await get("lat=40&lng=-74", "192.0.2.77")).status;
    expect(last).toBe(429);
  });
});

describe("GET /api/experiences/[id]", () => {
  const getById = vi.fn();
  const getBySlug = vi.fn();
  const getRelated = vi.fn();

  beforeEach(() => {
    getById.mockReset();
    getBySlug.mockReset();
    getRelated.mockReset().mockResolvedValue([]);
    vi.resetModules();
    vi.doMock("@/services/providers", () => ({
      getExperienceProvider: async () => ({ getById, getBySlug, getRelated }),
    }));
  });
  afterEach(() => vi.doUnmock("@/services/providers"));

  async function get(id: string, ip: string) {
    const { GET } = await import("@/app/api/experiences/[id]/route");
    return GET(new Request(`http://localhost/api/experiences/${id}`, { headers: { "x-forwarded-for": ip } }), {
      params: Promise.resolve({ id }),
    });
  }

  it("looks a missing Google place up once, not twice (each is a billed Details call)", async () => {
    getById.mockResolvedValue(null);
    const res = await get("g-ChIJmissing", "198.18.0.1");
    expect(res.status).toBe(404);
    expect(getById).toHaveBeenCalledTimes(1);
    expect(getBySlug).not.toHaveBeenCalled();
  });

  it("still tries slug then id for curated catalog ids", async () => {
    getBySlug.mockResolvedValue(null);
    getById.mockResolvedValue(null);
    const res = await get("some-curated-slug", "198.18.0.2");
    expect(res.status).toBe(404);
    expect(getBySlug).toHaveBeenCalledTimes(1);
    expect(getById).toHaveBeenCalledTimes(1);
  });
});
