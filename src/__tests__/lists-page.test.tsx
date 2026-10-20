import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The public page for a shared list: what it shows, what it does not, what it says to
// a link preview, and that it is private by default.

const h = vi.hoisted(() => ({ view: null as unknown, list: null as unknown }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/lists/view", () => ({ loadListView: async () => h.view }));
vi.mock("@/lib/lists/store", () => ({ getPublicList: async () => h.list }));

import SharedListPage, { generateMetadata } from "@/app/l/[token]/page";
import { LIST_CACHE_SECONDS } from "@/lib/config/lists";
import { brand } from "@/lib/config/brand";
import type { ListView } from "@/lib/lists/view";

const TOKEN = "T".repeat(22);
const props = { params: Promise.resolve({ token: TOKEN }) };
const html = async () => renderToStaticMarkup(await SharedListPage(props));

const item = (i: number, over: Record<string, unknown> = {}) => ({
  placeId: `ChIJ-fixture-${i}`,
  place: {
    status: "ok",
    place: {
      name: `Fixture Place ${i}`,
      address: `${i} S Broadway, Baltimore, MD`,
      category: "Cafe",
      photoRef: `AUacShh0Zp5aB7zQxH9kVQx_fixture_photo_reference_0${i}`,
      photoCredit: { name: `Jo ${i}`, url: `https://maps.google.com/maps/contrib/${i}` },
      ...over,
    },
  },
});

const view = (items: unknown[] = [item(1), item(2), item(3)]): ListView =>
  ({ token: TOKEN, title: "Close by", blurb: "The nearest good things, nearest first.", items }) as ListView;

beforeEach(() => {
  h.view = view();
  h.list = { title: "Close by", blurb: "The nearest good things, nearest first.", placeIds: ["a", "b", "c"] };
});

describe("a shared list", () => {
  it("shows the title, the line of copy, and every place in order with its number, type and address", async () => {
    const out = await html();
    expect(out).toContain("A list, shared with you");
    expect(out).toContain("Close by");
    expect(out).toContain("The nearest good things, nearest first.");
    const names = [...out.matchAll(/>Fixture Place (\d)</g)].map((m) => m[1]);
    expect(names).toEqual(["1", "2", "3"]);
    expect(out).toContain("Cafe · 2 S Broadway, Baltimore, MD");
  });

  it("shows photos through our own proxy, never straight from Google, with the photographer's credit", async () => {
    const out = await html();
    expect(out).toContain("/api/place-photo");
    expect(out).not.toMatch(/maps\.googleapis\.com|lh3\.googleusercontent/);
    expect(out).toContain('href="https://maps.google.com/maps/contrib/2"');
    expect(out).toContain("Powered by Google");
  });

  it("numbers the places that are shown, with no gap where one could not be loaded", async () => {
    h.view = view([item(1), { placeId: "ChIJ-gone-00001", place: { status: "not_found" } }, item(2), item(3)]);
    const out = await html();
    expect([...out.matchAll(/>(\d)<\/span><span class="min-w-0/g)].map((m) => m[1])).toEqual(["1", "2", "3"]);
    expect(out).not.toContain("ChIJ-gone-00001");
  });

  it("says so, plainly, when none of its places could be loaded", async () => {
    h.view = view([
      { placeId: "ChIJ-down-000001", place: { status: "unavailable" } },
      { placeId: "ChIJ-down-000002", place: { status: "unavailable" } },
      { placeId: "ChIJ-down-000003", place: { status: "unavailable" } },
    ]);
    const out = await html();
    expect(out).toContain("We could not load the places on this list just now.");
    expect(out).toContain("Close by");
  });

  it("carries where the visitor came from on the button, so signups can be traced", async () => {
    expect(await html()).toContain('href="/signup?src=share-list"');
  });

  it("shows no name, email, account or coordinates of the person who shared it", async () => {
    const out = await html();
    expect(out).not.toMatch(/Shared by|@[a-z]+\.[a-z]+|user_id|latitude|longitude/i);
  });

  it("is a 404 when there is no such list, turned off or never made", async () => {
    h.view = null;
    await expect(html()).rejects.toThrow("NOT_FOUND");
  });
});

describe("what a link preview sees", () => {
  it("is private by default: not indexed, with the list's own title and a plain description", async () => {
    const meta = await generateMetadata(props);
    expect(meta.title).toBe("Close by");
    expect(meta.description).toBe(`3 places to try, chosen with ${brand.name}.`);
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toContain(`/l/${TOKEN}`);
  });

  it("is 'not found' and unindexed for a list that does not exist", async () => {
    h.list = null;
    const meta = await generateMetadata(props);
    expect(meta.title).toBe("Link not found");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("draws its picture from our own words only: no Google data, so no Google call", () => {
    const image = readFileSync(join(__dirname, "../app/l/[token]/opengraph-image.tsx"), "utf-8");
    expect(image).not.toMatch(/place-preview|lists\/view|fetchPlacePreview|photoRef|photoProxyUrl/);
    expect(image).toMatch(/getPublicList/);
  });
});

describe("caching", () => {
  it("states the reuse time as a literal Next can read, equal to the configured one, on the page and its picture", () => {
    for (const file of ["../app/l/[token]/page.tsx", "../app/l/[token]/opengraph-image.tsx"]) {
      const source = readFileSync(join(__dirname, file), "utf-8");
      expect(source, file).toContain(`export const revalidate = ${LIST_CACHE_SECONDS};`);
    }
  });
});

describe("a list with dates, and our own lines", () => {
  it("shows the quiet end-date line under its copy", async () => {
    h.view = { ...view(), through: "Through Sunday", ended: false };
    const out = await html();
    expect(out).toContain("Through Sunday");
  });

  it("shows our own line under a place, in the quiet italic voice, and nothing where we wrote none", async () => {
    h.view = view([{ ...item(1), why: "Warm, with room to sit" }, { ...item(2), why: null }, item(3)]);
    const out = await html();
    expect(out).toContain("Warm, with room to sit");
    expect(out).toMatch(/font-reason[^>]*>Warm, with room to sit/);
    expect([...out.matchAll(/font-reason/g)].length).toBe(3 + 1); // the three numerals, plus the one line we wrote
  });

  it("says only that it has ended once its last day has passed: no places, no Google credit, and the title still names it", async () => {
    h.view = { ...view([]), ended: true, through: null };
    const out = await html();
    expect(out).toContain("This list has ended.");
    expect(out).toContain("Close by");
    expect(out).not.toContain("We could not load the places");
    expect(out).not.toContain("Powered by Google");
    expect(out).toContain('href="/signup?src=share-list"'); // an ended list still leads somewhere
  });

  it("tells a link preview it has ended, and is not found at all before it opens", async () => {
    h.list = { title: "Close by", blurb: null, placeIds: ["a", "b", "c"], whys: [null, null, null], startsOn: "2020-01-01", endsOn: "2020-01-31", house: true };
    expect((await generateMetadata(props)).description).toBe("This list has ended.");
    h.list = { title: "Close by", blurb: null, placeIds: ["a", "b", "c"], whys: [null, null, null], startsOn: "2999-01-01", endsOn: "2999-01-31", house: true };
    const upcoming = await generateMetadata(props);
    expect(upcoming.title).toBe("Link not found");
    expect(upcoming.robots).toEqual({ index: false, follow: false });
  });
});
