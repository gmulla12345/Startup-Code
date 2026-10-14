import { brand } from "@/lib/config/brand";
import { pricing } from "@/lib/config/pricing";

/**
 * Title, description, and last-modified date for the static marketing pages,
 * in one place so page metadata, JSON-LD `dateModified`, and the sitemap's
 * `lastmod` can never disagree -- and so a test can enforce the length rules
 * the heycatch SEO audit scores (c_title, c_meta_description).
 *
 * `title` is the RENDERED title, used verbatim (`title: { absolute }`), 30-60
 * characters with the main query term up front. `description` is 110-160
 * characters. See src/__tests__/seo-metadata.test.ts.
 *
 * `lastModified` (YYYY-MM-DD) is the last date the page's content or what
 * search shows for it (title, description) really changed -- not the build
 * date. Bump it when you edit the page; sitemap.ts reads it.
 */
export interface PageSeo {
  path: string;
  title: string;
  description: string;
  lastModified: string;
}

export const PAGE_SEO = {
  pricing: {
    path: "/pricing",
    title: `Pricing — Free & Premium Plans · ${brand.name}`,
    description: `${brand.name} pricing: a free plan for personalized discovery, or Premium from $${pricing.premium.priceMonthly}/month or $${pricing.premium.priceAnnual}/year with AI trip planning. Cancel anytime.`,
    lastModified: "2026-10-12",
  },
  about: {
    path: "/about",
    title: `Why ${brand.name} Exists: Fixing Decision Fatigue`,
    description: `Why ${brand.name} exists: the story behind a personalized discovery platform built to fix decision fatigue, with a plain-language reason for every recommendation.`,
    lastModified: "2026-10-12",
  },
  contact: {
    path: "/contact",
    title: `Contact ${brand.name}: Support, Feedback, and Partnerships`,
    description: `Contact the ${brand.name} team with questions, feedback, bug reports, or partnership inquiries. Email ${brand.supportEmail} or use the contact form.`,
    lastModified: "2026-10-12",
  },
  careers: {
    path: "/careers",
    title: `Careers at ${brand.name}: Growth & Marketing Specialist Role`,
    description: `Open roles at ${brand.name} — join a small team building personalized discovery from the ground up, with direct access to the founding team.`,
    lastModified: "2026-10-12",
  },
  faq: {
    path: "/faq",
    title: `${brand.name} FAQ: Pricing, Personalization, and Travel Mode`,
    description: `Answers to common questions about how ${brand.name}'s personalized discovery works, what Premium costs, how your data is used, and how Travel Mode plans trips.`,
    lastModified: "2026-10-12",
  },
  students: {
    path: "/students",
    title: `${brand.name} for College Students: Things to Do Near Campus`,
    description: `${brand.name} for students: a short, personalized list of places and plans near your campus, chosen for you. Create an account with your school email.`,
    lastModified: "2026-10-14",
  },
  blog: {
    path: "/blog",
    title: `${brand.name} Blog: Things to Do and How Discovery Works`,
    description: `Guides, comparisons, and ideas on personalized discovery, travel, and finding things to do — from the team behind ${brand.name}.`,
    lastModified: "2026-10-12",
  },
} as const satisfies Record<string, PageSeo>;

/**
 * Last-modified dates for pages whose title/description are set elsewhere and
 * which this file therefore doesn't otherwise describe.
 */
export const OTHER_PAGE_LAST_MODIFIED = {
  home: "2026-09-23",
  privacy: "2026-09-15",
  terms: "2026-09-15",
  /** All /vs/* comparison pages share content-as-data in vs-pages.ts. */
  vsPages: "2026-10-12",
  /** All /travel/* guides share the destination catalog and one page template. */
  travelGuides: "2026-10-12",
} as const;

/**
 * Title and description for a Travel Mode destination guide. The layout
 * appends " · Zolo" to `title`, so `title` here is the page's own part: the
 * longest city in the catalog keeps the rendered title under 60 characters,
 * and the description is built (not copied from the destination blurb, which
 * varies from ~80 to ~170 characters) to land in 110-160 for every
 * city/country pair. The test in seo-metadata.test.ts checks every
 * destination, so a new one that breaks the range fails CI rather than
 * shipping.
 */
export function travelPageSeo(dest: { city: string; country: string }) {
  return {
    title: `${dest.city} Travel Guide: Things to Do`,
    description: `${dest.city} travel guide on ${brand.name}: personalized things to do, hidden gems, and an AI trip planner for ${dest.city}, ${dest.country}, matched to your interests and budget.`,
  };
}
