import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { brand } from "@/lib/config/brand";
import { INDEXNOW_KEY } from "@/lib/config/indexnow";
import { PAGE_SEO, travelPageSeo } from "@/lib/content/page-seo";
import { VS_PAGES } from "@/lib/content/vs-pages";
import { BLOG_POSTS } from "@/lib/content/blog-posts";
import { articleAuthorJsonLd, personJsonLd, type Author } from "@/lib/content/authors";
import { getTravelProvider } from "@/services/providers";
import sitemap from "@/app/sitemap";

// The heycatch SEO audit scores titles at 30-60 characters AS RENDERED and
// meta descriptions at 110-160. These tests fail the build when a new page,
// post, or destination breaks the range, instead of letting it ship and
// showing up in the next audit.
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 110;
const DESC_MAX = 160;
// The root layout appends " · Zolo" to any title that isn't `absolute`.
const SUFFIX = ` · ${brand.name}`;

function expectTitle(label: string, rendered: string) {
  expect(rendered.length, `${label} title "${rendered}" is ${rendered.length} chars`).toBeGreaterThanOrEqual(TITLE_MIN);
  expect(rendered.length, `${label} title "${rendered}" is ${rendered.length} chars`).toBeLessThanOrEqual(TITLE_MAX);
}

function expectDescription(label: string, description: string) {
  expect(description.length, `${label} description is ${description.length} chars`).toBeGreaterThanOrEqual(DESC_MIN);
  expect(description.length, `${label} description is ${description.length} chars`).toBeLessThanOrEqual(DESC_MAX);
}

describe("static page metadata", () => {
  for (const [name, seo] of Object.entries(PAGE_SEO)) {
    it(`${name}: rendered title 30-60 chars, description 110-160`, () => {
      expectTitle(name, seo.title);
      expectDescription(name, seo.description);
    });
  }
});

describe("comparison page metadata", () => {
  for (const page of VS_PAGES) {
    it(`${page.slug}: title and description are in range`, () => {
      expectTitle(page.slug, page.seoTitle);
      expectDescription(page.slug, page.seoDescription);
    });
  }
});

describe("travel guide metadata", () => {
  it("every destination gets an in-range title and description", async () => {
    const destinations = await getTravelProvider().listDestinations();
    expect(destinations.length).toBeGreaterThan(0);
    for (const dest of destinations) {
      const seo = travelPageSeo(dest);
      expectTitle(dest.slug, `${seo.title}${SUFFIX}`);
      expectDescription(dest.slug, seo.description);
    }
  });
});

describe("blog posts", () => {
  for (const post of BLOG_POSTS) {
    it(`${post.slug}: metadata in range`, () => {
      expectTitle(post.slug, `${post.seoTitle ?? post.title}${SUFFIX}`);
      expectDescription(post.slug, post.description);
    });

    it(`${post.slug}: cites at least two distinct, independent primary sources`, () => {
      const sources = post.sources ?? [];
      expect(sources.length).toBeGreaterThanOrEqual(2);
      const urls = sources.map((s) => s.url);
      expect(new Set(urls).size, "duplicate source URL").toBe(urls.length);
      const hosts = new Set(urls.map((u) => new URL(u).host));
      expect(hosts.size, "sources should come from at least two different publishers").toBeGreaterThanOrEqual(2);
      for (const s of sources) {
        expect(s.url.startsWith("https://"), `${s.url} should be https`).toBe(true);
        expect(new URL(s.url).host, `${s.url} is a self-link, not an independent source`).not.toContain("discoverzolo");
        expect(s.note.length).toBeGreaterThan(20);
      }
    });

    it(`${post.slug}: every external link in the body is also listed under Sources`, () => {
      const sourceUrls = new Set((post.sources ?? []).map((s) => s.url));
      const body = [
        ...post.sections.flatMap((s) => [...s.paragraphs, ...(s.list ?? [])]),
        ...(post.faq ?? []).map((f) => f.a),
      ].join("\n");
      const external = [...body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
      for (const url of external) {
        expect(sourceUrls.has(url), `${url} is cited inline but missing from the Sources list`).toBe(true);
      }
    });
  }

  it("fall-date-ideas: no paragraph or answer opens with a bare pronoun (audit g_self_contained)", () => {
    const post = BLOG_POSTS.find((p) => p.slug === "fall-date-ideas-cozy-adventurous-budget-friendly");
    expect(post).toBeDefined();
    const openers = [
      ...post!.sections.flatMap((s) => s.paragraphs),
      ...(post!.faq ?? []).map((f) => f.a),
    ].map((text) => text.trim().split(/[\s,]+/)[0].toLowerCase().replace(/['’].*$/, ""));
    const banned = new Set(["this", "these", "that", "those", "it", "they", "such"]);
    for (const first of openers) expect(banned.has(first), `paragraph opens with "${first}"`).toBe(false);
  });
});

describe("author structured data", () => {
  it("credits the organization while no author is configured", () => {
    expect(articleAuthorJsonLd(undefined)["@type"]).toBe("Organization");
  });

  it("describes a configured author as a Person with an on-site url and sameAs profiles", () => {
    const author: Author = {
      slug: "example-author",
      name: "Example Author",
      jobTitle: "Founder",
      bio: ["Bio."],
      sameAs: ["https://www.linkedin.com/in/example", "https://github.com/example"],
    };
    const person = personJsonLd(author);
    expect(person["@type"]).toBe("Person");
    expect(person.url).toBe(`${brand.domain}/author/example-author`);
    expect(person.sameAs).toEqual(author.sameAs);
  });
});

describe("sitemap", () => {
  it("gives every URL a valid lastModified that is not in the future", async () => {
    const entries = await sitemap();
    const today = new Date().toISOString().slice(0, 10);
    expect(entries.length).toBeGreaterThan(20);
    for (const entry of entries) {
      expect(entry.lastModified, `${entry.url} is missing lastModified`).toBeTruthy();
      const date = String(entry.lastModified).slice(0, 10);
      expect(Number.isNaN(Date.parse(date)), `${entry.url} has an invalid lastModified ${date}`).toBe(false);
      expect(date <= today, `${entry.url} lastModified ${date} is in the future`).toBe(true);
    }
  });
});

describe("IndexNow", () => {
  it("hosts the key file at the site root with the key as its contents", () => {
    const file = join(process.cwd(), "public", `${INDEXNOW_KEY}.txt`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8").trim()).toBe(INDEXNOW_KEY);
  });
});
