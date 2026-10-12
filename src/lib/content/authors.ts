import { brand } from "@/lib/config/brand";
import { organizationRef } from "@/lib/seo";

/**
 * A real person who writes for the blog. Everything here is published
 * publicly (the author page, the byline, Article/Person JSON-LD), so every
 * field must be true -- never an invented persona, never a profile this
 * person doesn't actually run.
 */
export interface Author {
  /** URL slug: the author page lives at /author/<slug>. */
  slug: string;
  name: string;
  /** e.g. "Founder". What this person actually does at Zolo. */
  jobTitle: string;
  /** Bio paragraphs, first person or third, plain and specific. */
  bio: string[];
  /** Optional short bullets of relevant experience (what they've built or done, and for how long). */
  experience?: string[];
  /** Profiles this person really runs (LinkedIn, GitHub, X, ...). Full URLs. */
  sameAs: string[];
}

/**
 * Intentionally empty. The heycatch SEO audit (a_author_schema, a_author_page)
 * wants each article tied to a named Person with an author page and `sameAs`
 * profiles -- but that has to be a real person, and only the site's owner can
 * say who that is and which of their profiles to publish. Until an entry
 * exists here, articles are credited to the organization (honest, and what
 * they were before), /author/* 404s, and the sitemap omits it.
 *
 * To turn it all on: add one Author below, then set `authorSlug: "<slug>"` on
 * the posts they wrote in blog-posts.ts. The byline, /author/<slug> page,
 * sitemap entry, and Person JSON-LD (with `url` + `sameAs`) all follow.
 */
export const AUTHORS: Author[] = [];

export function getAuthor(slug: string | undefined): Author | undefined {
  return slug ? AUTHORS.find((a) => a.slug === slug) : undefined;
}

export function authorUrl(author: Author): string {
  return `${brand.domain}/author/${author.slug}`;
}

/** schema.org Person node: `url` is the on-site author page, `sameAs` the author's own profiles. */
export function personJsonLd(author: Author) {
  return {
    "@type": "Person" as const,
    "@id": `${authorUrl(author)}#person`,
    name: author.name,
    jobTitle: author.jobTitle,
    url: authorUrl(author),
    ...(author.sameAs.length > 0 ? { sameAs: author.sameAs } : {}),
    worksFor: organizationRef(),
  };
}

/** The `author` value for an article: the named Person when one is configured, otherwise the organization. */
export function articleAuthorJsonLd(authorSlug: string | undefined) {
  const author = getAuthor(authorSlug);
  return author ? personJsonLd(author) : organizationRef();
}
