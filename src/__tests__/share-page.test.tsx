import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The public page: what it shows for a place and a plan, what it does not, what it
// says to a link preview, and that it is private by default.

const h = vi.hoisted(() => ({ view: null as unknown }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/share/view", () => ({ loadShareView: async () => h.view }));

import SharePage, { generateMetadata } from "@/app/s/[token]/page";
import { SHARE_CACHE_SECONDS } from "@/lib/config/share";
import type { ShareView } from "@/lib/share/view";

const TOKEN = "T".repeat(22);
const props = { params: Promise.resolve({ token: TOKEN }) };
const html = async () => renderToStaticMarkup(await SharePage(props));

const placeView = (over: Record<string, unknown> = {}, place: Record<string, unknown> = {}): ShareView =>
  ({
    kind: "place",
    token: TOKEN,
    note: null,
    sharerName: null,
    place: {
      status: "ok",
      place: {
        name: "Fells Point Roasters",
        address: "1 S Broadway, Baltimore, MD 21231, USA",
        category: "Cafe",
        photoRef: "AUacShh0Zp5aB7zQxH9kVQx_fixture_photo_reference_01",
        photoCredit: { name: "Jo", url: "https://maps.google.com/maps/contrib/77" },
        ...place,
      },
    },
    ...over,
  }) as ShareView;

const planView = (over: Record<string, unknown> = {}): ShareView =>
  ({
    kind: "plan",
    token: TOKEN,
    note: null,
    sharerName: null,
    plan: {
      title: "A weekend in Lisbon",
      type: "travel",
      city: "Lisbon",
      country: "Portugal",
      dayCount: 2,
      stopCount: 3,
      estimatedCost: 245.5,
      truncated: false,
      days: [
        { label: "Day 1", stops: [{ time: "09:00", title: "Coffee at A Brasileira", note: "Go before the crowds." }, { time: "11:00", title: "Tram 28", note: null }] },
        { label: "Day 2", stops: [{ time: "10:00", title: "Belem Tower", note: null }] },
      ],
    },
    ...over,
  }) as ShareView;

beforeEach(() => {
  h.view = placeView();
});

describe("a shared place", () => {
  it("shows its name, type and address, and the photo through our own proxy", async () => {
    const out = await html();
    expect(out).toContain("Fells Point Roasters");
    expect(out).toContain("Cafe · 1 S Broadway, Baltimore, MD 21231, USA");
    expect(out).toContain('src="/api/place-photo?ref=AUacShh0Zp5aB7zQxH9kVQx_fixture_photo_reference_01&amp;w=1200"');
    expect(out).not.toContain("maps.googleapis.com"); // never straight from Google, never with a key
  });

  it("gives Google its due: 'Powered by Google' and the photo's author, linked safely", async () => {
    const out = await html();
    expect(out).toContain("Powered by Google");
    expect(out).toContain("Photo:");
    expect(out).toContain('href="https://maps.google.com/maps/contrib/77"');
    expect(out).toMatch(/rel="noopener noreferrer nofollow"/);
  });

  it("shows the sharer's note in quotes, and their name only when it is given", async () => {
    h.view = placeView({ note: "Get the plum tart" });
    let out = await html();
    expect(out).toContain("“Get the plum tart”");
    expect(out).not.toContain("<figcaption");

    h.view = placeView({ note: "Get the plum tart", sharerName: "Maya" });
    out = await html();
    expect(out).toContain("<figcaption");
    expect(out).toContain("Maya");
  });

  it("without a note or a name, there is no byline at all: nobody is named by default", async () => {
    const out = await html();
    expect(out).not.toMatch(/Shared by|<figure|<blockquote/);
  });

  it("escapes what a sharer typed, so a note cannot inject markup", async () => {
    h.view = placeView({ note: "<img src=x onerror=alert(1)>", sharerName: "<b>Eve</b>" });
    const out = await html();
    expect(out).not.toContain("<img src=x");
    expect(out).not.toContain("<b>Eve</b>");
    expect(out).toContain("&lt;img src=x");
  });

  it("when Google cannot be reached, still shows the page, the note and the way in, and says so plainly", async () => {
    h.view = { kind: "place", token: TOKEN, note: "Worth the walk", sharerName: null, place: { status: "unavailable" } };
    const out = await html();
    expect(out).toContain("A place shared with you");
    expect(out).toContain("We could not load the details for this place just now.");
    expect(out).toContain("“Worth the walk”");
    expect(out).toContain("Plan your own with Zolo");
  });

  it("says so when Google no longer lists the place", async () => {
    h.view = { kind: "place", token: TOKEN, note: null, sharerName: null, place: { status: "not_found" } };
    expect(await html()).toContain("This place is no longer listed.");
  });
});

describe("a shared plan", () => {
  beforeEach(() => {
    h.view = planView();
  });

  it("shows its title, size, destination, and each day's stops in order", async () => {
    const out = await html();
    expect(out).toContain("A weekend in Lisbon");
    expect(out).toContain("3 stops over 2 days in Lisbon");
    expect(out.indexOf("Day 1")).toBeLessThan(out.indexOf("Day 2"));
    expect(out.indexOf("Coffee at A Brasileira")).toBeLessThan(out.indexOf("Tram 28"));
    expect(out).toContain("Go before the crowds.");
    expect(out).toContain("Estimated cost about $246");
  });

  it("shows no photos, dates or coordinates, and still credits Google for the place names", async () => {
    const out = await html();
    expect(out).not.toMatch(/<img/);
    expect(out).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
    expect(out).toContain("Powered by Google");
  });

  it("says when a long plan is cut short", async () => {
    const plan = (planView() as Extract<ShareView, { kind: "plan" }>).plan;
    h.view = planView({ plan: { ...plan, truncated: true } });
    expect(await html()).toContain("Showing the first stops of a longer plan.");
  });
});

describe("Google's credit", () => {
  it("is printed on the page itself, so the floating site-wide badge can step aside rather than sit on the main button", async () => {
    expect(await html()).toContain("data-own-google-attribution");
    const css = readFileSync(join(__dirname, "../app/globals.css"), "utf-8");
    expect(css).toMatch(/body:has\(\[data-own-google-attribution\]\) \[data-google-attribution\]\s*\{\s*display: none;/);
    const badge = readFileSync(join(__dirname, "../components/shared/google-attribution.tsx"), "utf-8");
    expect(badge).toContain("data-google-attribution");
  });
});

describe("the way in", () => {
  it("is 'Plan your own with Zolo', and carries where the visitor came from", async () => {
    expect(await html()).toContain('href="/signup?src=share-place"');
    h.view = planView();
    expect(await html()).toContain('href="/signup?src=share-plan"');
    expect(await html()).toContain("Plan your own with Zolo");
  });

  it("is a source label the attribution cookie accepts", async () => {
    const { sanitizeSrc } = await import("@/lib/attribution");
    expect(sanitizeSrc("share-place")).toBe("share-place");
    expect(sanitizeSrc("share-plan")).toBe("share-plan");
  });
});

describe("a link that is off, or never was", () => {
  it("is a not-found, the same for both", async () => {
    h.view = null;
    await expect(html()).rejects.toThrow("NOT_FOUND");
  });

  it("says nothing in its metadata either, and is not indexed", async () => {
    h.view = null;
    expect(await generateMetadata(props)).toEqual({ title: "Link not found", robots: { index: false, follow: false } });
  });
});

describe("what a link preview is told", () => {
  it("is the place's name and a line about it, with its own card, not the site-wide one", async () => {
    const meta = await generateMetadata(props);
    expect(meta.title).toBe("Fells Point Roasters");
    expect(meta.description).toBe("Cafe. Shared on Zolo.");
    expect(meta.openGraph).toMatchObject({ title: "Fells Point Roasters", type: "website", siteName: "Zolo", url: `https://discoverzolo.com/s/${TOKEN}` });
    expect(meta.twitter).toEqual({ card: "summary_large_image", title: "Fells Point Roasters", description: "Cafe. Shared on Zolo." });
    expect(meta.alternates).toEqual({ canonical: `https://discoverzolo.com/s/${TOKEN}` });
  });

  it("leads with the sharer's note when there is one, and names them only if they opted in", async () => {
    h.view = placeView({ note: "Get the plum tart", sharerName: "Maya" });
    expect((await generateMetadata(props)).description).toBe("“Get the plum tart”");
    h.view = placeView({ sharerName: "Maya" });
    expect((await generateMetadata(props)).description).toBe("Cafe. Shared by Maya on Zolo.");
  });

  it("describes a plan by its size, never by dates", async () => {
    h.view = planView();
    const meta = await generateMetadata(props);
    expect(meta.title).toBe("A weekend in Lisbon");
    expect(meta.description).toBe("3 stops over 2 days in Lisbon. Shared on Zolo.");
  });

  it("is never indexed, and its links are not followed", async () => {
    expect((await generateMetadata(props)).robots).toEqual({ index: false, follow: false });
  });

  it("keeps to the brand voice: no exclamation points, no emoji, in the page or the preview text", async () => {
    for (const view of [placeView({ note: "Get the plum tart", sharerName: "Maya" }), planView()]) {
      h.view = view;
      const text = [(await html()).replace(/<[^>]+>/g, " "), JSON.stringify(await generateMetadata(props))].join(" ");
      expect(text).not.toContain("!");
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("the page's cache time", () => {
  const source = (path: string) => readFileSync(join(__dirname, "..", path), "utf-8");

  it("is the literal Next needs, and equals the configured number, on the page and on its preview image", () => {
    for (const file of ["app/s/[token]/page.tsx", "app/s/[token]/opengraph-image.tsx"]) {
      expect(source(file), file).toContain(`export const revalidate = ${SHARE_CACHE_SECONDS};`);
    }
  });

  it("is rendered on demand and reused, never at build time for guessed tokens", () => {
    const page = source("app/s/[token]/page.tsx");
    expect(page).toMatch(/export const dynamicParams = true;/);
    expect(page).toMatch(/export function generateStaticParams\(\) \{\s*return \[\];\s*\}/);
  });
});
