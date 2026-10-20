import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The lists as Home draws them, and the navigation now that lists come first.

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/analytics/track", () => ({ track: vi.fn() }));

import { ListSection } from "@/components/lists/list-section";
import { nav } from "@/lib/config/brand";
import type { HomeList } from "@/lib/lists/build";
import type { Experience } from "@/types/database";

const exp = (n: number): Experience =>
  ({
    id: `g-ChIJfixture${n}0000000`,
    slug: `g-place-${n}`,
    title: `Place ${n}`,
    category: "food_drink",
    tags: [],
    images: [],
    city: "Testville",
    priceLevel: "low",
    priceEstimate: null,
    isHiddenGem: false,
  }) as unknown as Experience;

const list = (over: Partial<HomeList> = {}): HomeList => ({
  key: "for-you",
  template: "for-you",
  title: "Chosen for you",
  blurb: "Drawn from what you told us you like.",
  places: [1, 2, 3].map((n) => ({ experience: exp(n), matchScore: 80 - n, distanceMiles: n / 2, why: n === 2 ? null : `Why ${n}` })),
  shareIds: ["ChIJ-aaaaaaaa", "ChIJ-bbbbbbbb", "ChIJ-cccccccc"],
  ...over,
});

describe("a list on Home", () => {
  it("shows its title, its line of copy and each place, each opening the place", () => {
    const out = renderToStaticMarkup(<ListSection list={list()} />);
    expect(out).toContain("Chosen for you");
    expect(out).toContain("Drawn from what you told us you like.");
    for (const n of [1, 2, 3]) {
      expect(out).toContain(`Place ${n}`);
      expect(out).toContain(`href="/experience/g-place-${n}"`);
    }
  });

  it("shows why a place is there only when there is a reason, and each place has a save heart", () => {
    const out = renderToStaticMarkup(<ListSection list={list()} />);
    expect(out).toContain("Why 1");
    expect(out).toContain("Why 3");
    expect(out).not.toContain("Why 2");
    expect([...out.matchAll(/aria-label="Save"/g)]).toHaveLength(3);
  });

  it("shows the match percentage only on the list made from the person's own tastes", () => {
    expect(renderToStaticMarkup(<ListSection list={list()} showMatch />)).toContain("79% match");
    expect(renderToStaticMarkup(<ListSection list={list()} />)).not.toContain("% match");
  });

  it("offers sharing only when the list can become a public link", () => {
    expect(renderToStaticMarkup(<ListSection list={list()} />)).toContain("Share the list Chosen for you");
    expect(renderToStaticMarkup(<ListSection list={list({ shareIds: [] })} />)).not.toContain("Share the list");
  });

  it("shows the distance the place is from the person when it is known", () => {
    expect(renderToStaticMarkup(<ListSection list={list()} />)).toContain("0.5 mi");
  });
});

describe("a list we wrote ourselves, on Home", () => {
  const house = (over: Partial<HomeList> = {}) => list({ key: "house-abc", template: "house", title: "Wet weather", blurb: "Somewhere dry.", through: "Through Sunday", shareIds: [], ...over });

  it("shows the quiet end-date line under its copy", () => {
    const out = renderToStaticMarkup(<ListSection list={house()} />);
    expect(out).toContain("Wet weather");
    expect(out).toContain("Through Sunday");
  });

  it("shows no end-date line when it has no end", () => {
    expect(renderToStaticMarkup(<ListSection list={house({ through: null })} />)).not.toContain("Through");
  });

  it("never offers to share it, even if it were handed place ids: it is already a page of its own", () => {
    expect(renderToStaticMarkup(<ListSection list={house({ shareIds: ["ChIJ-aaaaaaaa", "ChIJ-bbbbbbbb", "ChIJ-cccccccc"] })} />)).not.toContain("Share the list");
  });

  it("gives each list its own heading id, so two lists on a screen never share one", () => {
    const a = renderToStaticMarkup(<ListSection list={house({ key: "house-one" })} />);
    const b = renderToStaticMarkup(<ListSection list={house({ key: "house-two" })} />);
    expect(a).toContain('id="list-house-one"');
    expect(b).toContain('id="list-house-two"');
  });
});

describe("navigation, with lists first", () => {
  it("keeps Trips out of the main navigation and one step back, as a secondary link", () => {
    expect(nav.primary.map((i) => i.label)).toEqual(["Home", "Discover", "Map", "Saved", "Profile"]);
    expect(nav.secondary.map((i) => i.href)).toEqual(["/trips"]);
  });

  it("sizes the phone's bottom bar to the main navigation", () => {
    const bar = readFileSync(join(__dirname, "../components/layout/bottom-nav.tsx"), "utf-8");
    expect(bar).toContain(`grid-cols-${nav.primary.length}`);
  });

  it("still reaches Trips from the account menu and from the end of Home", () => {
    expect(readFileSync(join(__dirname, "../components/layout/user-menu.tsx"), "utf-8")).toContain('href="/trips"');
    expect(readFileSync(join(__dirname, "../app/(app)/home/page.tsx"), "utf-8")).toContain('href="/trips"');
  });
});
